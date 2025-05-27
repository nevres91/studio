"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation"; // useRouter for back button
import { getTournamentById } from "@/services/tournamentService";
import type { StoredTournament } from "@/lib/tournamentTypes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trophy,
  CalendarDays,
  Users,
  ListChecks,
  ChevronLeft,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlayerScore {
  name: string;
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId =
    typeof params.tournamentId === "string" ? params.tournamentId : undefined;

  const [tournament, setTournament] = useState<StoredTournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playerScores = useMemo(() => {
    if (
      !tournament ||
      !tournament.playerNames ||
      tournament.playerNames.length === 0 ||
      !tournament.schedule
    ) {
      return [];
    }

    const scores: Record<string, PlayerScore> = {};
    tournament.playerNames.forEach((name) => {
      scores[name] = { name, points: 0, wins: 0, losses: 0, matchesPlayed: 0 };
    });

    tournament.schedule.forEach((match) => {
      if (match.status === "completed" && match.winner) {
        const winnerName = match.winner;
        let loserName: string | undefined = undefined;

        // Prioritize match.participants array if available and valid
        if (match.participants && match.participants.length === 2) {
          const p1 = match.participants[0];
          const p2 = match.participants[1];
          if (winnerName === p1 && scores[p2]) loserName = p2;
          else if (winnerName === p2 && scores[p1]) loserName = p1;
        } else {
          // Fallback for older matches or if participants array isn't populated as expected
          // This parsing is brittle and should be ideally avoided by ensuring AI populates `participants`
          const matchParts = match.match.split(/\s+vs\.?\s+/i);
          if (matchParts.length === 2) {
            const p1 = matchParts[0].trim();
            const p2 = matchParts[1].trim();
            if (winnerName === p1 && scores[p2]) loserName = p2;
            else if (winnerName === p2 && scores[p1]) loserName = p1;
          }
        }

        if (scores[winnerName]) {
          scores[winnerName].points += 2; // Winner gets 2 points
          scores[winnerName].wins += 1;
          scores[winnerName].matchesPlayed += 1;
        }
        if (loserName && scores[loserName]) {
          scores[loserName].points += 1; // Loser gets 1 point
          scores[loserName].losses += 1;
          scores[loserName].matchesPlayed += 1;
        }
      }
    });
    return Object.values(scores).sort(
      (a, b) => b.points - a.points || b.wins - a.wins
    );
  }, [tournament]);

  useEffect(() => {
    if (!tournamentId) {
      setError("Invalid tournament ID.");
      setIsLoading(false);
      return;
    }

    async function fetchTournamentDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTournament = await getTournamentById(tournamentId!); // Now safe: tournamentId is string
        if (fetchedTournament) {
          setTournament(fetchedTournament);
        } else {
          setError("Tournament not found.");
        }
      } catch (err) {
        console.error(`Failed to fetch tournament ${tournamentId}:`, err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchTournamentDetail();
  }, [tournamentId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading Tournament Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive-foreground bg-destructive/10 p-6 rounded-lg">
        <ShieldAlert className="h-12 w-12 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">
          Error Loading Tournament
        </h2>
        <p className="text-center">{error}</p>
        <Button
          onClick={() => router.back()}
          variant="secondary"
          className="mt-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Trophy className="h-12 w-12 mb-4" />
        <p className="text-lg">Tournament data could not be loaded.</p>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mt-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back to History
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Trophy className="mr-3 h-8 w-8 text-primary" />
            {tournament.tournamentName}
          </CardTitle>
          <CardDescription>{tournament.description}</CardDescription>
          <div className="text-sm text-muted-foreground pt-3 space-y-1">
            <div className="flex items-center">
              <ListChecks className="mr-2 h-4 w-4" /> Type:
              <Badge variant="secondary" className="ml-2">
                {tournament.tournamentType === "round-robin-league"
                  ? "Round-Robin League"
                  : "Single-Elimination Bracket"}
              </Badge>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4" /> Players:
              <Badge variant="secondary" className="ml-2">
                {Array.isArray(tournament.playerNames)
                  ? tournament.playerNames.join(", ")
                  : "N/A"}
              </Badge>
            </div>
            <div className="flex items-center">
              <CalendarDays className="mr-2 h-4 w-4" /> Created:
              <Badge variant="outline" className="ml-2">
                {tournament.createdAt
                  ? format(tournament.createdAt.toDate(), "PPP p")
                  : "N/A"}
              </Badge>
            </div>
            <div className="flex items-center">
              <ListChecks className="mr-2 h-4 w-4" /> Scoring:
              <span className="ml-2 font-mono text-xs p-1 bg-muted rounded">
                {tournament.scoringSystem}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 mt-4">
          {playerScores.length > 0 && (
            <div>
              <h4 className="font-semibold text-xl mb-3 flex items-center">
                <Star className="mr-2 h-5 w-5 text-yellow-400" />
                Standings
              </h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] text-center">
                        Rank
                      </TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">Played</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerScores.map((player, index) => (
                      <TableRow
                        key={player.name}
                        className={index === 0 ? "bg-primary/10" : ""}
                      >
                        <TableCell className="font-medium text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell>{player.name}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {player.points}
                        </TableCell>
                        <TableCell className="text-center text-green-600">
                          {player.wins}
                        </TableCell>
                        <TableCell className="text-center text-red-600">
                          {player.losses}
                        </TableCell>
                        <TableCell className="text-center">
                          {player.matchesPlayed}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-xl mb-3 flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary/80" />
              Final Schedule & Results
            </h4>
            {tournament.schedule && tournament.schedule.length > 0 ? (
              <div className="space-y-3">
                {tournament.schedule.map((item) => (
                  <Card
                    key={item.id}
                    className={`border p-4 rounded-lg shadow-sm ${
                      item.status === "completed"
                        ? "bg-secondary/30"
                        : "bg-card"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p
                        className={`font-semibold text-base ${
                          item.status === "completed"
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.round ? `Round ${item.round} - ` : ``}
                        {item.match}
                      </p>
                      {item.status === "completed" && item.winner && (
                        <Badge
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Winner:{" "}
                          {item.winner}
                        </Badge>
                      )}
                      {item.status === "pending" && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-600"
                        >
                          <HelpCircle className="h-4 w-4 mr-1.5" /> Pending
                        </Badge>
                      )}
                      {item.status === "completed" && !item.winner && (
                        <Badge
                          variant="outline"
                          className="border-orange-500 text-orange-600"
                        >
                          <HelpCircle className="h-4 w-4 mr-1.5" /> No Winner
                          Recorded
                        </Badge>
                      )}
                    </div>
                    {item.participants && item.participants.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Initial Participants: {item.participants.join(" vs ")}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Notes: {item.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No schedule items found for this tournament.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
