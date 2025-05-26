"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import type { Match } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarDays, Users, Award, Filter, X } from "lucide-react";
import { enUS } from "date-fns/locale";

const ITEMS_PER_PAGE = 5;

export function MatchHistory() {
  const { matches, players, getPlayerById } = usePuckPal();
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterPlayerId, setFilterPlayerId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getPlayerName = (id: string) =>
    getPlayerById(id)?.name || "Unknown Player";

  const filteredMatches = useMemo(() => {
    return matches
      .filter((match) => {
        if (
          filterDate &&
          format(new Date(match.date), "yyyy-MM-dd") !== filterDate
        ) {
          return false;
        }
        if (
          filterPlayerId &&
          !match.teamA.playerIds.includes(filterPlayerId) &&
          !match.teamB.playerIds.includes(filterPlayerId)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matches, filterDate, filterPlayerId]);

  const paginatedMatches = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMatches.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMatches, currentPage]);

  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setFilterDate("");
    setFilterPlayerId("all");
    setCurrentPage(1);
  };

  if (matches.length === 0) {
    return (
      <p className="text-muted-foreground">
        No matches recorded yet. Play some games and log them!
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-xl flex items-center">
              <Filter className="mr-2 h-5 w-5" /> Filters
            </CardTitle>
            {(filterDate || filterPlayerId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-primary"
              >
                <X className="mr-1 h-4 w-4" /> Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-date" className="text-sm font-medium">
              Date
            </label>
            <Input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="filter-player" className="text-sm font-medium">
              Player
            </label>
            <Select
              value={filterPlayerId}
              onValueChange={(value) => {
                setFilterPlayerId(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {paginatedMatches.length > 0 ? (
        <div className="space-y-4">
          {paginatedMatches.map((match) => (
            <Card key={match.id} className="shadow-md overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {match.teamA.playerIds.map(getPlayerName).join(" & ")} vs{" "}
                      {match.teamB.playerIds.map(getPlayerName).join(" & ")}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />{" "}
                      {format(new Date(match.date), "PPP")}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      match.winningTeamIds.length > 0 ? "default" : "secondary"
                    }
                    className="shrink-0"
                  >
                    {match.teamA.score} - {match.teamB.score}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="flex items-center font-semibold mb-2">
                    <Award className="h-4 w-4 mr-2 text-yellow-500" />
                    Winner:{" "}
                    {match.winningTeamIds.map(getPlayerName).join(" & ")}
                  </p>
                  <h4 className="font-medium mb-1 text-muted-foreground">
                    Goals per player:
                  </h4>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {match.playerGoals
                      .filter((pg) => pg.goals > 0)
                      .map((pg) => (
                        <li key={pg.playerId}>
                          {getPlayerName(pg.playerId)}:{" "}
                          <span className="font-semibold">{pg.goals}</span>{" "}
                          goal(s)
                        </li>
                      ))}
                    {match.playerGoals.filter((pg) => pg.goals > 0).length ===
                      0 && (
                      <li>
                        No specific goals recorded for players in this match.
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          No matches found for the selected filters.
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
