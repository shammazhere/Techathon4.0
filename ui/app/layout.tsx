import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Civic Autopilot — Autonomous Disaster Response OS",
  description:
    "AI-powered autonomous city coordination platform for real-time disaster management, intelligent routing, evacuation planning, and emergency response orchestration.",
  keywords: "disaster response, AI, evacuation routing, emergency management, smart city",
  authors: [{ name: "Civic Autopilot Team" }],
  openGraph: {
    title: "Civic Autopilot — Autonomous Disaster Response OS",
    description: "Next-generation AI-powered autonomous city coordination platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="overflow-hidden h-screen w-screen">{children}</body>
    </html>
  );
}
