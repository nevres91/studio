"use client";

import React, { useMemo } from "react";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import type { GeneratedMatchup, Player } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { calculateWinLossRatio } from "@/lib/utils";
import {
  Users,
  ShieldAlert,
  BarChartHorizontalBig,
  TrendingUp,
  Gamepad2,
} from "lucide-react";

export function TeamCombinationsStats() {
  const { players, matches, getGeneratedMatchups, getPlayerById } =
    usePuckPal();

  const teamStats = useMemo(() => {
    const matchups = getGeneratedMatchups();
    if (!matchups.length) return [];

    return matchups
      .map((matchup) => {
        // Stats for Team A of this matchup
        let teamAWins = 0;
        let teamALosses = 0;
        let teamAGamesPlayed = 0;

        // Stats for Team B of this matchup
        let teamBWins = 0;
        let teamBLosses = 0;
        let teamBGamesPlayed = 0;

        const teamAPlayerIdsSet = new Set(matchup.teamA.playerIds);
        const teamBPlayerIdsSet = new Set(matchup.teamB.playerIds);

        matches.forEach((match) => {
          const matchTeamAPlayerIdsSet = new Set(match.teamA.playerIds);
          const matchTeamBPlayerIdsSet = new Set(match.teamB.playerIds);

          const isTeamAThisMatchupSideA =
            matchup.teamA.playerIds.every((id) =>
              matchTeamAPlayerIdsSet.has(id)
            ) && matchTeamAPlayerIdsSet.size === teamAPlayerIdsSet.size;
          const isTeamBThisMatchupSideB =
            matchup.teamB.playerIds.every((id) =>
              matchTeamBPlayerIdsSet.has(id)
            ) && matchTeamBPlayerIdsSet.size === teamBPlayerIdsSet.size;

          const isTeamAThisMatchupSideB =
            matchup.teamA.playerIds.every((id) =>
              matchTeamBPlayerIdsSet.has(id)
            ) && matchTeamBPlayerIdsSet.size === teamAPlayerIdsSet.size;
          const isTeamBThisMatchupSideA =
            matchup.teamB.playerIds.every((id) =>
              matchTeamAPlayerIdsSet.has(id)
            ) && matchTeamAPlayerIdsSet.size === teamBPlayerIdsSet.size;

          if (isTeamAThisMatchupSideA && isTeamBThisMatchupSideB) {
            // matchup.teamA played as match.teamA
            teamAGamesPlayed++;
            teamBGamesPlayed++; // Both sides of the matchup participated
            if (
              match.winningTeamIds.every((id) => teamAPlayerIdsSet.has(id)) &&
              match.winningTeamIds.length === teamAPlayerIdsSet.size
            ) {
              teamAWins++;
              teamBLosses++;
            } else {
              teamALosses++;
              teamBWins++;
            }
          } else if (isTeamAThisMatchupSideB && isTeamBThisMatchupSideA) {
            // matchup.teamA played as match.teamB
            teamAGamesPlayed++;
            teamBGamesPlayed++;
            if (
              match.winningTeamIds.every((id) => teamAPlayerIdsSet.has(id)) &&
              match.winningTeamIds.length === teamAPlayerIdsSet.size
            ) {
              teamAWins++;
              teamBLosses++;
            } else {
              teamALosses++;
              teamBWins++;
            }
          }
        });

        const getName = (playerIds: string[]) =>
          playerIds.map((id) => getPlayerById(id)?.name || "N/A").join(" & ");

        return {
          id: matchup.id,
          teamAName: getName(matchup.teamA.playerIds),
          teamAPlayerIds: matchup.teamA.playerIds,
          teamAWins,
          teamALosses,
          teamAGamesPlayed,
          teamAWinLossRatio: calculateWinLossRatio(teamAWins, teamAGamesPlayed),

          teamBName: getName(matchup.teamB.playerIds),
          teamBPlayerIds: matchup.teamB.playerIds,
          teamBWins, // These will be mirrored from team A's perspective for a 2v3 matchup
          teamBLosses,
          teamBGamesPlayed,
          teamBWinLossRatio: calculateWinLossRatio(teamBWins, teamBGamesPlayed),
        };
      })
      .sort(
        (a, b) =>
          b.teamAWinLossRatio +
          b.teamBWinLossRatio -
          (a.teamAWinLossRatio + a.teamBWinLossRatio)
      ); // Sort by combined ratio or similar metric
  }, [getGeneratedMatchups, matches, getPlayerById]);

  if (players.length < 5) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-muted/20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Nema Dovoljno Igrača</h3>
        <p className="text-muted-foreground">
          Statistika timova zahtijeva najmanje 5 igrača da formira 2v3 parove.
        </p>
      </div>
    );
  }

  if (teamStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-muted/20">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">
          Još uvijek nema generisanih 2v3 parova
        </h3>
        <p className="text-muted-foreground">
          Mogući parovi će biti prikazani ovdje kada svi igrači budu učitani.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-2/5">Tim A (2 Igrača)</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Gamepad2 className="h-4 w-4" /> Odigrano
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" /> W/L (A)
              </div>
            </TableHead>
            <TableHead className="w-1/12 text-center font-bold text-lg">
              vs
            </TableHead>
            <TableHead className="w-2/5">Tim B (3 Igrača)</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" /> W/L (B)
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamStats.map((stat) => (
            <TableRow key={stat.id}>
              <TableCell className="font-medium">{stat.teamAName}</TableCell>
              <TableCell className="text-center">
                {stat.teamAGamesPlayed}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    stat.teamAWinLossRatio >= 0.5 ? "default" : "destructive"
                  }
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {stat.teamAWinLossRatio.toFixed(2)}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-bold text-muted-foreground">
                /
              </TableCell>
              <TableCell className="font-medium">{stat.teamBName}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    stat.teamBWinLossRatio >= 0.5 ? "default" : "destructive"
                  }
                  className="bg-accent/40 text-accent-foreground hover:bg-accent/60"
                >
                  {stat.teamBWinLossRatio.toFixed(2)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {matches.length === 0 && (
        <div className="p-4 text-center text-muted-foreground">
          No matches recorded yet. Play some games for stats to appear!Nema
          snimljenih mečeva. Odigrajte nekoliko igara i zabavite se.
        </div>
      )}
    </div>
  );
}
