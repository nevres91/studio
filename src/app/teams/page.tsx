"use client";

import { SuggestTeams } from "@/components/teams/SuggestTeams";
import { TeamCombinationsStats } from "@/components/teams/TeamCombinationsStats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, BarChartBig } from "lucide-react";

export default function TeamsPage() {
  return (
    <Tabs defaultValue="suggest" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        <TabsTrigger value="suggest">
          <Bot className="mr-2 h-4 w-4" />
          Preporuči Tim (AI)
        </TabsTrigger>
        <TabsTrigger value="stats">
          <BarChartBig className="mr-2 h-4 w-4" />
          Statistika Timova
        </TabsTrigger>
      </TabsList>
      <TabsContent value="suggest">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">AI Generator Timova</CardTitle>
            <CardDescription>
              Pomoću umjetne inteligencije kreiraj preporuke za balansirane
              timove na osnovu performansi igrača.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SuggestTeams />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="stats">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">
              Statistika Kombinacije Timova
            </CardTitle>
            <CardDescription>
              Performanse svih mogućih 2v3 mečeva
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamCombinationsStats />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
