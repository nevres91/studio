import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Changed to Inter as Geist was causing issues.
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { PuckPalDataProvider } from "@/contexts/PuckPalDataProvider";
import { Toaster } from "@/components/ui/toaster";

// Using Inter font as a more standard choice for now
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans", // Using a more generic variable name
});

export const metadata: Metadata = {
  title: "PuckPal",
  description: "Track scores for clusterPuck99!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Apply the font variable to the body or html tag */}
      <body className={`${inter.variable} font-sans antialiased`}>
        <PuckPalDataProvider>
          <AppLayout>{children}</AppLayout>
          <Toaster />
        </PuckPalDataProvider>
      </body>
    </html>
  );
}
