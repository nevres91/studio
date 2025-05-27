"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type {
  TournamentScheduleItem,
  StoredTournament,
} from "@/lib/tournamentTypes"; // Added StoredTournament
import { useToast } from "@/hooks/use-toast";

interface RecordTournamentMatchDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  match: TournamentScheduleItem | null;
  tournamentId: string | null;
  onResultSaved: (updatedTournament: StoredTournament) => void; // Changed to expect StoredTournament
}

// Helper to parse participants from match string "P1 vs P2" or "P1 vs. P2"
const parseParticipants = (matchString: string): string[] | null => {
  if (!matchString) return null;
  // This regex looks for "Player Name 1 vs Player Name 2" or "Player Name 1 vs. Player Name 2"
  // It tries to capture names that might contain spaces, assuming " vs " or " vs. " (with spaces) is the separator.
  const parts = matchString.split(/\s+vs\.?\s+/i); // Added \.? to make the period optional
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return [parts[0].trim(), parts[1].trim()];
  }
  return null;
};

export function RecordTournamentMatchDialog({
  isOpen,
  onOpenChange,
  match,
  tournamentId,
  onResultSaved,
}: RecordTournamentMatchDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectWinner = async (winnerName: string) => {
    if (!match || !tournamentId) return;

    setIsLoading(true);
    try {
      const { recordMatchWinner } = await import(
        "@/services/tournamentService"
      );
      const updatedTournament = await recordMatchWinner(
        tournamentId,
        match.id,
        winnerName
      ); // This returns StoredTournament
      toast({
        title: "Result Saved!",
        description: `${winnerName} recorded as winner for: ${match.match}`,
      });
      onResultSaved(updatedTournament); // Pass the full updated tournament object
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving match result:", error);
      toast({
        title: "Error Saving Result",
        description:
          error instanceof Error && error.message
            ? error.message
            : "Could not save match result.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  let dialogParticipants: string[] | null = null;

  if (match) {
    console.log(
      "[Dialog] Match object received:",
      JSON.stringify(match, null, 2)
    );
    if (match.participants && match.participants.length === 2) {
      dialogParticipants = match.participants;
      console.log(
        "[Dialog] Using match.participants directly:",
        dialogParticipants
      );
    } else {
      console.log(
        "[Dialog] match.participants not usable (length !== 2 or undefined/null). Value:",
        match.participants
      );
      if (match.match) {
        dialogParticipants = parseParticipants(match.match);
        console.log(
          `[Dialog] Fallback: parseParticipants("${match.match}") result:`,
          dialogParticipants
        );
      } else {
        console.log("[Dialog] Fallback: match.match is also undefined/null.");
      }
    }
  }

  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Match Result</DialogTitle>
          <DialogDescription>
            Select the winner for the match:{" "}
            <span className="font-semibold">{match.match}</span>
            {match.round && (
              <span className="block text-xs text-muted-foreground">
                Round: {match.round}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {dialogParticipants && dialogParticipants.length === 2 ? (
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">Who won?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleSelectWinner(dialogParticipants![0])}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogParticipants[0]}
              </Button>
              <Button
                onClick={() => handleSelectWinner(dialogParticipants![1])}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialogParticipants[1]}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Winner selection for this match format is not automatically
              available. This usually means the participants are not yet
              determined (e.g., "Winner of Match X vs Winner of Match Y") or the
              AI could not clearly identify two distinct players for this
              specific match entry.
              {match?.match && !parseParticipants(match.match) && (
                <span className="block mt-2 text-xs">
                  Debug: Parser failed for match string "{match.match}".
                </span>
              )}
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
