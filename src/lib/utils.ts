import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Player } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Generates combinations of a specific size from an array
export function getCombinations<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  function p(tempCombination: T[], index: number) {
    if (tempCombination.length === size) {
      result.push([...tempCombination]); // Add a copy of the combination
      return;
    }
    if (index >= array.length) {
      return;
    }
    // Include current element
    tempCombination.push(array[index]);
    p(tempCombination, index + 1);
    // Exclude current element
    tempCombination.pop();
    p(tempCombination, index + 1);
  }
  p([], 0);
  return result;
}

// Generates 2v3 matchups from a list of players
export function generate2v3Matchups(players: Player[]): { teamA: Player[], teamB: Player[] }[] {
  if (players.length !== 5) {
    // This function is specifically for 5 players resulting in 2v3
    // console.warn("generate2v3Matchups expects exactly 5 players.");
    return []; // Or handle differently
  }

  const matchups: { teamA: Player[], teamB: Player[] }[] = [];
  const teamsOfTwo = getCombinations(players, 2);

  for (const teamA of teamsOfTwo) {
    const teamB = players.filter(p => !teamA.find(pA => pA.id === p.id));
    matchups.push({ teamA, teamB });
  }
  return matchups;
}

export function calculateWinLossRatio(wins: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return parseFloat((wins / gamesPlayed).toFixed(2));
}
