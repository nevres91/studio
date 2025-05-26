
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Player, Match, PlayerGoal, MatchTeamDetails, GeneratedMatchup } from '@/lib/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { INITIAL_PLAYER_NAMES, LOCAL_STORAGE_KEYS } from '@/lib/config';
import { generateId, generate2v3Matchups, calculateWinLossRatio } from '@/lib/utils';

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
  ) => void;
  getGeneratedMatchups: () => GeneratedMatchup[];
  getPlayerById: (id: string) => Player | undefined;
}

const PuckPalContext = createContext<PuckPalContextType | undefined>(undefined);

export const PuckPalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useLocalStorage<Player[]>(LOCAL_STORAGE_KEYS.PLAYERS, []);
  const [matches, setMatches] = useLocalStorage<Match[]>(LOCAL_STORAGE_KEYS.MATCHES, []);
  const [isInitialized, setIsInitialized] = useState(false);

  // This effect handles the one-time initialization of default players if they don't exist in localStorage.
  useEffect(() => {
    // Only run on client and if players array (from useLocalStorage, after its own effect runs) is empty,
    // and the initialization flag is not set.
    if (typeof window !== 'undefined' && players.length === 0 && !localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYERS + '_initialized')) {
        const defaultPlayers = INITIAL_PLAYER_NAMES.map(name => ({
        id: name, // Use name as ID for deterministic initial state, matching the SSR fallback
        name,
        totalGoals: 0,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        winLossRatio: 0,
      }));
      setPlayers(defaultPlayers); // This updates the 'players' state from useLocalStorage
      localStorage.setItem(LOCAL_STORAGE_KEYS.PLAYERS + '_initialized', 'true');
    }
  }, [players, setPlayers]); // Runs when `players` (from useLocalStorage's perspective) changes.

  // This effect marks the provider as "initialized" after the first client-side mount.
  // This allows `useLocalStorage` to attempt loading data and the player initialization effect to run
  // before `isInitialized` becomes true and the context switches from fallback to live data.
  useEffect(() => {
    setIsInitialized(true);
  }, []); // Runs once on the client after mount.


  const updatePlayerStats = useCallback((currentPlayers: Player[], updatedMatches: Match[]): Player[] => {
    const statsMap: Record<string, { totalGoals: number; wins: number; losses: number; gamesPlayed: number }> = {};

    currentPlayers.forEach(p => {
      statsMap[p.id] = { totalGoals: 0, wins: 0, losses: 0, gamesPlayed: 0 };
    });

    updatedMatches.forEach(match => {
      const allPlayerIdsInMatch = [...match.teamA.playerIds, ...match.teamB.playerIds];
      allPlayerIdsInMatch.forEach(playerId => {
        if (statsMap[playerId]) {
          statsMap[playerId].gamesPlayed += 1;
        }
      });

      match.winningTeamIds.forEach(winnerId => {
        if (statsMap[winnerId]) {
          statsMap[winnerId].wins += 1;
        }
      });
      
      const losingTeamIds = allPlayerIdsInMatch.filter(id => !match.winningTeamIds.includes(id));
      losingTeamIds.forEach(loserId => {
         if (statsMap[loserId]) {
          statsMap[loserId].losses += 1;
        }
      });

      match.playerGoals.forEach(pg => {
        if (statsMap[pg.playerId]) {
          statsMap[pg.playerId].totalGoals += pg.goals;
        }
      });
    });
    
    return currentPlayers.map(p => {
        const newStats = statsMap[p.id];
        // gamesPlayed should be directly incremented, not just sum of wins/losses if draws were possible (not in this app)
        // For this app, gamesPlayed = wins + losses is fine as each game has a winner/loser.
        const gamesPlayed = newStats.gamesPlayed; // Use the incremented gamesPlayed
        return {
            ...p,
            ...newStats,
            gamesPlayed: gamesPlayed,
            winLossRatio: calculateWinLossRatio(newStats.wins, gamesPlayed),
        };
    });

  }, []);


  const addMatch = useCallback((
    date: Date,
    teamAPlayerIds: string[],
    teamAScore: number,
    teamBPlayerIds: string[],
    teamBScore: number,
    playerGoals: PlayerGoal[]
  ) => {
    const winningTeamIds = teamAScore > teamBScore ? teamAPlayerIds : teamBPlayerIds;

    const newMatch: Match = {
      id: generateId(), // generateId() is fine for new matches added client-side
      date: date.toISOString(),
      teamA: { playerIds: teamAPlayerIds, score: teamAScore },
      teamB: { playerIds: teamBPlayerIds, score: teamBScore },
      playerGoals,
      winningTeamIds,
    };
    
    const updatedMatches = [...matches, newMatch];
    setMatches(updatedMatches);
    
    setPlayers(prevPlayers => updatePlayerStats(prevPlayers, updatedMatches));

  }, [matches, setMatches, setPlayers, updatePlayerStats]);

  const getGeneratedMatchups = useCallback((): GeneratedMatchup[] => {
    if (!isInitialized || players.length !== 5) return [];
    const rawMatchups = generate2v3Matchups(players);
    return rawMatchups.map((m, index) => ({
      id: `matchup-${index}-${m.teamA.map(p=>p.id).join('')}-${m.teamB.map(p=>p.id).join('')}`,
      teamA: { name: `Team ${m.teamA.map(p => p.name).join(' & ')}`, playerIds: m.teamA.map(p => p.id) },
      teamB: { name: `Team ${m.teamB.map(p => p.name).join(' & ')}`, playerIds: m.teamB.map(p => p.id) },
    }));
  }, [players, isInitialized]);

  const getPlayerById = useCallback((id: string): Player | undefined => {
    return players.find(p => p.id === id);
  }, [players]);
  
  const contextValue = {
    // On server and initial client render, `isInitialized` is false, providing a stable fallback.
    // After client-side effects run and `isInitialized` becomes true, `players` state (from localStorage or default init) is used.
    players: isInitialized ? players : INITIAL_PLAYER_NAMES.map(name => ({ id: name, name, totalGoals:0, wins:0, losses:0, gamesPlayed:0, winLossRatio:0 })),
    matches,
    addMatch,
    getGeneratedMatchups,
    getPlayerById,
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
    throw new Error('usePuckPal must be used within a PuckPalDataProvider');
  }
  return context;
};
