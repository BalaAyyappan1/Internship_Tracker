"use client";

import { useState } from "react";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

const STATUS_OPTIONS = ["ALL", "OPEN", "CLOSED", "UNKNOWN"];
const TYPE_OPTIONS   = [
  "ALL", "Bulge Bracket", "Boutique", "Big 4",
  "Consulting", "Private Equity", "Hedge Fund", "Technology",
];
const REGION_OPTIONS = ["ALL", "Global", "Americas", "EMEA", "Asia-Pacific"];
const SORT_OPTIONS   = [
  { label: "Last Changed",  value: "last_changed_at"  },
  { label: "Last Checked",  value: "last_checked_at"  },
  { label: "Name A–Z",      value: "name"              },
  { label: "Status",        value: "current_status"   },
];

export interface FilterState {
  status: string;
  type:   string;
  region: string;
  search: string;
  sort:   string;
}

interface FiltersProps {
  onChange: (filters: FilterState) => void;
}

export default function Filters({ onChange }: FiltersProps) {
  const [status, setStatus] = useState("ALL");
  const [type,   setType]   = useState("ALL");
  const [region, setRegion] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort,   setSort]   = useState("last_changed_at");

  function emit(patch: Partial<FilterState>) {
    const next: FilterState = { status, type, region, search, sort, ...patch };
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          id="filter-search"
          type="text"
          placeholder="Search firms…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); emit({ search: e.target.value }); }}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition"
        />
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            id={`filter-status-${s.toLowerCase()}`}
            onClick={() => { setStatus(s); emit({ status: s }); }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              status === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Type dropdown */}
      <div className="flex items-center gap-1.5">
        <FunnelIcon className="size-3.5 shrink-0 text-zinc-500" />
        <select
          id="filter-type"
          value={type}
          onChange={(e) => { setType(e.target.value); emit({ type: e.target.value }); }}
          className="appearance-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-600 transition cursor-pointer"
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
        className="appearance-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-600 transition cursor-pointer"
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
        className="appearance-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-600 transition cursor-pointer"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>Sort: {o.label}</option>
        ))}
      </select>
    </div>
  );
}
