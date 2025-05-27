"use client";

import React, { useState, useMemo } from "react";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { CalendarDays, Award, Filter, X, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 5;

export function MatchHistory() {
  const { matches, players, getPlayerById, deleteMatch } = usePuckPal();
  const { toast } = useToast();
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterPlayerId, setFilterPlayerId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [matchToDeleteId, setMatchToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  const handleDeleteClick = (matchId: string) => {
    setMatchToDeleteId(matchId);
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteMatch(matchToDeleteId);
      toast({
        title: "Meč Izbrisan",
        description:
          "Meč je uspješno izbrisan i statistika igrača je ažurirana.",
      });
      setMatchToDeleteId(null); // Close dialog by resetting the ID
      // If current page becomes empty after deletion, go to previous page
      if (paginatedMatches.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Greška u brisanju meča",
        description: "Meč nije izbrisan. Pokušaj opet",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (matches.length === 0) {
    return (
      <p className="text-muted-foreground">
        Nema snimljenih Mečeva. Odigraj nekoliko igara i zabavi se.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-xl flex items-center">
              <Filter className="mr-2 h-5 w-5" /> Filteri
            </CardTitle>
            {(filterDate || filterPlayerId) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-primary"
              >
                <X className="mr-1 h-4 w-4" /> Očisti Filtere
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-date" className="text-sm font-medium">
              Datum
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
              Igrač
            </label>
            <Select
              value={filterPlayerId}
              onValueChange={(value) => {
                setFilterPlayerId(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Svi Igrači" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi Igrači</SelectItem>
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
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Izbriši Meč</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="flex items-center font-semibold mb-2">
                    <Award className="h-4 w-4 mr-2 text-yellow-500" />
                    <span className="text-yellow-600">Pobjednik: </span>{" "}
                    {match.winningTeamIds.map(getPlayerName).join(" & ")}
                  </p>
                  <h4 className="font-medium mb-1 text-muted-foreground">
                    Golovi po igraču:
                  </h4>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {match.playerGoals
                      .filter((pg) => pg.goals > 0)
                      .map((pg) => (
                        <li key={pg.playerId}>
                          {getPlayerName(pg.playerId)}:{" "}
                          <span className="font-semibold">{pg.goals}</span>{" "}
                        </li>
                      ))}
                    {match.playerGoals.filter((pg) => pg.goals > 0).length ===
                      0 && (
                      <li>
                        Nema specifičnih golova snimljenih za igrače u ovom
                        meču.
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
          Nema pronađenih mečeva za odabrane filtere
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
            Predhodni
          </Button>
          <span className="text-sm text-muted-foreground">
            Strana {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Sledeći
          </Button>
        </div>
      )}
      <AlertDialog
        open={!!matchToDeleteId}
        onOpenChange={(open) => !open && setMatchToDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
            <AlertDialogDescription>
              Ovo će zauvijek izbrisati odabrani meč i preračunati statistiku
              igrača na osnovu preostalih mečeva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setMatchToDeleteId(null)}
              disabled={isDeleting}
            >
              Odustani
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMatch}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Izbriši Meč
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
