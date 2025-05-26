"use client";

import { RecordMatchForm } from "@/components/matches/RecordMatchForm";
import { MatchHistory } from "@/components/matches/MatchHistory";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, History } from "lucide-react";

export default function MatchesPage() {
  return (
    <Tabs defaultValue="record" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
        <TabsTrigger value="record">
          <Flame className="mr-2 h-4 w-4" />
          Snimi Meč
        </TabsTrigger>
        <TabsTrigger value="history">
          <History className="mr-2 h-4 w-4" />
          Historija Mečeva
        </TabsTrigger>
      </TabsList>
      <TabsContent value="record">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Snimi Novi Meč</CardTitle>
            <CardDescription>
              Zapiši detalje novog ClusterPuck99 meča.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecordMatchForm />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="history">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Historija Meča</CardTitle>
            <CardDescription>
              Pregledaj sve prethodno snimljene mečeve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MatchHistory />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
