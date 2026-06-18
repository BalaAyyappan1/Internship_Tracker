"use client";

import { Firm, checkFirmNow } from "@/lib/api";
import StatusBadge from "./StatusBadge";
import { useState } from "react";
import { ArrowTopRightOnSquareIcon, ArrowPathIcon, ClockIcon, GlobeAltIcon } from "@heroicons/react/24/outline";

interface FirmCardProps {
  firm: Firm;
  onUpdated: (updated: Firm) => void;
}

const TYPE_COLORS: Record<string, string> = {
  "Bulge Bracket":  "bg-violet-500/10 text-violet-300 ring-violet-500/20",
  "Boutique":       "bg-sky-500/10    text-sky-300    ring-sky-500/20",
  "Big 4":          "bg-teal-500/10   text-teal-300   ring-teal-500/20",
  "Consulting":     "bg-orange-500/10 text-orange-300 ring-orange-500/20",
  "Private Equity": "bg-pink-500/10   text-pink-300   ring-pink-500/20",
  "Hedge Fund":     "bg-cyan-500/10   text-cyan-300   ring-cyan-500/20",
  "Technology":     "bg-blue-500/10   text-blue-300   ring-blue-500/20",
};

const REGION_ICONS: Record<string, string> = {
  "Global":       "🌐",
  "Americas":     "🌎",
  "EMEA":         "🌍",
  "Asia-Pacific": "🌏",
};

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return "Just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

export default function FirmCard({ firm, onUpdated }: FirmCardProps) {
  const [checking, setChecking] = useState(false);
  const [flash, setFlash]       = useState<"changed" | "same" | null>(null);

  const typeClass   = TYPE_COLORS[firm.type]   ?? "bg-zinc-500/10 text-zinc-300 ring-zinc-500/20";
  const regionEmoji = REGION_ICONS[firm.region] ?? "🌐";

  async function handleCheck() {
    setChecking(true);
    try {
      const { firm: updated, result } = await checkFirmNow(firm.id);
      onUpdated(updated);
      setFlash(result.changed ? "changed" : "same");
      setTimeout(() => setFlash(null), 2000);
    } catch {
      // silently fail — backend logs the error
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      className={`
        relative flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-300
        bg-zinc-900/60 backdrop-blur-sm
        ${flash === "changed"
          ? "border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          : "border-zinc-800 hover:border-zinc-700 hover:shadow-[0_0_12px_rgba(255,255,255,0.04)]"}
        ${flash === "same" ? "border-zinc-600" : ""}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-100 leading-tight">{firm.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${typeClass}`}>
              {firm.type}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700/50 bg-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-400">
              {regionEmoji} {firm.region}
            </span>
          </div>
        </div>
        <StatusBadge status={firm.current_status} size="sm" />
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <ClockIcon className="size-3 shrink-0" />
        <span>Checked {formatRelative(firm.last_checked_at)}</span>
        {firm.last_changed_at && (
          <>
            <span className="text-zinc-700">·</span>
            <GlobeAltIcon className="size-3 shrink-0" />
            <span>Changed {formatRelative(firm.last_changed_at)}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          id={`check-firm-${firm.id}`}
          onClick={handleCheck}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:opacity-50"
        >
          <ArrowPathIcon className={`size-3 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "Check now"}
        </button>

        <a
          href={firm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
        >
          <ArrowTopRightOnSquareIcon className="size-3" />
          Visit
        </a>
      </div>
    </div>
  );
}
