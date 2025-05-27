"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  WandSparkles,
  Users,
  Trophy,
  X,
  PlusCircle,
  ListChecks,
  FilePlus,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  generateTournamentStructure,
  type GenerateTournamentInput,
  type GenerateTournamentOutput,
} from "@/ai/flows/generate-tournament-flow";
import { useToast } from "@/hooks/use-toast";
import {
  saveTournament,
  getLatestTournament,
  finalizeTournament,
  recordMatchWinner,
} from "@/services/tournamentService";
import type {
  StoredTournament,
  TournamentScheduleItem,
} from "@/lib/tournamentTypes";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { RecordTournamentMatchDialog } from "@/components/tournament/RecordTournamentMatchDialog";
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

// Zod schema for client-side form validation
const TournamentPageFormSchema = z.object({
  playerNames: z
    .array(z.string().min(1, { message: "Player name cannot be empty." }))
    .min(2, {
      message: "At least two players are required for the tournament.",
    })
    .max(16, { message: "Maximum of 16 players allowed for this tool." }),
  tournamentType: z.enum(["round-robin-league", "single-elimination-bracket"], {
    required_error: "Please select a tournament type.",
  }),
  scoringSystem: z.string().min(5, {
    message: "Scoring system description must be at least 5 characters.",
  }),
});

// Type for form inputs will be inferred from TournamentPageFormSchema by useForm

export default function TournamentPage() {
  const { players: allAppPlayers, isInitialized: puckPalInitialized } =
    usePuckPal();
  const { toast } = useToast();
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isLoadingTournament, setIsLoadingTournament] = useState(true);
  const [activeTournament, setActiveTournament] =
    useState<StoredTournament | null>(null);

  const [isRecordResultDialogOpen, setIsRecordResultDialogOpen] =
    useState(false);
  const [selectedMatchForRecord, setSelectedMatchForRecord] =
    useState<TournamentScheduleItem | null>(null);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<z.infer<typeof TournamentPageFormSchema>>({
    resolver: zodResolver(TournamentPageFormSchema),
    defaultValues: {
      playerNames: [],
      tournamentType: "round-robin-league",
      scoringSystem: "Pobjednik: 2 poena, Gubitnik: 1 poen",
    },
  });

  // @ts-ignore
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "playerNames",
  });

  const fetchLatestTournament = useCallback(async () => {
    setIsLoadingTournament(true);
    try {
      const latestTournament = await getLatestTournament();
      if (latestTournament) {
        setActiveTournament(latestTournament);
      }
    } catch (error) {
      console.error("Failed to load latest tournament:", error);
      let description = "Could not load existing tournament data.";
      if (
        error instanceof Error &&
        error.message.includes("index is required")
      ) {
        description =
          "Error: A Firestore index is required. Please check the console logs for a link to create it, then refresh.";
      } else if (error instanceof Error) {
        description = error.message;
      }
      toast({
        title: "Greška u učitavanju Turnira",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoadingTournament(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLatestTournament();
  }, [fetchLatestTournament]);

  const handleAddPlayer = () => {
    if (fields.length < 16) {
      append("");
    } else {
      toast({
        title: "Max broj igrača dostignut.",
        description: "Možete dodati do 16 igrača.",
        variant: "destructive",
      });
    }
  };

  const handlePopulateFromExisting = () => {
    if (!puckPalInitialized) {
      toast({
        title: "Podatci o igraču nisu još učitani.",
        description: "Molimo sačekajte momenat i pokušajte ponovo.",
        variant: "destructive",
      });
      return;
    }
    const currentPlayersNames = allAppPlayers.map((p) => p.name);
    replace(currentPlayersNames.slice(0, 16));
    toast({
      title: "Igrači Popunjeni",
      description: `Popunjeno sa ${Math.min(
        currentPlayersNames.length,
        16
      )} postojećih igrača`,
    });
  };

  const handleNewTournamentForm = () => {
    setActiveTournament(null);
    reset({
      playerNames: [],
      tournamentType: "round-robin-league",
      scoringSystem: "Pobjednik: 2 poena, Gubitnik: 1 poen",
    });
  };

  const onSubmit = async (data: z.infer<typeof TournamentPageFormSchema>) => {
    setIsLoadingAi(true);
    try {
      // Data structure from form (z.infer<typeof TournamentPageFormSchema>)
      // is compatible with GenerateTournamentInput for these fields.
      const aiResult = await generateTournamentStructure(data);
      const newlyCreatedTournament = await saveTournament(aiResult, data);

      if (newlyCreatedTournament) {
        setActiveTournament(newlyCreatedTournament);
        toast({
          title: "Turnir Generisan i Snimljen.",
          description: `Umjetna inteligencija je dizajnirala "${newlyCreatedTournament.tournamentName}".`,
        });
      } else {
        throw new Error(
          "Failed to get newly created tournament data after saving."
        );
      }
    } catch (error) {
      console.error("Error generating or saving tournament:", error);
      toast({
        title: "Operation Error",
        description:
          error instanceof Error && error.message
            ? error.message
            : "Could not complete tournament operation.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleMatchClick = (matchItem: TournamentScheduleItem) => {
    console.log("Match clicked:", JSON.stringify(matchItem, null, 2));
    console.log("Active tournament status:", activeTournament?.overallStatus);
    console.log(
      "Is loading tournament (for match click):",
      isLoadingTournament
    );

    if (activeTournament?.overallStatus !== "completed") {
      setSelectedMatchForRecord(matchItem);
      setIsRecordResultDialogOpen(true);
      console.log("Record result dialog should open for match:", matchItem.id);
    } else {
      const description = `Tournament is completed. Results cannot be changed. Match: "${
        matchItem.match
      }", current winner: ${matchItem.winner || "None"}.`;
      toast({ title: "Informacije o Meču", description, variant: "default" });
      console.log("Dialog not opened. Reason:", description);
    }
  };

  const handleResultSaved = (updatedTournament: StoredTournament) => {
    setActiveTournament(updatedTournament);
    console.log(
      "Tournament data updated in state after saving result for ID:",
      updatedTournament.id
    );
    toast({ title: "Result Saved", description: "Match result updated." });
  };

  const handleFinalizeTournament = async () => {
    if (
      !activeTournament ||
      activeTournament.overallStatus === "completed" ||
      !allMatchesCompleted
    ) {
      toast({
        title: "Nemoguće Završiti",
        description:
          "Svi mečevi moraju imati pobjednika da bi se turnir završio.",
        variant: "destructive",
      });
      setIsFinalizeDialogOpen(false);
      return;
    }
    setIsLoadingTournament(true);
    try {
      const finalizedTournament = await finalizeTournament(activeTournament.id);
      setActiveTournament(finalizedTournament);
      toast({
        title: "Turnir Završen!",
        description: `"${finalizedTournament.tournamentName}" je označen kao završen.`,
      });
      setIsFinalizeDialogOpen(false);
    } catch (error) {
      console.error("Error finalizing tournament:", error);
      toast({
        title: "Greška u Završetku",
        description:
          error instanceof Error && error.message
            ? error.message
            : "Turnir nije uspješno završen",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTournament(false);
    }
  };

  const allMatchesCompleted = useMemo(() => {
    if (
      !activeTournament ||
      !activeTournament.schedule ||
      activeTournament.schedule.length === 0
    ) {
      return false;
    }
    return activeTournament.schedule.every(
      (match) => match.status === "completed" && !!match.winner
    );
  }, [activeTournament]);

  if (isLoadingTournament && !activeTournament) {
    return (
      <div className="flex justify-center items-center p-8 min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">
          Učitavanje turnira...
        </p>
      </div>
    );
  }

  if (activeTournament) {
    return (
      <div className="space-y-6">
        <Card className="shadow-xl animate-in fade-in duration-500">
          <CardHeader>
            <div className="flex justify-between items-start flex-col md:flex-row space-y-3 md:space-y-0">
              <CardTitle className="text-2xl flex items-center">
                <Trophy className="mr-2 h-7 w-7 text-primary" />
                {activeTournament.tournamentName}
              </CardTitle>
              <div className="flex gap-2">
                {activeTournament.overallStatus !== "completed" && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!allMatchesCompleted) {
                        toast({
                          title: "Nemoguće Završiti",
                          description:
                            "Svi mečevi moraju imati snimljenog pobjednika.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsFinalizeDialogOpen(true);
                    }}
                    size="sm"
                    disabled={isLoadingTournament || !allMatchesCompleted}
                    title={
                      !allMatchesCompleted
                        ? "Svi mečevi moraju imati pobjednika da bi se turnir završio"
                        : "Završi turnir"
                    }
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" /> Završi Turnir
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleNewTournamentForm}
                  size="sm"
                  disabled={isLoadingAi || isLoadingTournament}
                >
                  <FilePlus className="mr-2 h-4 w-4" /> Kreiraj Novi
                </Button>
              </div>
            </div>
            <CardDescription>{activeTournament.description}</CardDescription>
            <div className="text-xs text-muted-foreground pt-2 space-y-0.5">
              <p>
                Tip:{" "}
                <span className="font-medium">
                  {activeTournament.tournamentType === "round-robin-league"
                    ? "Round-Robin Liga"
                    : "Pojedinačna Eliminacija"}
                </span>
              </p>
              <p>
                Bodovi:{" "}
                <span className="font-medium">
                  {activeTournament.scoringSystem}
                </span>
              </p>
              <p>
                Igrači:{" "}
                <span className="font-medium">
                  {Array.isArray(activeTournament.playerNames)
                    ? activeTournament.playerNames.join(", ")
                    : "N/A"}
                </span>
              </p>
              <p>
                Status:{" "}
                <span className="capitalize font-medium">
                  {activeTournament.overallStatus}
                </span>{" "}
                (Kreiran:{" "}
                {activeTournament.createdAt
                  ? format(activeTournament.createdAt.toDate(), "PPP p")
                  : "N/A"}
                )
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-1.5 sm:px-6">
            <div>
              <h4 className="font-semibold text-lg mb-2 flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-primary/80" />
                Raspored / Mečevi
              </h4>
              {activeTournament.schedule &&
              activeTournament.schedule.length > 0 ? (
                <div className="space-y-2">
                  {activeTournament.schedule.map((item) => (
                    <Button
                      key={item.id}
                      variant={
                        item.status === "completed" ? "secondary" : "outline"
                      }
                      className="w-full justify-start text-left h-auto py-2 px-3 block shadow-sm hover:shadow-md transition-shadow relative"
                      onClick={() => handleMatchClick(item)}
                      disabled={
                        isLoadingTournament ||
                        activeTournament.overallStatus === "completed"
                      }
                    >
                      <div className="flex justify-between items-center">
                        <p
                          className={`font-medium text-sm ${
                            item.status === "completed"
                              ? "text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {item.round ? `Runda ${item.round} - ` : ``}Meč:
                        </p>
                        {item.status === "completed" && item.winner && (
                          <span className="text-xs font-semibold text-green-600 flex items-center">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Pobjednik:{" "}
                            {item.winner}
                          </span>
                        )}
                        {item.status === "pending" &&
                          activeTournament.overallStatus !== "completed" && (
                            <span className="text-xs text-amber-600 flex items-center">
                              <HelpCircle className="h-3 w-3 mr-1" /> Čekanje
                              Rezultata
                            </span>
                          )}
                        {item.status === "completed" &&
                          !item.winner &&
                          activeTournament.overallStatus !== "completed" && (
                            <span className="text-xs text-orange-500 flex items-center">
                              <HelpCircle className="h-3 w-3 mr-1" /> Završeno
                              (Nema Pobjednika?)
                            </span>
                          )}
                        {item.status === "completed" &&
                          activeTournament.overallStatus === "completed" &&
                          !item.winner && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <HelpCircle className="h-3 w-3 mr-1" /> Rezultat
                              N/A
                            </span>
                          )}
                      </div>
                      <p className="font-semibold text-base mt-1">
                        {item.match}
                      </p>
                      {item.participants && item.participants.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Igrači: {item.participants.join(" vs ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.notes}
                        </p>
                      )}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Nema specifičnog rasporeda generisanog za ovaj turnir.
                </p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-1">
                Pozicije / Objašnjenje
              </h4>
              <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">
                {activeTournament.standingsExplanation}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-1">
                Napredovanje / Winner Determination
              </h4>
              <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">
                {activeTournament.advancementRules}
              </p>
            </div>
            {activeTournament.tieBreakingRules && (
              <div>
                <h4 className="font-semibold text-lg mb-1">
                  Tie-Breaking Pravila
                </h4>
                <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">
                  {activeTournament.tieBreakingRules}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        {activeTournament && selectedMatchForRecord && (
          <RecordTournamentMatchDialog
            isOpen={isRecordResultDialogOpen}
            onOpenChange={setIsRecordResultDialogOpen}
            match={selectedMatchForRecord}
            tournamentId={activeTournament.id}
            onResultSaved={handleResultSaved}
          />
        )}
        <AlertDialog
          open={isFinalizeDialogOpen}
          onOpenChange={setIsFinalizeDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Završi Turnir?</AlertDialogTitle>
              <AlertDialogDescription>
                Da li ste sigurni da želite završiti "
                {activeTournament.tournamentName}"? Jednom kad završite turnir,
                rezultati meča više ne mogu biti izmijenjeni.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoadingTournament}>
                Odustani
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFinalizeTournament}
                disabled={isLoadingTournament || !allMatchesCompleted}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isLoadingTournament ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Završi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // AI Generation Form
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Trophy className="mr-2 h-6 w-6 text-primary" />
            AI Planer Turnira
          </CardTitle>
          <CardDescription>
            Dizajniraj osobni turnir ili ligu. Neka umjetna inteligencija kreira
            fer i uzbudljivu strukturu baziranu na vašim željama.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label className="flex items-center mb-1">
                <Users className="mr-2 h-4 w-4 text-primary/80" /> Imena Igrača
              </Label>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Controller
                      name={`playerNames.${index}`}
                      control={control}
                      render={({ field: controllerField }) => (
                        <Input
                          {...controllerField}
                          value={
                            typeof controllerField.value === "string"
                              ? controllerField.value
                              : ""
                          }
                          placeholder={`Player ${index + 1} Name`}
                          className={
                            formErrors.playerNames?.[index]?.message
                              ? "border-destructive"
                              : ""
                          }
                        />
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formErrors.playerNames &&
                  typeof formErrors.playerNames.message === "string" && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.playerNames.message}
                    </p>
                  )}
                {Array.isArray(formErrors.playerNames) &&
                  formErrors.playerNames.map((err, i) => {
                    // Assuming err can be an object with a message property, or undefined
                    const fieldError = err as { message?: string } | undefined;
                    return (
                      fieldError?.message && (
                        <p
                          key={`err-${i}`}
                          className="text-sm text-destructive mt-1"
                        >
                          Igrač {i + 1}: {fieldError.message}
                        </p>
                      )
                    );
                  })}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPlayer}
                  disabled={isLoadingAi || fields.length >= 16}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Dodaj Igrača
                </Button>
                {puckPalInitialized && allAppPlayers.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePopulateFromExisting}
                    disabled={isLoadingAi || !puckPalInitialized}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Popuni (
                    {allAppPlayers.length})
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Minimalno 2 igrača. Max 16 za ovaj alat.
              </p>
            </div>

            <div>
              <Label htmlFor="tournamentType">Tip Turnira</Label>
              <Controller
                name="tournamentType"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingAi}
                  >
                    <SelectTrigger
                      id="tournamentType"
                      className={
                        formErrors.tournamentType ? "border-destructive" : ""
                      }
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round-robin-league">
                        Round-Robin Liga
                      </SelectItem>
                      <SelectItem value="single-elimination-bracket">
                        Pojedinačna Eliminacija
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {formErrors.tournamentType && (
                <p className="text-sm text-destructive mt-1">
                  {formErrors.tournamentType.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="scoringSystem">Opis sistema bodovanja</Label>
              <Controller
                name="scoringSystem"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="scoringSystem"
                    placeholder="E.g., Winner: 3 pts, Draw: 1 pt, Loser: 0 pts. For brackets: Win advances, loser is eliminated."
                    rows={3}
                    className={
                      formErrors.scoringSystem ? "border-destructive" : ""
                    }
                    disabled={isLoadingAi}
                    {...field}
                  />
                )}
              />
              {formErrors.scoringSystem && (
                <p className="text-sm text-destructive mt-1">
                  {formErrors.scoringSystem.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoadingAi}
              size="lg"
              className="w-full md:w-auto"
            >
              {isLoadingAi ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 h-4 w-4" />
              )}
              Kreiraj Turnir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
