"use client";

import { PlayerStatsDisplay } from "@/components/players/PlayerStatsDisplay";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";

export default function PlayersPage() {
  const { players } = usePuckPal();

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Statistika Igrača </CardTitle>
          <CardDescription>
            Pogledaj detaljnu statistiku svakog igrača
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length > 0 ? (
            <PlayerStatsDisplay players={players} />
          ) : (
            <p>
              Nema dostupnih igrača. Statistika će biti prikazana kada igrači
              budu dostupni.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
