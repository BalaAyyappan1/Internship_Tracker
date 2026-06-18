import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Internship Tracker — Live Application Status",
  description:
    "Real-time tracker for summer internship application windows across top investment banks, consulting firms, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-zinc-950 text-zinc-200 antialiased">{children}</body>
    </html>
  );
}
