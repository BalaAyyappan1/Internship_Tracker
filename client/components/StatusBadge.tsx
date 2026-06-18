"use client";

import { Firm } from "@/lib/api";

interface StatusBadgeProps {
  status: Firm["current_status"];
  size?: "sm" | "md";
}

const CONFIG = {
  OPEN:    { label: "Open",    dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-500/30", bg: "bg-emerald-500/10" },
  CLOSED:  { label: "Closed",  dot: "bg-red-400",     text: "text-red-300",     ring: "ring-red-500/30",     bg: "bg-red-500/10"     },
  UNKNOWN: { label: "Unknown", dot: "bg-amber-400",   text: "text-amber-300",   ring: "ring-amber-500/30",   bg: "bg-amber-500/10"   },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const c = CONFIG[status] ?? CONFIG.UNKNOWN;
  const px = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide ring-1 ${px} ${c.text} ${c.bg} ${c.ring}`}
    >
      <span className={`size-1.5 rounded-full ${c.dot} animate-pulse`} />
      {c.label}
    </span>
  );
}
