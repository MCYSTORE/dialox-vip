import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dialox VIP | Terminal Personal de Pronósticos",
  description: "Tu terminal personal de pronósticos con análisis IA. Picks inteligentes para fútbol, NBA y MLB.",
  keywords: ["pronósticos", "apuestas", "análisis", "IA", "fútbol", "NBA", "MLB", "picks"],
  authors: [{ name: "Dialox VIP" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚽</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F7F7F5] text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
