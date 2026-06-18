"use client";

import { useState } from "react";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

const STATUS_OPTIONS = ["ALL", "OPEN", "CLOSED", "UNKNOWN"];
const TYPE_OPTIONS = [
  "ALL", "Bulge Bracket", "Boutique", "Big 4",
  "Consulting", "Private Equity", "Hedge Fund", "Technology",
];
const REGION_OPTIONS = ["ALL", "Global", "Americas", "EMEA", "Asia-Pacific"];
const SORT_OPTIONS = [
  { label: "Last Changed", value: "last_changed_at" },
  { label: "Last Checked", value: "last_checked_at" },
  { label: "Name A–Z", value: "name" },
  { label: "Status", value: "current_status" },
];

export interface FilterState {
  status: string;
  type: string;
  region: string;
  search: string;
  sort: string;
}

interface FiltersProps {
  onChange: (filters: FilterState) => void;
}

export default function Filters({ onChange }: FiltersProps) {
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [region, setRegion] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("last_changed_at");

  function emit(patch: Partial<FilterState>) {
    const next: FilterState = { status, type, region, search, sort, ...patch };
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          id="filter-search"
          type="text"
          placeholder="Search firms…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); emit({ search: e.target.value }); }}
          className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-3 text-xs text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            id={`filter-status-${s.toLowerCase()}`}
            onClick={() => { setStatus(s); emit({ status: s }); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${status === s ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Type dropdown */}
      <div className="flex items-center gap-1.5">
        <FunnelIcon className="size-3.5 shrink-0 text-zinc-400" />
        <select
          id="filter-type"
          value={type}
          onChange={(e) => { setType(e.target.value); emit({ type: e.target.value }); }}
          className="cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>
          ))}
        </select>
      </div>

      {/* Region dropdown */}
      <select
        id="filter-region"
        value={region}
        onChange={(e) => { setRegion(e.target.value); emit({ region: e.target.value }); }}
        className="cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      >
        {REGION_OPTIONS.map((r) => (
          <option key={r} value={r}>{r === "ALL" ? "All Regions" : r}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        id="filter-sort"
        value={sort}
        onChange={(e) => { setSort(e.target.value); emit({ sort: e.target.value }); }}
        className="cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>Sort: {o.label}</option>
        ))}
      </select>
    </div>
  );
}
