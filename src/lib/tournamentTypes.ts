import type { Timestamp } from "firebase/firestore";
import type {
  GenerateTournamentOutput,
  GenerateTournamentInput,
  ScheduleItem as AiScheduleItem,
} from "@/ai/flows/generate-tournament-flow";

/**
 * Extends the AI ScheduleItem with fields that might be specifically managed in the stored tournament,
 * though for now, they are largely the same.
 */
export interface TournamentScheduleItem extends AiScheduleItem {
  // Potentially add more UI-specific or DB-specific fields here later if needed
  // For now, AiScheduleItem covers id, round, match, participants, status, winner, notes
}

/**
 * Data structure for the core information of a tournament that is stored.
 * This combines the AI's output with the original input parameters used for generation.
 */
export interface StoredTournamentData
  extends Omit<GenerateTournamentOutput, "schedule"> {
  playerNames: GenerateTournamentInput["playerNames"];
  tournamentType: GenerateTournamentInput["tournamentType"];
  scoringSystem: GenerateTournamentInput["scoringSystem"];
  schedule: TournamentScheduleItem[]; // Use the more specific schedule item type
}

/**
 * Represents a tournament as stored in Firestore, including metadata.
 */
export interface StoredTournament extends StoredTournamentData {
  id: string; // Firestore document ID
  createdAt: Timestamp; // Firestore Timestamp of creation
  overallStatus: "new" | "in-progress" | "completed"; // Overall status of the tournament
  // Note: The 'status' field on individual schedule items tracks match status.
  // 'overallStatus' here tracks the tournament's lifecycle.
}
