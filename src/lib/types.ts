
export interface Player {
  id: string;
  name: string;
  totalGoals: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winLossRatio: number; // Added for direct use by AI and display
}

export interface PlayerGoal {
  playerId: string;
  goals: number;
}

export interface MatchTeamDetails {
  playerIds: string[];
  score: number;
}

export interface Match {
  id: string;
  date: string; // ISO string
  teamA: MatchTeamDetails;
  teamB: MatchTeamDetails;
  playerGoals: PlayerGoal[];
  winningTeamIds: string[]; // Store IDs of players in the winning team
}

// Represents a specific 2v3 or similar fixed team structure for stats
export interface TeamCombination {
  id: string; // e.g., "player1Id-player2Id_vs_player3Id-player4Id-player5Id" or just "player1Id-player2Id" for a side
  name: string; // e.g. "Team Alpha" or "Aki & Esko"
  playerIds: string[];
  wins: number;
  losses: number;
  gamesPlayed: number;
  winLossRatio: number;
}

export interface GeneratedMatchup {
  id: string; // Unique ID for this matchup configuration
  teamA: { name: string, playerIds: string[] };
  teamB: { name: string, playerIds: string[] };
}
