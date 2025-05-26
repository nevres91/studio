"use client";

import { SuggestTeams } from "@/components/teams/SuggestTeams";
import { TeamCombinationsStats } from "@/components/teams/TeamCombinationsStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, BarChartBig } from "lucide-react";

export default function TeamsPage() {
  return (
    <Tabs defaultValue="suggest" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        <TabsTrigger value="suggest">
          <Bot className="mr-2 h-4 w-4" />
          Suggest Teams (AI)
        </TabsTrigger>
        <TabsTrigger value="stats">
          <BarChartBig className="mr-2 h-4 w-4" />
          Team Stats
        </TabsTrigger>
      </TabsList>
      <TabsContent value="suggest">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">AI Team Suggester</CardTitle>
            <CardDescription>Get AI-powered suggestions for balanced teams based on player performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <SuggestTeams />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="stats">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Team Combination Statistics</CardTitle>
            <CardDescription>Performance of all possible 2v3 team matchups.</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamCombinationsStats />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
