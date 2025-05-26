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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";
import type { Player, PlayerGoal, GeneratedMatchup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarIcon, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent } from "../ui/card";

const MAX_SCORE = 10;

const playerGoalSchema = z.object({
  playerId: z.string(),
  goals: z.number().min(0).max(MAX_SCORE),
});

const recordMatchSchema = z
  .object({
    date: z.date(),
    selectedMatchupId: z.string().min(1, "Please select a matchup."),
    teamAScore: z
      .number()
      .min(0, "Score must be 0 or greater.")
      .max(MAX_SCORE, `Score cannot exceed ${MAX_SCORE}.`),
    teamBScore: z
      .number()
      .min(0, "Score must be 0 or greater.")
      .max(MAX_SCORE, `Score cannot exceed ${MAX_SCORE}.`),
    playerGoals: z.array(playerGoalSchema),
  })
  .refine(
    (data) => {
      return data.teamAScore === MAX_SCORE || data.teamBScore === MAX_SCORE;
    },
    {
      message: `One team's score must be ${MAX_SCORE} to conclude the match.`,
      path: ["root"],
    }
  )
  .refine(
    (data) => {
      // This rule should only apply if at least one team has reached MAX_SCORE
      if (data.teamAScore === MAX_SCORE || data.teamBScore === MAX_SCORE) {
        return data.teamAScore !== data.teamBScore;
      }
      return true; // If no team is at MAX_SCORE yet, this rule passes.
    },
    {
      message: `Match scores cannot be a draw if one team has reached ${MAX_SCORE}.`,
      path: ["root"],
    }
  );

type RecordMatchFormData = z.infer<typeof recordMatchSchema>;

export function RecordMatchForm() {
  const { players, addMatch, getGeneratedMatchups } = usePuckPal();
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
    setValue,
    formState: { errors },
  } = useForm<RecordMatchFormData>({
    resolver: zodResolver(recordMatchSchema),
    defaultValues: {
      date: new Date(),
      selectedMatchupId: "",
      teamAScore: 0,
      teamBScore: 0,
      playerGoals: [],
    },
    // mode: "onSubmit" is the default
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "playerGoals",
  });

  useEffect(() => {
    setAvailableMatchups(getGeneratedMatchups());
  }, [getGeneratedMatchups]);

  const selectedMatchupId = watch("selectedMatchupId");

  useEffect(() => {
    if (selectedMatchupId) {
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

        const initialGoals = currentMatchPlayers.map((player) => ({
          playerId: player.id,
          goals: 0,
        }));
        replace(initialGoals);
      } else {
        setAllPlayersInMatch([]);
        replace([]);
      }
    } else {
      setSelectedMatchup(null);
      setAllPlayersInMatch([]);
      replace([]);
    }
  }, [selectedMatchupId, availableMatchups, players, replace]);

  const onSubmit = (data: RecordMatchFormData) => {
    if (!selectedMatchup) {
      toast({
        title: "Error",
        description: "No matchup selected.",
        variant: "destructive",
      });
      return;
    }

    addMatch(
      data.date,
      selectedMatchup.teamA.playerIds,
      data.teamAScore,
      selectedMatchup.teamB.playerIds,
      data.teamBScore,
      data.playerGoals
    );

    toast({
      title: "Match Saved!",
      description: `Match on ${format(data.date, "PPP")} has been saved.`,
    });
    reset();
    setSelectedMatchup(null);
    setAllPlayersInMatch([]);
  };

  if (players.length < 5) {
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

  if (availableMatchups.length === 0 && players.length === 5) {
    return (
      <div className="flex items-center gap-2 p-4 border-blue-500/50 bg-blue-500/10 rounded-md text-blue-700 dark:text-blue-300">
        <Users className="h-5 w-5" />
        <p>Loading team matchups...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
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
      </div>

      {selectedMatchup && (
        <Card>
          <CardContent className="p-6">
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
        <div>
          <h3 className="text-lg font-medium mb-2">Player Goals</h3>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-4">
              {fields.map((item, index) => {
                const player = allPlayersInMatch.find(
                  (p) => p.id === item.playerId
                );
                return player ? (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <Label htmlFor={`playerGoals.${index}.goals`}>
                      {player.name}
                    </Label>
                    <Controller
                      name={`playerGoals.${index}.goals`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          className="w-20"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      )}
                    />
                  </div>
                ) : null;
              })}
            </div>
          </ScrollArea>
          {(errors.playerGoals?.message ||
            errors.playerGoals?.root?.message) && (
            <p className="text-sm text-destructive mt-1">
              {errors.playerGoals.message || errors.playerGoals.root?.message}
            </p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full md:w-auto">
        Save Match
      </Button>
    </form>
  );
}
