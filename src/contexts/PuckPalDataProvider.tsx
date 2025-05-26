"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Player, Match, PlayerGoal, GeneratedMatchup } from "@/lib/types";
import { INITIAL_PLAYER_NAMES } from "@/lib/config";
import {
  generateId,
  generate2v3Matchups,
  calculateWinLossRatio,
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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

interface PuckPalContextType {
  players: Player[];
  matches: Match[];
  addMatch: (
    date: Date,
    teamAPlayerIds: string[],
    teamAScore: number,
    teamBPlayerIds: string[],
    teamBScore: number,
    playerGoals: PlayerGoal[]
  ) => Promise<void>; // Make async
  getGeneratedMatchups: () => GeneratedMatchup[];
  getPlayerById: (id: string) => Player | undefined;
  isInitialized: boolean; // Expose initialization status
}

const PuckPalContext = createContext<PuckPalContextType | undefined>(undefined);

export const PuckPalDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const updatePlayerStatsInFirestore = useCallback(
    async (
      currentPlayers: Player[],
      allMatches: Match[]
    ): Promise<Player[]> => {
      const statsMap: Record<
        string,
        {
          totalGoals: number;
          wins: number;
          losses: number;
          gamesPlayed: number;
        }
      > = {};

      currentPlayers.forEach((p) => {
        statsMap[p.id] = { totalGoals: 0, wins: 0, losses: 0, gamesPlayed: 0 };
      });

      allMatches.forEach((match) => {
        const allPlayerIdsInMatch = [
          ...match.teamA.playerIds,
          ...match.teamB.playerIds,
        ];
        allPlayerIdsInMatch.forEach((playerId) => {
          if (statsMap[playerId]) {
            statsMap[playerId].gamesPlayed += 1;
          }
        });

        match.winningTeamIds.forEach((winnerId) => {
          if (statsMap[winnerId]) {
            statsMap[winnerId].wins += 1;
          }
        });

        const losingTeamIds = allPlayerIdsInMatch.filter(
          (id) => !match.winningTeamIds.includes(id)
        );
        losingTeamIds.forEach((loserId) => {
          if (statsMap[loserId]) {
            statsMap[loserId].losses += 1;
          }
        });

        match.playerGoals.forEach((pg) => {
          if (statsMap[pg.playerId]) {
            statsMap[pg.playerId].totalGoals += pg.goals;
          }
        });
      });

      const updatedPlayers = currentPlayers.map((p) => {
        const newStats = statsMap[p.id];
        const gamesPlayed = newStats.gamesPlayed;
        return {
          ...p,
          ...newStats,
          gamesPlayed: gamesPlayed,
          winLossRatio: calculateWinLossRatio(newStats.wins, gamesPlayed),
        };
      });

      // Update these players in Firestore
      const batch = writeBatch(db);
      updatedPlayers.forEach((player) => {
        const playerRef = doc(db, "players", player.id);
        // Create a plain object for Firestore, excluding any undefined or custom object instances if necessary
        const playerData = { ...player };
        batch.set(playerRef, playerData);
      });
      await batch.commit();
      return updatedPlayers;
    },
    []
  );

  useEffect(() => {
    const initFirebaseData = async () => {
      try {
        // Fetch Players
        const playersCollectionRef = collection(db, "players");
        const playersSnapshot = await getDocs(playersCollectionRef);
        let currentPlayers: Player[] = playersSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Player)
        );

        if (currentPlayers.length === 0 && INITIAL_PLAYER_NAMES.length > 0) {
          console.log(
            "No players found in Firestore, seeding initial players..."
          );
          const seededPlayersPromises = INITIAL_PLAYER_NAMES.map((name) =>
            addDoc(playersCollectionRef, {
              name,
              totalGoals: 0,
              wins: 0,
              losses: 0,
              gamesPlayed: 0,
              winLossRatio: 0,
              // Firebase will add its own ID
            })
          );
          const seededPlayerRefs = await Promise.all(seededPlayersPromises);
          // Refetch players to get their Firestore-generated IDs
          const newPlayersSnapshot = await getDocs(playersCollectionRef);
          currentPlayers = newPlayersSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Player)
          );
        }
        setPlayers(currentPlayers);

        // Fetch Matches
        const matchesQuery = query(
          collection(db, "matches"),
          orderBy("date", "asc")
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const currentMatches = matchesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          // Convert Firestore Timestamps to ISO strings if they exist
          const date =
            data.date instanceof Timestamp
              ? data.date.toDate().toISOString()
              : data.date;
          return { id: docSnap.id, ...data, date } as Match;
        });
        setMatches(currentMatches);

        // Recalculate and update stats if there are players and matches
        if (currentPlayers.length > 0) {
          const statsUpdatedPlayers = await updatePlayerStatsInFirestore(
            currentPlayers,
            currentMatches
          );
          setPlayers(statsUpdatedPlayers);
        }
      } catch (error) {
        console.error("Error initializing Firebase data:", error);
        // Potentially set some error state to show in UI
      } finally {
        setIsInitialized(true);
      }
    };

    initFirebaseData();
  }, [updatePlayerStatsInFirestore]);

  const addMatch = useCallback(
    async (
      date: Date,
      teamAPlayerIds: string[],
      teamAScore: number,
      teamBPlayerIds: string[],
      teamBScore: number,
      playerGoals: PlayerGoal[]
    ) => {
      const winningTeamIds =
        teamAScore > teamBScore ? teamAPlayerIds : teamBPlayerIds;

      const newMatchData = {
        // id will be generated by Firestore
        date: Timestamp.fromDate(date), // Store as Firestore Timestamp
        teamA: { playerIds: teamAPlayerIds, score: teamAScore },
        teamB: { playerIds: teamBPlayerIds, score: teamBScore },
        playerGoals,
        winningTeamIds,
      };

      try {
        const matchRef = await addDoc(collection(db, "matches"), newMatchData);
        const newMatchWithId: Match = {
          id: matchRef.id,
          ...newMatchData,
          date: date.toISOString(), // for local state
        };

        const updatedMatchesList = [...matches, newMatchWithId];
        setMatches(updatedMatchesList);

        // Recalculate stats for all players based on all matches and update Firestore
        const statsUpdatedPlayers = await updatePlayerStatsInFirestore(
          players,
          updatedMatchesList
        );
        setPlayers(statsUpdatedPlayers);
      } catch (error) {
        console.error("Error adding match to Firestore:", error);
        // Handle error (e.g., show a toast notification)
      }
    },
    [matches, players, updatePlayerStatsInFirestore]
  );

  const getGeneratedMatchups = useCallback((): GeneratedMatchup[] => {
    if (!isInitialized || players.length !== 5) return [];
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
  }, [players, isInitialized]);

  const getPlayerById = useCallback(
    (id: string): Player | undefined => {
      return players.find((p) => p.id === id);
    },
    [players]
  );

  const contextValue = {
    players,
    matches,
    addMatch,
    getGeneratedMatchups,
    getPlayerById,
    isInitialized,
  };

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
