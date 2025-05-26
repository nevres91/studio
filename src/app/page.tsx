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
          <CardTitle className="text-3xl">Welcome to PuckPal!</CardTitle>
          <CardDescription>
            Your ultimate companion for clusterPuck99 scores and stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Ready to dive in? Record a new match, check out player stats, or get
            AI-powered team suggestions.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/matches" passHref>
              <Button
                size="lg"
                className="w-full shadow-md hover:shadow-lg transition-shadow"
              >
                <Flame className="mr-2 h-5 w-5" /> Record New Match
              </Button>
            </Link>
            <Link href="/players" passHref>
              <Button
                variant="secondary"
                size="lg"
                className="w-full shadow-md hover:shadow-lg transition-shadow"
              >
                <Users className="mr-2 h-5 w-5" /> View Player Stats
              </Button>
            </Link>
            <Link href="/teams" passHref>
              <Button
                variant="secondary"
                size="lg"
                className="w-full shadow-md hover:shadow-lg transition-shadow"
              >
                <ListChecks className="mr-2 h-5 w-5" /> Suggest Teams (AI)
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-xs text-muted-foreground">Currently tracking</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Matches Played
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matches.length}</div>
            <p className="text-xs text-muted-foreground">
              Total games recorded
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Goals Scored
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoalsScored}</div>
            <p className="text-xs text-muted-foreground">
              Across all games and players
            </p>
          </CardContent>
        </Card>
      </div>

      {latestMatch && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Latest Match</CardTitle>
            <CardDescription>
              Recorded on {new Date(latestMatch.date).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">
                  Team A:{" "}
                  {latestMatch.teamA.playerIds
                    .map((id: any) => players.find((p) => p.id === id)?.name)
                    .join(", ")}
                </p>
                <p>Score: {latestMatch.teamA.score}</p>
              </div>
              <div className="text-xl font-bold mx-4">VS</div>
              <div>
                <p className="font-semibold">
                  Team B:{" "}
                  {latestMatch.teamB.playerIds
                    .map((id: any) => players.find((p) => p.id === id)?.name)
                    .join(", ")}
                </p>
                <p>Score: {latestMatch.teamB.score}</p>
              </div>
            </div>
            <p className="mt-2">
              Winner:{" "}
              {latestMatch.winningTeamIds.includes(
                latestMatch.teamA.playerIds[0]
              )
                ? "Team A"
                : "Team B"}
            </p>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Game Arena</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Image
            src="https://placehold.co/800x400.png"
            alt="Hockey rink"
            width={800}
            height={400}
            className="w-full h-auto object-cover"
            data-ai-hint="hockey rink"
          />
        </CardContent>
      </Card>
    </div>
  );
}
