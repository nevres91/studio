"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type {
  Player,
  Match,
  PlayerMatchStats,
  GeneratedMatchup,
} from "@/lib/types"; // PlayerMatchStats
import { INITIAL_PLAYER_NAMES } from "@/lib/config";
import {
  generate2v3Matchups,
  calculateWinLossRatio,
  promiseWithTimeout,
} from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  writeBatch,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { PuckPalLogo } from "@/components/layout/PuckPalLogo";

interface PuckPalContextType {
  players: Player[];
  matches: Match[];
  addMatch: (
    date: Date,
    teamAPlayerIds: string[],
    teamAScore: number,
    teamBPlayerIds: string[],
    teamBScore: number,
    playerStats: PlayerMatchStats[]
  ) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
  getGeneratedMatchups: () => GeneratedMatchup[];
  getPlayerById: (id: string) => Player | undefined;
  isInitialized: boolean;
}

const PuckPalContext = createContext<PuckPalContextType | undefined>(undefined);

const FIRESTORE_TIMEOUT_MS = 15000;

export const PuckPalDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [internalFirebaseDataLoaded, setInternalFirebaseDataLoaded] =
    useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updatePlayerStatsInFirestore = useCallback(
    async (
      currentPlayers: Player[],
      allMatches: Match[]
    ): Promise<Player[]> => {
      console.log("[PuckPalDataProvider] updatePlayerStatsInFirestore: START");
      if (!db) {
        console.error(
          "[PuckPalDataProvider] Firestore 'db' instance is not available. Stats update aborted."
        );
        return currentPlayers;
      }

      const statsMap: Record<
        string,
        {
          totalGoals: number;
          totalAutoGoals: number;
          totalChecks: number;
          wins: number;
          losses: number;
          totalPoints: number;
          gamesPlayed: number;
          teamGoalsScored: number;
          teamGoalsConceded: number;
        }
      > = {};

      currentPlayers.forEach((p) => {
        statsMap[p.id] = {
          totalGoals: 0,
          totalAutoGoals: 0,
          totalChecks: 0,
          wins: 0,
          losses: 0,
          totalPoints: 0,
          gamesPlayed: 0,
          teamGoalsScored: 0,
          teamGoalsConceded: 0,
        };
      });

      allMatches.forEach((match) => {
        const allPlayerIdsInMatch = [
          ...match.teamA.playerIds,
          ...match.teamB.playerIds,
        ];

        allPlayerIdsInMatch.forEach((playerId) => {
          if (!statsMap[playerId]) {
            statsMap[playerId] = {
              totalGoals: 0,
              totalAutoGoals: 0,
              totalChecks: 0,
              wins: 0,
              losses: 0,
              totalPoints: 0,
              gamesPlayed: 0,
              teamGoalsScored: 0,
              teamGoalsConceded: 0,
            };
          }
          statsMap[playerId].gamesPlayed += 1;

          if (match.teamA.playerIds.includes(playerId)) {
            statsMap[playerId].teamGoalsScored += match.teamA.score;
            statsMap[playerId].teamGoalsConceded += match.teamB.score;
          } else if (match.teamB.playerIds.includes(playerId)) {
            statsMap[playerId].teamGoalsScored += match.teamB.score;
            statsMap[playerId].teamGoalsConceded += match.teamA.score;
          }
        });

        match.winningTeamIds.forEach((winnerId) => {
          if (statsMap[winnerId]) {
            statsMap[winnerId].wins += 1;
            statsMap[winnerId].totalPoints += 2; // 2 points for a win
          }
        });

        const losingTeamIds = allPlayerIdsInMatch.filter(
          (id) => !match.winningTeamIds.includes(id)
        );
        losingTeamIds.forEach((loserId) => {
          if (statsMap[loserId]) {
            statsMap[loserId].losses += 1;
            statsMap[loserId].totalPoints += 1; // 1 point for a loss
          }
        });

        (match.playerStats || []).forEach((ps) => {
          if (statsMap[ps.playerId]) {
            statsMap[ps.playerId].totalGoals += ps.goals;
            statsMap[ps.playerId].totalAutoGoals += ps.autoGoals || 0;
            statsMap[ps.playerId].totalChecks += ps.checks || 0;
          }
        });
      });

      const updatedPlayers = currentPlayers.map((p) => {
        const newStats = statsMap[p.id] || {
          totalGoals: 0,
          totalAutoGoals: 0,
          totalChecks: 0,
          wins: 0,
          losses: 0,
          totalPoints: 0,
          gamesPlayed: 0,
          teamGoalsScored: 0,
          teamGoalsConceded: 0,
        };
        const gamesPlayed = newStats.gamesPlayed;
        return {
          ...p,
          totalGoals: newStats.totalGoals,
          totalAutoGoals: newStats.totalAutoGoals,
          totalChecks: newStats.totalChecks,
          wins: newStats.wins,
          losses: newStats.losses,
          totalPoints: newStats.totalPoints,
          gamesPlayed: gamesPlayed,
          winLossRatio: calculateWinLossRatio(newStats.wins, gamesPlayed),
          teamGoalsScored: newStats.teamGoalsScored,
          teamGoalsConceded: newStats.teamGoalsConceded,
          teamGoalDifference:
            newStats.teamGoalsScored - newStats.teamGoalsConceded,
        };
      });

      const batch = writeBatch(db);
      updatedPlayers.forEach((player) => {
        const playerRef = doc(db, "players", player.id);
        const playerDataToCommit = {
          name: player.name,
          totalGoals: player.totalGoals || 0,
          totalAutoGoals: player.totalAutoGoals || 0,
          totalChecks: player.totalChecks || 0,
          wins: player.wins || 0,
          losses: player.losses || 0,
          totalPoints: player.totalPoints || 0,
          gamesPlayed: player.gamesPlayed || 0,
          winLossRatio: player.winLossRatio || 0,
          teamGoalsScored: player.teamGoalsScored || 0,
          teamGoalsConceded: player.teamGoalsConceded || 0,
          teamGoalDifference: player.teamGoalDifference || 0,
        };
        batch.set(playerRef, playerDataToCommit, { merge: true });
      });
      try {
        await promiseWithTimeout(
          batch.commit(),
          FIRESTORE_TIMEOUT_MS,
          new Error("Timeout committing player stats batch")
        );
        console.log(
          "[PuckPalDataProvider] updatePlayerStatsInFirestore: Batch commit successful."
        );
      } catch (e) {
        console.error(
          "[PuckPalDataProvider] updatePlayerStatsInFirestore: Batch commit FAILED:",
          e
        );
        throw e;
      }
      return updatedPlayers;
    },
    []
  );

  useEffect(() => {
    if (!isClient) {
      return;
    }

    console.log(
      "[PuckPalDataProvider] Client mounted. Starting Firebase data initialization..."
    );

    const initFirebaseData = async () => {
      console.log("[PuckPalDataProvider] initFirebaseData: START");
      if (!db) {
        console.error(
          "[PuckPalDataProvider] initFirebaseData: Firestore 'db' instance is not available. Aborting initialization."
        );
        setInternalFirebaseDataLoaded(true);
        return;
      }
      try {
        console.log(
          "[PuckPalDataProvider] initFirebaseData: Fetching players..."
        );
        const playersCollectionRef = collection(db, "players");
        const playersSnapshot = await promiseWithTimeout(
          getDocs(playersCollectionRef),
          FIRESTORE_TIMEOUT_MS,
          new Error("Timeout fetching players collection")
        );
        console.log(
          "[PuckPalDataProvider] initFirebaseData: Fetched players snapshot:",
          playersSnapshot.empty
            ? "empty"
            : `${playersSnapshot.docs.length} docs`
        );
        let currentPlayers: Player[] = playersSnapshot.docs.map((docData) => {
          const data = docData.data();
          return {
            id: docData.id,
            name: data.name,
            totalGoals: data.totalGoals || 0,
            totalAutoGoals: data.totalAutoGoals || 0,
            totalChecks: data.totalChecks || 0,
            wins: data.wins || 0,
            losses: data.losses || 0,
            totalPoints: data.totalPoints || 0,
            gamesPlayed: data.gamesPlayed || 0,
            winLossRatio: data.winLossRatio || 0,
            teamGoalsScored: data.teamGoalsScored || 0,
            teamGoalsConceded: data.teamGoalsConceded || 0,
            teamGoalDifference: data.teamGoalDifference || 0,
          } as Player;
        });

        if (currentPlayers.length === 0 && INITIAL_PLAYER_NAMES.length > 0) {
          console.log(
            "[PuckPalDataProvider] initFirebaseData: No players found, seeding initial players..."
          );
          const batch = writeBatch(db);
          const seededPlayers: Player[] = INITIAL_PLAYER_NAMES.map((name) => {
            const newPlayerRef = doc(collection(db, "players"));
            const newPlayerData: Player = {
              id: newPlayerRef.id,
              name,
              totalGoals: 0,
              totalAutoGoals: 0,
              totalChecks: 0,
              wins: 0,
              losses: 0,
              totalPoints: 0,
              gamesPlayed: 0,
              winLossRatio: 0,
              teamGoalsScored: 0,
              teamGoalsConceded: 0,
              teamGoalDifference: 0,
            };
            batch.set(newPlayerRef, newPlayerData);
            return newPlayerData;
          });
          await promiseWithTimeout(
            batch.commit(),
            FIRESTORE_TIMEOUT_MS,
            new Error("Timeout seeding initial players")
          );
          console.log(
            "[PuckPalDataProvider] initFirebaseData: Seeded players."
          );
          currentPlayers = seededPlayers;
          console.log(
            "[PuckPalDataProvider] initFirebaseData: Set players from seeded data:",
            currentPlayers.length
          );
        }
        setPlayers(currentPlayers);
        console.log(
          "[PuckPalDataProvider] initFirebaseData: setPlayers complete with",
          currentPlayers.length,
          "players."
        );

        console.log(
          "[PuckPalDataProvider] initFirebaseData: Fetching matches..."
        );
        const matchesQuery = query(
          collection(db, "matches"),
          orderBy("date", "asc")
        );
        const matchesSnapshot = await promiseWithTimeout(
          getDocs(matchesQuery),
          FIRESTORE_TIMEOUT_MS,
          new Error("Timeout fetching matches collection")
        );
        console.log(
          "[PuckPalDataProvider] initFirebaseData: Fetched matches snapshot:",
          matchesSnapshot.empty
            ? "empty"
            : `${matchesSnapshot.docs.length} docs`
        );
        const currentMatches = matchesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const date =
            data.date instanceof Timestamp
              ? data.date.toDate().toISOString()
              : data.date;

          const playerStats = (data.playerStats || []).map((ps: any) => ({
            playerId: ps.playerId,
            goals: ps.goals || 0,
            autoGoals: ps.autoGoals || 0,
            checks: ps.checks || 0,
          }));
          return { id: docSnap.id, ...data, date, playerStats } as Match;
        });
        setMatches(currentMatches);
        console.log(
          "[PuckPalDataProvider] initFirebaseData: setMatches complete with",
          currentMatches.length,
          "matches."
        );

        if (currentPlayers.length > 0 && currentMatches.length > 0) {
          console.log(
            "[PuckPalDataProvider] initFirebaseData: Recalculating player stats for existing players and matches..."
          );
          const statsUpdatedPlayers = await updatePlayerStatsInFirestore(
            currentPlayers,
            currentMatches
          );
          setPlayers(statsUpdatedPlayers);
          console.log(
            "[PuckPalDataProvider] initFirebaseData: Player stats updated and set."
          );
        } else if (currentPlayers.length > 0 && currentMatches.length === 0) {
          console.log(
            "[PuckPalDataProvider] initFirebaseData: Players exist but no matches. Ensuring player stats are zeroed."
          );
          const zeroedStatsPlayers = await updatePlayerStatsInFirestore(
            currentPlayers,
            []
          );
          setPlayers(zeroedStatsPlayers);
          console.log(
            "[PuckPalDataProvider] initFirebaseData: Player stats zeroed."
          );
        }
      } catch (error) {
        console.error(
          "[PuckPalDataProvider] initFirebaseData: ERROR during initialization:",
          error
        );
      } finally {
        console.log(
          "[PuckPalDataProvider] initFirebaseData: FINALLY block, setting internalFirebaseDataLoaded to true."
        );
        setInternalFirebaseDataLoaded(true);
      }
    };

    if (isClient) {
      initFirebaseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]); // Removed updatePlayerStatsInFirestore from deps to avoid potential loops if it changes too often

  const addMatch = useCallback(
    async (
      date: Date, // Parameter can be an Invalid Date object
      teamAPlayerIds: string[],
      teamAScore: number,
      teamBPlayerIds: string[],
      teamBScore: number,
      playerStats: PlayerMatchStats[]
    ) => {
      if (!isClient) {
        console.warn(
          "[PuckPalDataProvider] addMatch: Client not ready. Aborting."
        );
        return;
      }
      console.log("[PuckPalDataProvider] addMatch: START");
      if (!db) {
        console.error(
          "[PuckPalDataProvider] addMatch: Firestore 'db' instance is not available. Match not added."
        );
        return;
      }

      let firestoreTimestamp: Timestamp;
      if (date instanceof Date && !isNaN(date.getTime())) {
        firestoreTimestamp = Timestamp.fromDate(date);
      } else {
        console.warn(
          `[PuckPalDataProvider] addMatch received an invalid date value: ${date}. Defaulting to current client time for Firestore timestamp.`
        );
        firestoreTimestamp = Timestamp.now(); // Use client's current time if date is invalid
      }

      const winningTeamIds =
        teamAScore > teamBScore ? teamAPlayerIds : teamBPlayerIds;

      const newMatchData = {
        date: firestoreTimestamp,
        teamA: { playerIds: teamAPlayerIds, score: teamAScore },
        teamB: { playerIds: teamBPlayerIds, score: teamBScore },
        playerStats,
        winningTeamIds,
      };

      try {
        const matchRef = await promiseWithTimeout(
          addDoc(collection(db, "matches"), newMatchData),
          FIRESTORE_TIMEOUT_MS,
          new Error("Timeout adding match to Firestore")
        );
        console.log(
          "[PuckPalDataProvider] addMatch: Match added to Firestore with ID:",
          matchRef.id
        );

        // Ensure the date in the local Match object is an ISO string.
        // If firestoreTimestamp was Timestamp.now(), convert it to a Date then toISOString.
        // If it was from a valid 'date', date.toISOString() is correct.
        const localMatchDate =
          date instanceof Date && !isNaN(date.getTime())
            ? date.toISOString()
            : new Date().toISOString();

        const newMatchWithId: Match = {
          id: matchRef.id,
          date: localMatchDate, // Use consistent ISO string for local state
          teamA: { playerIds: teamAPlayerIds, score: teamAScore },
          teamB: { playerIds: teamBPlayerIds, score: teamBScore },
          playerStats,
          winningTeamIds,
        };

        const updatedMatchesList = [...matches, newMatchWithId];
        setMatches(updatedMatchesList);

        console.log(
          "[PuckPalDataProvider] addMatch: Recalculating player stats after adding match..."
        );
        const statsUpdatedPlayers = await updatePlayerStatsInFirestore(
          players,
          updatedMatchesList
        );
        setPlayers(statsUpdatedPlayers);
        console.log("[PuckPalDataProvider] addMatch: Player stats updated.");
      } catch (error) {
        console.error(
          "[PuckPalDataProvider] addMatch: Error adding match or updating stats:",
          error
        );
        throw error;
      }
    },
    [matches, players, updatePlayerStatsInFirestore, isClient]
  );

  const deleteMatch = useCallback(
    async (matchId: string) => {
      if (!isClient) {
        console.warn(
          "[PuckPalDataProvider] deleteMatch: Client not ready. Aborting."
        );
        throw new Error("Client not ready.");
      }
      console.log(
        `[PuckPalDataProvider] deleteMatch: START for matchId: ${matchId}`
      );
      if (!db) {
        console.error(
          "[PuckPalDataProvider] deleteMatch: Firestore 'db' instance is not available. Match not deleted."
        );
        throw new Error("Database not available.");
      }

      try {
        const matchDocRef = doc(db, "matches", matchId);
        await promiseWithTimeout(
          deleteDoc(matchDocRef),
          FIRESTORE_TIMEOUT_MS,
          new Error(`Timeout deleting match ${matchId} from Firestore`)
        );
        console.log(
          `[PuckPalDataProvider] deleteMatch: Match ${matchId} deleted from Firestore.`
        );

        const updatedMatchesList = matches.filter((m) => m.id !== matchId);
        setMatches(updatedMatchesList);
        console.log(
          `[PuckPalDataProvider] deleteMatch: Local matches state updated. ${updatedMatchesList.length} matches remaining.`
        );

        console.log(
          "[PuckPalDataProvider] deleteMatch: Recalculating player stats after deleting match..."
        );
        const currentPlayersState = [...players];
        const statsUpdatedPlayers = await updatePlayerStatsInFirestore(
          currentPlayersState,
          updatedMatchesList
        );
        setPlayers(statsUpdatedPlayers);
        console.log("[PuckPalDataProvider] deleteMatch: Player stats updated.");
      } catch (error) {
        console.error(
          `[PuckPalDataProvider] deleteMatch: Error deleting match ${matchId} or updating stats:`,
          error
        );
        throw error;
      }
    },
    [matches, players, updatePlayerStatsInFirestore, isClient]
  );

  const getGeneratedMatchups = useCallback((): GeneratedMatchup[] => {
    if (!isClient || !internalFirebaseDataLoaded || players.length !== 5) {
      return [];
    }
    const rawMatchups = generate2v3Matchups(players);
    return rawMatchups.map((m, index) => ({
      id: `matchup-${index}-${m.teamA.map((p) => p.id).join("")}-${m.teamB
        .map((p) => p.id)
        .join("")}`,
      teamA: {
        name: m.teamA.map((p) => p.name).join(" & "),
        playerIds: m.teamA.map((p) => p.id),
      },
      teamB: {
        name: m.teamB.map((p) => p.name).join(" & "),
        playerIds: m.teamB.map((p) => p.id),
      },
    }));
  }, [players, isClient, internalFirebaseDataLoaded]);

  const getPlayerById = useCallback(
    (id: string): Player | undefined => {
      return players.find((p) => p.id === id);
    },
    [players]
  );

  const isInitialized = isClient && internalFirebaseDataLoaded;

  const contextValue = {
    players,
    matches,
    addMatch,
    deleteMatch,
    getGeneratedMatchups,
    getPlayerById,
    isInitialized,
  };

  if (!isInitialized) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <PuckPalLogo
          className="w-20 h-20 mb-5 text-primary"
          style={{ color: "hsl(217, 91%, 60%)" }}
        />
        <p style={{ fontSize: "1.2rem", fontWeight: 500, marginTop: "1rem" }}>
          Loading PuckPal Data...
        </p>
      </div>
    );
  }

  return (
    <PuckPalContext.Provider value={contextValue}>
      {children}
    </PuckPalContext.Provider>
  );
};

export const usePuckPal = (): PuckPalContextType => {
  const context = useContext(PuckPalContext);
  if (context === undefined) {
    throw new Error("usePuckPal must be used within a PuckPalDataProvider");
  }
  return context;
};
