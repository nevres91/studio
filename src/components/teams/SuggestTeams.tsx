"use client";

import React, { useState } from "react";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, WandSparkles, Users, AlertTriangle } from "lucide-react";
import {
  suggestTeams,
  type SuggestTeamsInput,
  type SuggestTeamsOutput,
} from "@/ai/flows/suggest-teams"; // Assuming AI flow is correctly exported
import { useToast } from "@/hooks/use-toast";

export function SuggestTeams() {
  const { players } = usePuckPal();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestTeamsOutput | null>(null);

  const handleSuggestTeams = async () => {
    if (players.length < 5) {
      toast({
        title: "Not enough players",
        description:
          "AI suggestions require at least 5 players with game data.",
        variant: "destructive",
      });
      return;
    }

    // Check if players have enough game data
    const playersWithSufficientData = players.filter((p) => p.gamesPlayed > 0);
    if (playersWithSufficientData.length < 5) {
      toast({
        title: "Insufficient Data",
        description:
          "Not all players have played matches. AI needs more data for accurate suggestions.",
        variant: "destructive",
      });
      // Optionally, still proceed with available data but warn user.
      // For now, we'll require all 5 to have some data for simplicity of the AI prompt.
      // return;
    }

    setIsLoading(true);
    setSuggestion(null);

    try {
      const input: SuggestTeamsInput = {
        players: players.map((p) => ({
          name: p.name,
          totalGoals: p.totalGoals,
          winLossRatio: p.winLossRatio,
          gamesPlayed: p.gamesPlayed,
        })),
      };
      const result = await suggestTeams(input);
      setSuggestion(result);
      toast({
        title: "Teams Suggested!",
        description: "AI has proposed balanced teams.",
      });
    } catch (error) {
      console.error("Error suggesting teams:", error);
      toast({
        title: "Error",
        description: "Could not get team suggestions from AI.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <WandSparkles className="h-12 w-12 text-primary mb-3" />
        <p className="text-muted-foreground mb-4">
          Dopusti da Umjetna Inteligencija analizira statistiku svih igrača i
          predloži fer timove za vaš sledeći meč. To uključuje ukupne golove
          igrača, win/loss odnos i odigrane mečeve.
        </p>
        <Button
          onClick={handleSuggestTeams}
          disabled={isLoading || players.length < 5}
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="mr-2 h-4 w-4" />
          )}
          Preporuči Fer Tim
        </Button>
        {players.length < 5 && (
          <p className="text-sm text-destructive mt-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" /> Potrebno je 5 igrača.
          </p>
        )}
      </div>

      {suggestion && (
        <Card className="bg-background shadow-xl animate-in fade-in duration-500">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" /> Preporuka Tima od
              AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/50">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Tim A</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside">
                    {suggestion.teamA.map((playerName) => (
                      <li key={playerName}>{playerName}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-accent/50">
                <CardHeader>
                  <CardTitle className="text-lg text-accent">Tim B</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside">
                    {suggestion.teamB.map((playerName) => (
                      <li key={playerName}>{playerName}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Razlog:</h4>
              <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">
                {suggestion.reasoning}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
