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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerStatsDisplayProps {
  players: Player[];
}

export function PlayerStatsDisplay({ players }: PlayerStatsDisplayProps) {
  const sortedPlayers = [...players].sort(
    (a, b) => b.winLossRatio - a.winLossRatio || b.totalGoals - a.totalGoals
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Rank</TableHead>
            <TableHead>Igrač</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Gamepad2 className="h-4 w-4" /> Mečevi
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Award className="h-4 w-4" /> Pobjede
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4" /> Gubitci
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-4 w-4" /> Golovi
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
              <TableCell className="text-center">{player.totalGoals}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
