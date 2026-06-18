"use client";

import { Stats } from "@/lib/api";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string; // tailwind text color class
}

export function StatCard({ label, value, sub, accent = "text-white" }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

interface StatsRowProps {
  stats: Stats;
}

export function StatsRow({ stats }: StatsRowProps) {
  const open    = stats.statusCounts.find((s) => s.status === "OPEN")?.count    ?? 0;
  const closed  = stats.statusCounts.find((s) => s.status === "CLOSED")?.count  ?? 0;
  const unknown = stats.statusCounts.find((s) => s.status === "UNKNOWN")?.count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Firms"    value={stats.total}  accent="text-zinc-100" />
      <StatCard label="Open"           value={open}         accent="text-emerald-400" />
      <StatCard label="Closed"         value={closed}       accent="text-red-400" />
      <StatCard label="Unknown"        value={unknown}      accent="text-amber-400" />
    </div>
  );
}
