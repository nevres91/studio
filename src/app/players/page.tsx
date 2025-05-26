"use client";

import { PlayerStatsDisplay } from "@/components/players/PlayerStatsDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";

export default function PlayersPage() {
  const { players } = usePuckPal();

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Player Statistics</CardTitle>
          <CardDescription>View detailed statistics for each player.</CardDescription>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <PlayerStatsDisplay players={players} />
          ) : (
            <p>No players available. Stats will appear here once players are tracked.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
