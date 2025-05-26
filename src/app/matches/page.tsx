"use client";

import { RecordMatchForm } from "@/components/matches/RecordMatchForm";
import { MatchHistory } from "@/components/matches/MatchHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, History } from "lucide-react";

export default function MatchesPage() {
  return (
    <Tabs defaultValue="record" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        <TabsTrigger value="record">
          <Flame className="mr-2 h-4 w-4" />
          Record Match
        </TabsTrigger>
        <TabsTrigger value="history">
          <History className="mr-2 h-4 w-4" />
          Match History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="record">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Record New Match</CardTitle>
            <CardDescription>Log the details of your latest clusterPuck99 game.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecordMatchForm />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="history">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Match History</CardTitle>
            <CardDescription>Browse through all previously recorded matches.</CardDescription>
          </CardHeader>
          <CardContent>
            <MatchHistory />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
