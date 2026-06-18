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
  "Bulge Bracket": "bg-violet-50 text-violet-700 ring-violet-200",
  "Boutique": "bg-sky-50    text-sky-700    ring-sky-200",
  "Big 4": "bg-teal-50   text-teal-700   ring-teal-200",
  "Consulting": "bg-orange-50 text-orange-700 ring-orange-200",
  "Private Equity": "bg-pink-50   text-pink-700   ring-pink-200",
  "Hedge Fund": "bg-cyan-50   text-cyan-700   ring-cyan-200",
  "Technology": "bg-blue-50   text-blue-700   ring-blue-200",
};

const REGION_ICONS: Record<string, string> = {
  "Global": "🌐",
  "Americas": "🌎",
  "EMEA": "🌍",
  "Asia-Pacific": "🌏",
};

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function FirmCard({ firm, onUpdated }: FirmCardProps) {
  const [checking, setChecking] = useState(false);
  const [flash, setFlash] = useState<"changed" | "same" | null>(null);

  const typeClass = TYPE_COLORS[firm.type] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200";
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
        bg-white shadow-sm
        ${flash === "changed"
          ? "border-emerald-400 shadow-emerald-100"
          : "border-zinc-200 hover:border-zinc-300 hover:shadow-md"}
        ${flash === "same" ? "border-zinc-300" : ""}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-950 leading-tight">{firm.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${typeClass}`}>
              {firm.type}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600">
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
          className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 hover:text-zinc-950 disabled:opacity-50"
        >
          <ArrowPathIcon className={`size-3 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "Check now"}
        </button>

        <a
          href={firm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 hover:text-zinc-950"
        >
          <ArrowTopRightOnSquareIcon className="size-3" />
          Visit
        </a>
      </div>
    </div>
  );
}
