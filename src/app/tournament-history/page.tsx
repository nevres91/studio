"use client";

import React, { useState, useEffect } from "react";
import { getCompletedTournaments } from "@/services/tournamentService"; // getTournamentById removed as not directly used here
import type { StoredTournament } from "@/lib/tournamentTypes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  History,
  CalendarDays,
  ListChecks,
  Trophy,
  Users,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function TournamentHistoryPage() {
  const [completedTournaments, setCompletedTournaments] = useState<
    StoredTournament[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTournaments() {
      setIsLoading(true);
      setError(null);
      try {
        const tournaments = await getCompletedTournaments();
        setCompletedTournaments(tournaments);
      } catch (err) {
        console.error("Failed to fetch completed tournaments:", err);
        let detailedMessage = "Failed to fetch completed tournaments.";
        if (err instanceof Error) {
          detailedMessage = err.message; // Use the specific error message from the service
        }
        setError(detailedMessage);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Učitavanje Historije Turnira...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive-foreground bg-destructive/10 p-6 rounded-lg">
        <Trophy className="h-12 w-12 mb-4" /> {/* Changed Icon for variety */}
        <h2 className="text-2xl font-semibold mb-2">Error Loading History</h2>
        <p className="text-center">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (completedTournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <History className="h-16 w-16 mb-6" />
        <h2 className="text-2xl font-semibold mb-2">
          No Completed Tournaments Yet
        </h2>
        <p className="text-center">
          Finalize a tournament from the 'Tournament Planner' page, and it will
          appear here.
        </p>
        <Link href="/tournament" passHref>
          <Button variant="outline" className="mt-4">
            Go to Tournament Planner
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <History className="mr-3 h-8 w-8 text-primary" />
            Historija Završenih Turnira
          </CardTitle>
          <CardDescription>
            Pretraži sve završene turnire. Klikni na turnir da vidiš detalje.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {completedTournaments.map((tournament) => (
          <Link
            key={tournament.id}
            href={`/tournament-history/${tournament.id}`}
            passHref
            legacyBehavior
          >
            <a className="block hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
              <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 h-full flex flex-col cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-xl truncate flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-500 flex-shrink-0" />
                    {tournament.tournamentName}
                  </CardTitle>
                  <CardDescription className="text-xs flex items-center mt-1">
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                    Završen:{" "}
                    {tournament.createdAt
                      ? format(tournament.createdAt.toDate(), "PPP")
                      : "N/A"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm flex-grow">
                  <div className="flex items-center">
                    <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                    Tip:{" "}
                    <span className="font-medium ml-1">
                      {tournament.tournamentType === "round-robin-league"
                        ? "Round-Robin"
                        : "Single-Elimination"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    Igrači:{" "}
                    <span className="font-medium ml-1">
                      {tournament.playerNames.length}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    {/* The <a> tag is now the child of the button for proper link behavior within the Card structure */}
                    <span>
                      Pogledaj Detalje <ExternalLink className="ml-2 h-4 w-4" />
                    </span>
                  </Button>
                </CardFooter>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
