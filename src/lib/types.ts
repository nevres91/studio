export interface Player {
  id: string;
  name: string;
  totalGoals: number;
  totalAutoGoals: number; // New: Total own goals scored by this player
  totalChecks: number; // New: Total checks made by this player
  wins: number;
  losses: number;
  totalPoints: number; // New: Calculated from wins and losses
  gamesPlayed: number;
  winLossRatio: number;
  teamGoalsScored: number; // New: Total goals scored by teams this player was on
  teamGoalsConceded: number; // New: Total goals conceded by teams this player was on
  teamGoalDifference: number; // New: teamGoalsScored - teamGoalsConceded
}

// Renamed from PlayerGoal and expanded
export interface PlayerMatchStats {
  playerId: string;
  goals: number;
  autoGoals: number; // New: Own goals scored in this match
  checks: number; // New: Checks made in this match
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
  playerStats: PlayerMatchStats[]; // Changed from playerGoals
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
  teamA: { name: string; playerIds: string[] };
  teamB: { name: string; playerIds: string[] };
}
