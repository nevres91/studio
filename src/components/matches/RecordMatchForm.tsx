"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import type { Player, PlayerMatchStats, GeneratedMatchup } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  AlertCircle,
  Loader2,
  Goal,
  ShieldOff,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent, CardHeader } from "../ui/card";

const recordMatchSchema = z
  .object({
    date: z.preprocess(
      (arg) => {
        if (typeof arg === "string" || arg instanceof Date) {
          const d = new Date(arg);
          return !isNaN(d.getTime()) ? d : arg;
        }
        return arg;
      },
      z
        .date({
          required_error: "Match date is required.",
          invalid_type_error: "A valid date is required.",
        })
        .refine((date) => date instanceof Date && !isNaN(date.getTime()), {
          message: "The selected date is invalid.",
        })
    ),
    selectedMatchupId: z.string().min(1, "Please select a matchup."),
    maxScore: z.number().min(1).max(10).default(10),
    teamAScore: z
      .number({
        required_error: "Team A score is required.",
        invalid_type_error: "Team A score must be a number.",
      })
      .min(0, "Score must be 0 or greater.")
      .default(0),
    teamBScore: z
      .number({
        required_error: "Team B score is required.",
        invalid_type_error: "Team B score must be a number.",
      })
      .min(0, "Score must be 0 or greater.")
      .default(0),
    playerStats: z
      .array(
        z.object({
          playerId: z.string(),
          goals: z.number().min(0, "Goals cannot be less than 0."),
          autoGoals: z.number().min(0, "Auto goals cannot be less than 0."),
          checks: z.number().min(0, "Checks cannot be less than 0."),
        })
      )
      .default([]),
  })
  .refine(
    (data) => {
      const teamAScore = data.teamAScore ?? 0;
      const maxScore = data.maxScore ?? 10;
      return teamAScore <= maxScore;
    },
    (data) => ({
      message: `Team A score (${
        data.teamAScore ?? 0
      }) cannot exceed selected max score of ${data.maxScore ?? 10}.`,
      path: ["teamAScore"],
    })
  )
  .refine(
    (data) => {
      const teamBScore = data.teamBScore ?? 0;
      const maxScore = data.maxScore ?? 10;
      return teamBScore <= maxScore;
    },
    (data) => ({
      message: `Team B score (${
        data.teamBScore ?? 0
      }) cannot exceed selected max score of ${data.maxScore ?? 10}.`,
      path: ["teamBScore"],
    })
  )
  .refine(
    (data) => {
      const teamAScore = data.teamAScore ?? 0;
      const teamBScore = data.teamBScore ?? 0;
      const maxScore = data.maxScore ?? 10;
      if (teamAScore === maxScore || teamBScore === maxScore) {
        return teamAScore !== teamBScore;
      }
      return true;
    },
    (data) => ({
      message: `Match scores cannot be a draw if one team has reached the max score of ${
        data.maxScore ?? 10
      }.`,
      path: ["root"],
    })
  )
  .refine(
    (data) => {
      const teamAScore = data.teamAScore ?? 0;
      const teamBScore = data.teamBScore ?? 0;
      const maxScore = data.maxScore ?? 10;
      return teamAScore === maxScore || teamBScore === maxScore;
    },
    (data) => ({
      message: `To save the match, one team's score must be exactly ${
        data.maxScore ?? 10
      }. Current scores: A=${data.teamAScore ?? 0}, B=${data.teamBScore ?? 0}.`,
      path: ["root"],
    })
  )
  .superRefine((data, ctx) => {
    const playerStatsArray = data.playerStats || [];
    const maxScore = data.maxScore ?? 10;
    playerStatsArray.forEach((ps, index) => {
      if (ps.goals > maxScore) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: maxScore,
          type: "number",
          inclusive: true,
          message: `Player goals (${ps.goals}) cannot exceed selected max score of ${maxScore}.`,
          path: [`playerStats`, index, `goals`],
        });
      }
    });
  });

type RecordMatchFormData = z.infer<typeof recordMatchSchema>;

export function RecordMatchForm() {
  const {
    players,
    addMatch,
    getGeneratedMatchups,
    isInitialized: puckPalIsInitialized,
  } = usePuckPal();
  const { toast } = useToast();
  const [availableMatchups, setAvailableMatchups] = useState<
    GeneratedMatchup[]
  >([]);
  const [selectedMatchup, setSelectedMatchup] =
    useState<GeneratedMatchup | null>(null);
  const [allPlayersInMatch, setAllPlayersInMatch] = useState<Player[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecordMatchFormData>({
    resolver: zodResolver(recordMatchSchema),
    defaultValues: {
      date: new Date(),
      selectedMatchupId: "",
      maxScore: 10,
      teamAScore: 0,
      teamBScore: 0,
      playerStats: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "playerStats",
  });

  useEffect(() => {
    if (puckPalIsInitialized) {
      setAvailableMatchups(getGeneratedMatchups());
    }
  }, [puckPalIsInitialized, getGeneratedMatchups]);

  const selectedMatchupId = watch("selectedMatchupId");
  const currentMaxScore = watch("maxScore");

  useEffect(() => {
    if (selectedMatchupId && puckPalIsInitialized) {
      const matchup = availableMatchups.find((m) => m.id === selectedMatchupId);
      setSelectedMatchup(matchup || null);
      if (matchup) {
        const teamAPlayers = matchup.teamA.playerIds
          .map((id) => players.find((p) => p.id === id))
          .filter(Boolean) as Player[];
        const teamBPlayers = matchup.teamB.playerIds
          .map((id) => players.find((p) => p.id === id))
          .filter(Boolean) as Player[];
        const currentMatchPlayers = [...teamAPlayers, ...teamBPlayers];
        setAllPlayersInMatch(currentMatchPlayers);

        const initialStats = currentMatchPlayers.map((player) => ({
          playerId: player.id,
          goals: 0,
          autoGoals: 0,
          checks: 0,
        }));
        replace(initialStats);
      } else {
        setAllPlayersInMatch([]);
        replace([]);
      }
    } else {
      setSelectedMatchup(null);
      setAllPlayersInMatch([]);
      replace([]);
    }
  }, [
    selectedMatchupId,
    availableMatchups,
    players,
    replace,
    puckPalIsInitialized,
  ]);

  const onSubmit = (data: RecordMatchFormData) => {
    console.log(
      "RecordMatchForm onSubmit - Raw data received:",
      JSON.stringify(data, null, 2)
    );

    if (Object.keys(data).length === 0 && data.constructor === Object) {
      console.error(
        "RecordMatchForm onSubmit received an empty data object. This indicates a form collection issue."
      );
      toast({
        title: "Form Submission Error",
        description:
          "Could not read form data. Please ensure all fields are correctly filled and try again.",
        variant: "destructive",
      });
      return;
    }

    const finalTeamAScore =
      typeof data.teamAScore === "number" ? data.teamAScore : 0;
    const finalTeamBScore =
      typeof data.teamBScore === "number" ? data.teamBScore : 0;

    if (!selectedMatchup) {
      toast({
        title: "Error",
        description: "No matchup selected. Please select a matchup.",
        variant: "destructive",
      });
      return;
    }

    const playerStatsForCalc = data.playerStats || [];

    const currentTeamAPlayers = selectedMatchup.teamA.playerIds;
    const currentTeamBPlayers = selectedMatchup.teamB.playerIds;

    const directGoalsTeamA = playerStatsForCalc
      .filter((ps) => currentTeamAPlayers.includes(ps.playerId))
      .reduce((sum, ps) => sum + (ps.goals || 0), 0);
    const autoGoalsForTeamA = playerStatsForCalc
      .filter((ps) => currentTeamBPlayers.includes(ps.playerId))
      .reduce((sum, ps) => sum + (ps.autoGoals || 0), 0);
    const effectiveTotalGoalsTeamA = directGoalsTeamA + autoGoalsForTeamA;

    const directGoalsTeamB = playerStatsForCalc
      .filter((ps) => currentTeamBPlayers.includes(ps.playerId))
      .reduce((sum, ps) => sum + (ps.goals || 0), 0);
    const autoGoalsForTeamB = playerStatsForCalc
      .filter((ps) => currentTeamAPlayers.includes(ps.playerId))
      .reduce((sum, ps) => sum + (ps.autoGoals || 0), 0);
    const effectiveTotalGoalsTeamB = directGoalsTeamB + autoGoalsForTeamB;

    if (effectiveTotalGoalsTeamA !== finalTeamAScore) {
      toast({
        title: "Score Mismatch (Team A)",
        description: `Team A's score (${finalTeamAScore}) does not match sum of their player goals (${directGoalsTeamA}) + opponent auto-goals (${autoGoalsForTeamA}) = ${effectiveTotalGoalsTeamA}. Please review.`,
        variant: "destructive",
      });
      return;
    }
    if (effectiveTotalGoalsTeamB !== finalTeamBScore) {
      toast({
        title: "Score Mismatch (Team B)",
        description: `Team B's score (${finalTeamBScore}) does not match sum of their player goals (${directGoalsTeamB}) + opponent auto-goals (${autoGoalsForTeamB}) = ${effectiveTotalGoalsTeamB}. Please review.`,
        variant: "destructive",
      });
      return;
    }

    let dateForMatch: Date;
    if (data.date instanceof Date && !isNaN(data.date.getTime())) {
      dateForMatch = data.date;
    } else {
      console.warn(
        "RecordMatchForm: onSubmit: data.date was invalid or not a Date object. Defaulting to current date for addMatch.",
        data.date
      );
      dateForMatch = new Date();
    }

    addMatch(
      dateForMatch,
      currentTeamAPlayers,
      finalTeamAScore,
      currentTeamBPlayers,
      finalTeamBScore,
      playerStatsForCalc
    );

    let dateForToast: Date;
    if (data.date instanceof Date && !isNaN(data.date.getTime())) {
      dateForToast = data.date;
    } else {
      console.warn(
        "RecordMatchForm: onSubmit: data.date was invalid or not a Date object. Defaulting to current date for toast.",
        data.date
      );
      dateForToast = new Date();
    }

    toast({
      title: "Match Saved!",
      description: `Match on ${format(dateForToast, "PPP")} has been saved.`,
    });
    reset();
    setSelectedMatchup(null);
    setAllPlayersInMatch([]);
  };

  if (!puckPalIsInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading player data...</p>
      </div>
    );
  }

  if (players.length < 5 && puckPalIsInitialized) {
    return (
      <div className="flex items-center gap-2 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-md text-yellow-700 dark:text-yellow-300">
        <AlertCircle className="h-5 w-5" />
        <p>
          Not enough players to form standard 2v3 teams. Please ensure there are
          5 players available.
        </p>
      </div>
    );
  }

  if (
    availableMatchups.length === 0 &&
    players.length >= 5 &&
    puckPalIsInitialized
  ) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">
          Generating team matchups...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="date">Date</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value &&
                    field.value instanceof Date &&
                    !isNaN(field.value.getTime()) ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      field.value instanceof Date &&
                      !isNaN(field.value.getTime())
                        ? field.value
                        : undefined
                    }
                    onSelect={(newDate) =>
                      field.onChange(newDate || new Date())
                    }
                    initialFocus
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.date && (
            <p className="text-sm text-destructive mt-1">
              {errors.date.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="matchup">Matchup (Team A vs Team B)</Label>
          <Controller
            name="selectedMatchupId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a matchup" />
                </SelectTrigger>
                <SelectContent>
                  {availableMatchups.map((matchup) => (
                    <SelectItem key={matchup.id} value={matchup.id}>
                      {matchup.teamA.name} vs {matchup.teamB.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.selectedMatchupId && (
            <p className="text-sm text-destructive mt-1">
              {errors.selectedMatchupId.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="maxScore">Max Score per Game</Label>
          <Controller
            name="maxScore"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(val) => field.onChange(parseInt(val))}
                value={String(field.value)}
              >
                <SelectTrigger id="maxScore">
                  <SelectValue placeholder="Select max score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Points</SelectLabel>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(
                      (score) => (
                        <SelectItem key={score} value={String(score)}>
                          {score}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          {errors.maxScore && (
            <p className="text-sm text-destructive mt-1">
              {errors.maxScore.message}
            </p>
          )}
        </div>
      </div>

      {selectedMatchup && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Team Scores</h3>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <Label htmlFor="teamAScore">
                  {selectedMatchup.teamA.name} Score
                </Label>
                <Controller
                  name="teamAScore"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={0}
                      max={currentMaxScore || 10}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  )}
                />
                {errors.teamAScore && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.teamAScore.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="teamBScore">
                  {selectedMatchup.teamB.name} Score
                </Label>
                <Controller
                  name="teamBScore"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={0}
                      max={currentMaxScore || 10}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  )}
                />
                {errors.teamBScore && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.teamBScore.message}
                  </p>
                )}
              </div>
            </div>
            {errors.root && errors.root.message && (
              <p className="text-sm text-destructive mt-2">
                {errors.root.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {allPlayersInMatch.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Player Stats for this Match</h3>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ScrollArea className="h-[250px] rounded-md">
              <div className="space-y-6 p-1">
                {fields.map((item, index) => {
                  const player = allPlayersInMatch.find(
                    (p) => p.id === item.playerId
                  );
                  return player ? (
                    <div
                      key={item.id}
                      className="space-y-2 p-3 border rounded-md shadow-sm"
                    >
                      <Label
                        htmlFor={`playerStats.${index}.goals`}
                        className="font-semibold text-md"
                      >
                        {player.name}
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label
                            htmlFor={`playerStats.${index}.goals`}
                            className="text-xs flex items-center"
                          >
                            <Goal className="mr-1 h-3 w-3" />
                            Goals
                          </Label>
                          <Controller
                            name={`playerStats.${index}.goals`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                className="w-full mt-1"
                                min={0}
                                max={currentMaxScore || 10}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            )}
                          />
                          {errors.playerStats?.[index]?.goals && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.playerStats[index]?.goals?.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label
                            htmlFor={`playerStats.${index}.autoGoals`}
                            className="text-xs flex items-center"
                          >
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Auto Goals
                          </Label>
                          <Controller
                            name={`playerStats.${index}.autoGoals`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                className="w-full mt-1"
                                min={0}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            )}
                          />
                          {errors.playerStats?.[index]?.autoGoals && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.playerStats[index]?.autoGoals?.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label
                            htmlFor={`playerStats.${index}.checks`}
                            className="text-xs flex items-center"
                          >
                            <Zap className="mr-1 h-3 w-3" />
                            Checks
                          </Label>
                          <Controller
                            name={`playerStats.${index}.checks`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                className="w-full mt-1"
                                min={0}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            )}
                          />
                          {errors.playerStats?.[index]?.checks && (
                            <p className="text-sm text-destructive mt-1">
                              {errors.playerStats[index]?.checks?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </ScrollArea>
            {errors.playerStats &&
              typeof errors.playerStats.message === "string" && (
                <p className="text-sm text-destructive mt-1">
                  {errors.playerStats.message}
                </p>
              )}
          </CardContent>
        </Card>
      )}

      <Button type="submit" size="lg" className="w-full md:w-auto">
        Save Match
      </Button>
    </form>
  );
}
