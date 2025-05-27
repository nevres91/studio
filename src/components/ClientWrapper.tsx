"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { PuckPalDataProvider } from "@/contexts/PuckPalDataProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/toaster";

interface ClientWrapperProps {
  children: ReactNode;
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  // This component's sole purpose is to ensure client-side context providers
  // and layout are set up correctly. The PuckPalDataProvider itself
  // handles its own mounted/initialized state for rendering.

  return (
    <PuckPalDataProvider>
      <AppLayout>{children}</AppLayout>
      <Toaster />
    </PuckPalDataProvider>
  );
}
