"use client";

import { Firm } from "@/lib/api";

interface StatusBadgeProps {
  status: Firm["current_status"];
  size?: "sm" | "md";
}

const CONFIG = {
  OPEN: { label: "Open", dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", bg: "bg-emerald-50" },
  CLOSED: { label: "Closed", dot: "bg-red-500", text: "text-red-700", ring: "ring-red-200", bg: "bg-red-50" },
  UNKNOWN: { label: "Unknown", dot: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200", bg: "bg-amber-50" },
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
