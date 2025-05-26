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

  useEffect(() => {
    // Initialize players only if the list is empty and not already initialized.
    // This check ensures it happens once after localStorage has been read.
    if (typeof window !== 'undefined' && players.length === 0 && !localStorage.getItem(LOCAL_STORAGE_KEYS.PLAYERS + '_initialized')) {
        const initialPlayers = INITIAL_PLAYER_NAMES.map(name => ({
        id: generateId(),
        name,
        totalGoals: 0,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        winLossRatio: 0,
      }));
      setPlayers(initialPlayers);
      localStorage.setItem(LOCAL_STORAGE_KEYS.PLAYERS + '_initialized', 'true');
    }
    setIsInitialized(true);
  }, [players, setPlayers]);


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
        const gamesPlayed = newStats.wins + newStats.losses; // Assuming gamesPlayed is wins + losses
        return {
            ...p,
            ...newStats,
            gamesPlayed: gamesPlayed, // Corrected gamesPlayed
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
      id: generateId(),
      date: date.toISOString(),
      teamA: { playerIds: teamAPlayerIds, score: teamAScore },
      teamB: { playerIds: teamBPlayerIds, score: teamBScore },
      playerGoals,
      winningTeamIds,
    };
    
    const updatedMatches = [...matches, newMatch];
    setMatches(updatedMatches);
    
    // Recalculate player stats after adding a match
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
    players: isInitialized ? players : INITIAL_PLAYER_NAMES.map(name => ({ id: name, name, totalGoals:0, wins:0, losses:0, gamesPlayed:0, winLossRatio:0 })), // Provide initial structure during SSR/first load
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
