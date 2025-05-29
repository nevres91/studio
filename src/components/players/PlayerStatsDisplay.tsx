"use client";

import type { Player } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Award,
  Target,
  TrendingUp,
  TrendingDown,
  Gamepad2,
  ShieldOff,
  Zap,
  Goal,
  Minus,
  Plus,
  GitCompareArrows,
  Star,
} from "lucide-react"; // Added icons
import { Badge } from "@/components/ui/badge";

interface PlayerStatsDisplayProps {
  players: Player[];
}

export function PlayerStatsDisplay({ players }: PlayerStatsDisplayProps) {
  const sortedPlayers = [...players].sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.winLossRatio - a.winLossRatio ||
      b.totalGoals - a.totalGoals ||
      b.teamGoalDifference - a.teamGoalDifference
  );

  const getGoalDifferenceColor = (diff: number) => {
    if (diff > 0) return "text-green-600 dark:text-green-400";
    if (diff < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px] text-center">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Gamepad2 className="h-4 w-4" /> GP
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Award className="h-4 w-4" /> W
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4" /> L
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4" /> Pts
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Goal className="h-4 w-4" /> Goals
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <ShieldOff className="h-4 w-4" /> AutoG
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-4 w-4" /> Checks
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" /> W/L
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Plus className="h-4 w-4" /> Team GF
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Minus className="h-4 w-4" /> Team GA
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <GitCompareArrows className="h-4 w-4" /> Team GD
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlayers.map((player, index) => (
            <TableRow
              key={player.id}
              className={index === 0 ? "bg-accent/20 hover:bg-accent/30" : ""}
            >
              <TableCell className="font-medium text-center">
                {index === 0 && (
                  <Award className="inline-block h-5 w-5 text-yellow-500 mr-1" />
                )}
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={`https://placehold.co/40x40.png?text=${player.name.charAt(
                        0
                      )}`}
                      alt={player.name}
                      data-ai-hint="avatar player"
                    />
                    <AvatarFallback>
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{player.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {player.gamesPlayed}
              </TableCell>
              <TableCell className="text-center text-green-600 dark:text-green-400">
                {player.wins}
              </TableCell>
              <TableCell className="text-center text-red-600 dark:text-red-400">
                {player.losses}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {player.totalPoints}
              </TableCell>
              <TableCell className="text-center">{player.totalGoals}</TableCell>
              <TableCell className="text-center">
                {player.totalAutoGoals}
              </TableCell>
              <TableCell className="text-center">
                {player.totalChecks}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    player.winLossRatio >= 0.5 ? "default" : "destructive"
                  }
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {player.winLossRatio.toFixed(2)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {player.teamGoalsScored}
              </TableCell>
              <TableCell className="text-center">
                {player.teamGoalsConceded}
              </TableCell>
              <TableCell
                className={`text-center font-semibold ${getGoalDifferenceColor(
                  player.teamGoalDifference
                )}`}
              >
                {player.teamGoalDifference > 0
                  ? `+${player.teamGoalDifference}`
                  : player.teamGoalDifference}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
