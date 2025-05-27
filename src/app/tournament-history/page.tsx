"use client";

import React, { useState, useEffect } from "react";
import {
  getCompletedTournaments,
  deleteTournament,
} from "@/services/tournamentService";
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
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
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

export default function TournamentHistoryPage() {
  const [completedTournaments, setCompletedTournaments] = useState<
    StoredTournament[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournamentToDeleteId, setTournamentToDeleteId] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

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
          detailedMessage = err.message;
        }
        setError(detailedMessage);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  const handleDeleteClick = (tournamentId: string) => {
    setTournamentToDeleteId(tournamentId);
  };

  const confirmDeleteTournament = async () => {
    if (!tournamentToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteTournament(tournamentToDeleteId);
      setCompletedTournaments((prev) =>
        prev.filter((t) => t.id !== tournamentToDeleteId)
      );
      toast({
        title: "Turnir Izbrisan",
        description: "Odabrani turnir je uspješno izbrisan",
      });
      setTournamentToDeleteId(null);
    } catch (error) {
      console.error("Greška u brisanju turnira:", error);
      toast({
        title: "Greška u Brisanju Turnira",
        description:
          error instanceof Error && error.message
            ? error.message
            : "Turnir nije uspješno izbrisan.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Učitavanje historije turnira...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive-foreground bg-destructive/10 p-6 rounded-lg">
        <Trophy className="h-12 w-12 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">
          Greška u učitavanju historije turnira
        </h2>
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
          Završite turnir na stranici 'Turniri' i pojavit će se ovdje.
        </p>
        <Link href="/tournament" passHref>
          <Button variant="outline" className="mt-4">
            Idi na stranicu Turniri
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
            Pregledajte sve završene turnire. Kliknite na turnir da pogledate
            njegove detalje.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {completedTournaments.map((tournament) => (
          <Card
            key={tournament.id}
            className="shadow-md hover:shadow-lg transition-shadow duration-300 h-full flex flex-col"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <Link
                  href={`/tournament-history/${tournament.id}`}
                  passHref
                  legacyBehavior
                >
                  <a className="block hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg flex-grow">
                    <CardTitle className="text-xl truncate flex items-center">
                      <Trophy className="mr-2 h-5 w-5 text-yellow-500 flex-shrink-0" />
                      {tournament.tournamentName}
                    </CardTitle>
                  </a>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(tournament.id)}
                  className="text-destructive hover:text-destructive/80 h-8 w-8 shrink-0 ml-2"
                  aria-label="Delete tournament"
                  disabled={
                    isDeleting && tournamentToDeleteId === tournament.id
                  }
                >
                  {isDeleting && tournamentToDeleteId === tournament.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
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
                    ? "Round-Robin Liga"
                    : "Pojedinačna Eliminacija"}
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
              <Link
                href={`/tournament-history/${tournament.id}`}
                passHref
                legacyBehavior
              >
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a>
                    Vidi Detalje <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={!!tournamentToDeleteId}
        onOpenChange={(open) => !open && setTournamentToDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši Turnir?</AlertDialogTitle>
            <AlertDialogDescription>
              Jeste li sigurni da želite izbrisati ovaj turnir? Ova akcija ne
              može se poništiti. Statistika igrača u PuckPal-u NEĆE biti
              pogođena, jer ovo samo briše turnir rekord.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setTournamentToDeleteId(null)}
              disabled={isDeleting}
            >
              Odustani
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTournament}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Izbriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
