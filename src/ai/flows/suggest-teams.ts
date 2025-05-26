// This is an AI-powered function to suggest balanced teams for the game clusterPuck99, considering past player performance.

"use server";

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const SuggestTeamsInputSchema = z.object({
  players: z
    .array(
      z.object({
        name: z.string().describe("The name of the player."),
        totalGoals: z
          .number()
          .describe("The total goals scored by the player."),
        winLossRatio: z.number().describe("The win/loss ratio of the player."),
        gamesPlayed: z
          .number()
          .describe("The number of games played by the player."),
      })
    )
    .describe("An array of player objects with their statistics."),
});

export type SuggestTeamsInput = z.infer<typeof SuggestTeamsInputSchema>;

const SuggestTeamsOutputSchema = z.object({
  teamA: z.array(z.string()).describe("An array of player names for Team A."),
  teamB: z.array(z.string()).describe("An array of player names for Team B."),
  reasoning: z.string().describe("The AI reasoning for the suggested teams."),
});

export type SuggestTeamsOutput = z.infer<typeof SuggestTeamsOutputSchema>;

export async function suggestTeams(
  input: SuggestTeamsInput
): Promise<SuggestTeamsOutput> {
  return suggestTeamsFlow(input);
}

const suggestTeamsPrompt = ai.definePrompt({
  name: "suggestTeamsPrompt",
  input: { schema: SuggestTeamsInputSchema },
  output: { schema: SuggestTeamsOutputSchema },
  prompt: `You are an AI assistant specialized in forming balanced teams for the game clusterPuck99.

  Given the following player statistics, analyze their performance and suggest two teams (Team A and Team B) that would result in a fair and competitive game.

  Players:
  {{#each players}}
  - Name: {{this.name}}, Total Goals: {{this.totalGoals}}, Win/Loss Ratio: {{this.winLossRatio}}, Games Played: {{this.gamesPlayed}}
  {{/each}}

  Consider each player's total goals, win/loss ratio, and games played to create balanced teams.

  Explain your reasoning for the team composition in the reasoning field in Bosnian. Be concise and clear.

  Format the output as a JSON object with teamA (array of player names), teamB (array of player names), and reasoning (string).`,
});

const suggestTeamsFlow = ai.defineFlow(
  {
    name: "suggestTeamsFlow",
    inputSchema: SuggestTeamsInputSchema,
    outputSchema: SuggestTeamsOutputSchema,
  },
  async (input) => {
    const { output } = await suggestTeamsPrompt(input);
    return output!;
  }
);
