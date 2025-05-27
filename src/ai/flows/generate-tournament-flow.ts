"use server";
/**
 * @fileOverview AI flow for generating tournament structures.
 *
 * - generateTournamentStructure - A function that handles tournament generation.
 * - GenerateTournamentInput - The input type for the generateTournamentStructure function.
 * - GenerateTournamentOutput - The return type for the generateTournamentStructure function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs

const GenerateTournamentInputSchema = z.object({
  playerNames: z
    .array(z.string().min(1))
    .min(2)
    .describe(
      "An array of player names participating in the tournament. Minimum 2 players."
    ),
  tournamentType: z
    .enum(["round-robin-league", "single-elimination-bracket"])
    .describe("The desired type of tournament."),
  scoringSystem: z
    .string()
    .min(5)
    .describe(
      "Describe the scoring system, e.g., 'Winner: 3 points, Draw: 1 point, Loser: 0 points' or 'Win advances, loser is eliminated'."
    ),
});
export type GenerateTournamentInput = z.infer<
  typeof GenerateTournamentInputSchema
>;

const ScheduleItemSchema = z.object({
  id: z
    .string()
    .describe(
      'A placeholder unique ID for this match (e.g., "match-1", "match-2"). The system will assign a final ID.'
    ),
  round: z
    .number()
    .optional()
    .describe(
      "Round number, if applicable (e.g., for leagues or multi-stage tournaments)."
    ),
  match: z
    .string()
    .describe(
      "Description of the match, e.g., 'Player A vs Player B' or 'Winner of Match 1 vs Winner of Match 2'."
    ),
  participants: z
    .array(z.string())
    .optional()
    .describe(
      "An array of the names of the direct participants in this match, IF they are explicitly known at the time of schedule generation (e.g., ['Player A', 'Player B']). This helps UI in selecting a winner. For matches like 'Winner of Match X vs Winner of Match Y', this array should be empty or omitted."
    ),
  status: z
    .enum(["pending", "completed"])
    .default("pending")
    .describe("The current status of this match."),
  winner: z
    .string()
    .optional()
    .describe(
      "The name of the winner of this match, once decided. Be CONCISE, just the name or empty if not decided."
    ),
  notes: z
    .string()
    .optional()
    .describe("Any specific notes for this match or round. Be CONCISE."),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

const GenerateTournamentOutputSchema = z.object({
  tournamentName: z
    .string()
    .min(1)
    .describe(
      "A catchy, unique, and descriptive name for the generated tournament/league. Avoid generic names like 'Clash of Titans' unless very fitting; try to be more original. THIS FIELD IS REQUIRED."
    ),
  description: z
    .string()
    .describe(
      "A brief overview of the tournament format, including how many rounds or total matches might be expected."
    ),
  schedule: z
    .array(ScheduleItemSchema)
    .describe(
      "List of matches to be played. Each match must have a unique ID. For brackets, this might represent initial seeding or progression. For leagues, a list of all fixtures. For ANY match where the two specific player names are known at the time of generation (e.g., 'Player A vs Player B' in an early round), the 'participants' array MUST be populated with those two player names (e.g., participants: ['Player A', 'Player B']). For matches whose participants depend on prior results (e.g., 'Winner of Match X vs Winner of Match Y'), the 'participants' array should be empty or omitted."
    ),
  standingsExplanation: z
    .string()
    .describe(
      "Explanation of how standings will be tracked (e.g., points, goal difference, head-to-head) and what columns would typically be in a standings table."
    ),
  advancementRules: z
    .string()
    .describe(
      "Clear rules on how players/teams advance to the next stage (for brackets) or how the overall winner is determined (for leagues or final stages)."
    ),
  tieBreakingRules: z
    .string()
    .optional()
    .describe(
      "Rules for breaking ties in standings or matches, if applicable."
    ),
});
export type GenerateTournamentOutput = z.infer<
  typeof GenerateTournamentOutputSchema
>;

export async function generateTournamentStructure(
  input: GenerateTournamentInput
): Promise<GenerateTournamentOutput> {
  return generateTournamentStructureFlow(input);
}

const generateTournamentPrompt = ai.definePrompt({
  name: "generateTournamentPrompt",
  input: { schema: GenerateTournamentInputSchema },
  output: { schema: GenerateTournamentOutputSchema },
  prompt: `You are an expert sports tournament organizer AI. Your task is to design a {{tournamentType}} for the following players:
{{#each playerNames}}
- {{this}}
{{/each}}

The scoring system is: {{{scoringSystem}}}

Please generate a comprehensive tournament structure. It is CRITICAL that you provide ALL required fields in the output. The 'tournamentName' field is ABSOLUTELY ESSENTIAL and MUST be provided.

The structure must include:
1.  **tournamentName (Required & Critical)**: A creative, unique, and fitting name for the tournament. Try to make it specific to the players or the game, rather than a generic sports title. For example, if players are Aki and Esko, perhaps "The Aki-Esko Showdown" or "Northern Lights Cup". Avoid names like "Ultimate Championship" or "Clash of Titans" unless the input implies it. THIS FIELD IS REQUIRED.
2.  A brief description of the format. Be CONCISE.
3.  A schedule of matches. Each match object in the schedule array MUST have an 'id' field (use simple placeholders like "temp-id-1", "temp-id-2", etc., as the system assigns final unique IDs) and a 'status' field (initialized to "pending").
    - For a 'round-robin-league', ensure each player plays every other player once.
    - For a 'single-elimination-bracket', define the initial matchups. If the number of players is not a power of 2, describe how byes would be handled to create a fair bracket.
    - **Crucially, for ALL matches where the direct participants are known at the time of generation (e.g., 'Alice vs Bob' in the first round of a bracket or any league match), you MUST populate the 'participants' array with exactly two strings: the names of the two players involved (e.g., participants: ["Alice", "Bob"]).**
    - For matches involving winners of previous rounds (e.g., "Winner of Match 1 vs Winner of Match 2"), the 'participants' array can be omitted or empty for those specific matches, as the players are not yet known.
    - Clearly state player pairings for each match in the 'match' field (e.g., "Alice vs Bob", "Winner M1 vs Winner M2").
    - If it's a league with multiple rounds of fixtures, list them, clearly indicating rounds.
    - For 'winner' and 'notes' fields in each schedule item, be VERY CONCISE. For 'winner', provide only the player's name if decided, otherwise leave it empty or null. For 'notes', provide only brief, essential information. AVOID long explanations in these fields.
4.  An explanation of how standings will be tracked (e.g., points for a win/draw/loss, tie-breakers like goal difference or head-to-head results). Be CONCISE.
5.  Clear rules for advancement or how the overall winner is determined. For a bracket, explain progression. For a league, explain who wins at the end. Be CONCISE.
6.  (Optional) Suggest any tie-breaking rules if they seem relevant for the proposed structure and scoring. Be CONCISE if provided.

Ensure the output is logical, fair, and suitable for the number of players provided.
If generating a bracket for a number of players that is not a power of two (e.g., 3, 5, 6, 7 players), clearly explain how byes are assigned in the first round.
The description should be engaging but CONCISE. The schedule must be easy to follow. Standings and advancement rules must be unambiguous.
Every match in the schedule array MUST have its 'id' (placeholder), 'status' ("pending"), and 'match' description. For direct matchups with known players, the 'participants' array MUST be populated with their names.
`,
});

const generateTournamentStructureFlow = ai.defineFlow(
  {
    name: "generateTournamentStructureFlow",
    inputSchema: GenerateTournamentInputSchema,
    outputSchema: GenerateTournamentOutputSchema,
  },
  async (input) => {
    const { output } = await generateTournamentPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate tournament structure.");
    }
    // Ensure all schedule items have a unique ID and default status
    output.schedule = output.schedule.map((item) => ({
      ...item, // keep other AI-generated fields like match description, round, etc.
      id: uuidv4(), // ALWAYS generate a new, unique UUID here, overwriting any 'id' from AI.
      status: item.status || "pending",
      participants: item.participants || [], // Ensure participants is an array
    }));
    return output;
  }
);
