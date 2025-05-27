"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PuckPalLogo } from "./PuckPalLogo";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarInset,
} from "@/components/ui/sidebar"; // Assuming you have these from ShadCN or similar
import { Button } from "@/components/ui/button";
import {
  Home,
  BarChart3,
  Users,
  Bot,
  Trophy,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import { usePuckPal } from "@/contexts/PuckPalDataProvider";

const navItems = [
  { href: "/", label: "Početna", icon: Home },
  { href: "/matches", label: "Mečevi", icon: BarChart3 },
  { href: "/players", label: "Igrači", icon: Users },
  { href: "/teams", label: "Timovi", icon: Bot },
  { href: "/tournament", label: "Turniri", icon: Trophy },
  { href: "/tournament-history", label: "Historija Turnira", icon: History },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isInitialized } = usePuckPal(); // Use this to potentially delay sidebar rendering if needed

  if (!isInitialized) {
    // This is a fallback, PuckPalDataProvider should handle the main loading screen
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <PuckPalLogo className="w-20 h-20 mb-5 text-primary" />
        <p>Iniciranje Šablona...</p>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <PuckPalLogo className="w-10 h-10 text-primary" />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-lg font-semibold tracking-tight text-foreground">
                PuckPal
              </span>
              <span className="text-xs text-muted-foreground">
                ClusterPuck99 Statistika
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={{
                      children: item.label,
                      side: "right",
                      align: "center",
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          {/* Example Footer Items */}
          {/* <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{ children: "Settings", side: "right", align: "center" }}>
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{ children: "Logout", side: "right", align: "center" }}>
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu> */}
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col w-full md:group-data-[collapsible=offcanvas]:pl-0 md:group-data-[collapsible=icon]:pl-[calc(var(--sidebar-width-icon)_+_1px)] transition-[padding] ease-linear">
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:justify-end">
          <SidebarTrigger className="md:hidden" />
          {/* Add any header content here, e.g., user menu */}
        </header>
        <SidebarInset>
          <main className="flex-1 p-1 sm:p-4 md:p-6 space-y-6">{children}</main>
          <footer className="p-6 pt-0 text-xs text-center text-muted-foreground">
            © {new Date().getFullYear()} PuckPal
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
