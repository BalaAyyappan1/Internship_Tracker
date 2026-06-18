import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internship Tracker — Live Application Status",
  description:
    "Real-time tracker for summer internship application windows across top investment banks, consulting firms, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
