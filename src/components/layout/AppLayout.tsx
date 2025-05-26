"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from "../ui/sidebar";
import { Button } from "../ui/button";
import { Home, Users, Swords, UsersRound, Settings, Bot } from "lucide-react"; // Added Bot for AI
import { PuckPalLogo } from "./PuckPalLogo";
import { AvatarFallback, Avatar, AvatarImage } from "../ui/avatar";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/players", label: "Players", icon: Users },
  { href: "/matches", label: "Matches", icon: Swords },
  { href: "/teams", label: "Teams & AI", icon: Bot },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="border-r" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <PuckPalLogo className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">
              PuckPal
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={{
                      children: item.label,
                      side: "right",
                      className: "ml-2",
                    }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          {/* User Avatar or Settings */}
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src="https://placehold.co/40x40.png"
                alt="User"
                data-ai-hint="avatar person"
              />
              <AvatarFallback>PP</AvatarFallback>
            </Avatar>
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium">PuckPal User</p>
              <p className="text-xs text-muted-foreground">Game On!</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm">
          <SidebarTrigger className="md:hidden" /> {/* Mobile toggle */}
          <h1 className="text-lg font-semibold md:text-xl">
            {navItems.find((item) => pathname === item.href)?.label ||
              "PuckPal"}
          </h1>
          {/* Add any header actions here, e.g., theme toggle, notifications */}
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
