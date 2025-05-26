"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { usePuckPal } from "../contexts/PuckPalDataProvider";
import { BarChart, Flame, ListChecks, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../components/ui/button";
import map from "../lib/map.jpg";
import { format } from "date-fns";

export default function DashboardPage() {
  const { players, matches } = usePuckPal();

  const totalGoalsScored = players.reduce(
    (sum, player) => sum + player.totalGoals,
    0
  );
  const latestMatch = matches.length > 0 ? matches[matches.length - 1] : null;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl">Dobrodošli u PuckPal!</CardTitle>
          <CardDescription>
            Tvoj najbolji prijatelj za vođenje statistike mečeva i golova u
            ClusterPuck99
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Snimi novi meč, pogledaj statistiku svih igrača ili napravi timove
            na osnovu statistike golova.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/matches" passHref>
              <Button
                size="lg"
                className="w-full shadow-md hover:shadow-lg transition-shadow"
              >
                <Flame className="mr-2 h-5 w-5" /> Snimi Novi Meč
              </Button>
            </Link>
            <Link href="/players" passHref>
              <Button
                variant="secondary"
                size="lg"
                className="w-full shadow-md hover:shadow-lg transition-shadow"
              >
                <Users className="mr-2 h-5 w-5" /> Pogledaj Statistiku Igrača
              </Button>
            </Link>
            <Link href="/teams" passHref>
              <Button
                variant="secondary"
                size="lg"
                className="w-full shadow-md hover:shadow-lg transition-shadow"
              >
                <ListChecks className="mr-2 h-5 w-5" /> Predloži Timove (AI)
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno Igrača</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-xs text-muted-foreground">Trenutno se prati</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Odigrani Mečevi
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matches.length}</div>
            <p className="text-xs text-muted-foreground">
              Ukupno Snimljenih Mečeva
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupni Golovi</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoalsScored}</div>
            <p className="text-xs text-muted-foreground">
              Od svih mečeva i svih igrača
            </p>
          </CardContent>
        </Card>
      </div>

      {latestMatch && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Posljednji Meč</CardTitle>
            <CardDescription>
              Snimljeno {format(new Date(latestMatch.date), "dd.MM.yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex justify-between items-center">
              <div className="bg-red-200 rounded-xl p-1 w-[50%] flex flex-col items-center min-h-[110px] justify-center">
                <span className="text-center font-bold">Tim A: </span>
                <p className="font-semibold text-center text-red-600">
                  {latestMatch.teamA.playerIds
                    .map((id: any) => players.find((p) => p.id === id)?.name)
                    .join(", ")}
                </p>
                <p>Score: {latestMatch.teamA.score}</p>
              </div>
              <div className="text-xl font-bold mx-4">VS</div>
              <div className="bg-blue-200 rounded-xl p-1  w-[50%] flex flex-col items-center min-h-[110px] justify-center">
                <span className="text-center font-bold">Tim B: </span>
                <p className="font-semibold text-center text-blue-600">
                  {latestMatch.teamB.playerIds
                    .map((id: any) => players.find((p) => p.id === id)?.name)
                    .join(", ")}
                </p>
                <p>Score: {latestMatch.teamB.score}</p>
              </div>
            </div>
            <p className="mt-2">
              <span className="font-bold  p-1">Pobjednik: </span>
              {latestMatch.winningTeamIds.includes(
                latestMatch.teamA.playerIds[0]
              )
                ? "Tim A"
                : "Tim B"}
            </p>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Arena</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Image
            src={map}
            alt="Hockey rink"
            width={800}
            height={400}
            className="w-full h-auto object-fit"
            data-ai-hint="hockey rink"
          />
        </CardContent>
      </Card>
    </div>
  );
}
