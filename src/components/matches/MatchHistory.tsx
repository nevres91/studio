"use client";

import React, { useState, useMemo } from "react";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import type { Match, PlayerMatchStats } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  CalendarDays,
  Award,
  Trash2,
  Loader2,
  ListChecks,
  Goal,
  ShieldOff,
  Zap,
} from "lucide-react"; // Added Goal, ShieldOff, Zap
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 5;

export function MatchHistory() {
  const { matches, players, getPlayerById, deleteMatch } = usePuckPal();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [matchToDeleteId, setMatchToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const getPlayerName = (id: string) =>
    getPlayerById(id)?.name || "Unknown Player";

  const sortedMatches = useMemo(() => {
    return [...matches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [matches]);

  const paginatedMatches = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedMatches.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedMatches, currentPage]);

  const totalPages = Math.ceil(sortedMatches.length / ITEMS_PER_PAGE);

  const handleDeleteClick = (matchId: string) => {
    setMatchToDeleteId(matchId);
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteMatch(matchToDeleteId);
      toast({
        title: "Match Deleted",
        description:
          "The match has been successfully deleted and player stats updated.",
      });
      setMatchToDeleteId(null);
      const newTotalPages = Math.ceil(
        (sortedMatches.length - 1) / ITEMS_PER_PAGE
      );
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newTotalPages === 0) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error Deleting Match",
        description: "Could not delete the match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-muted/20 min-h-[200px]">
        <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Matches Recorded</h3>
        <p className="text-muted-foreground">
          Play some games and log them to see your match history here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {paginatedMatches.length > 0 ? (
        <div className="space-y-4">
          {paginatedMatches.map((match) => (
            <Card key={match.id} className="shadow-md overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <CardTitle className="text-lg">
                      {match.teamA.playerIds.map(getPlayerName).join(" & ")} vs{" "}
                      {match.teamB.playerIds.map(getPlayerName).join(" & ")}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1 text-xs">
                      <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />{" "}
                      {format(new Date(match.date), "PPP, p")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        match.winningTeamIds.length > 0
                          ? "default"
                          : "secondary"
                      }
                      className="shrink-0"
                    >
                      {match.teamA.score} - {match.teamB.score}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(match.id)}
                      className="text-destructive hover:text-destructive/80 h-8 w-8"
                    >
                      {isDeleting && matchToDeleteId === match.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="sr-only">Delete match</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-3">
                  <div className="flex items-center font-semibold">
                    <Award className="h-4 w-4 mr-2 text-yellow-500" />
                    Winner:
                    <span className="ml-1">
                      {match.winningTeamIds.length > 0
                        ? match.winningTeamIds.map(getPlayerName).join(" & ")
                        : "N/A (Draw or Unrecorded)"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1 text-muted-foreground">
                      Player Stats for this Match:
                    </h4>
                    <ul className="space-y-1 pl-1 text-xs">
                      {match.playerStats && match.playerStats.length > 0 ? (
                        match.playerStats.map((ps) => (
                          <li
                            key={ps.playerId}
                            className="grid grid-cols-4 gap-x-2 items-center"
                          >
                            <span className="col-span-1 font-medium">
                              {getPlayerName(ps.playerId)}:
                            </span>
                            <span className="flex items-center">
                              <Goal className="h-3 w-3 mr-1 text-green-500" />
                              G:{" "}
                              <span className="font-semibold ml-1">
                                {ps.goals}
                              </span>
                            </span>
                            <span className="flex items-center">
                              <ShieldOff className="h-3 w-3 mr-1 text-red-500" />
                              AG:{" "}
                              <span className="font-semibold ml-1">
                                {ps.autoGoals || 0}
                              </span>
                            </span>
                            <span className="flex items-center">
                              <Zap className="h-3 w-3 mr-1 text-blue-500" />
                              C:{" "}
                              <span className="font-semibold ml-1">
                                {ps.checks || 0}
                              </span>
                            </span>
                          </li>
                        ))
                      ) : (
                        <li>Player stats not available for this match.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          No matches found.
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

      <AlertDialog
        open={!!matchToDeleteId}
        onOpenChange={(open) => !open && setMatchToDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              match and recalculate all player statistics based on the remaining
              matches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setMatchToDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMatch}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
