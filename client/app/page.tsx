"use client";

import { useCallback, useEffect, useState } from "react";
import { Firm, Stats, getFirms, getStats } from "@/lib/api";
import { StatsRow } from "@/components/StatsRow";
import FirmCard from "@/components/FirmCard";
import Filters, { FilterState } from "@/components/Filters";
import RunnerPanel from "@/components/RunnerPanel";
import { BriefcaseIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface FilterState {
  status: string;
  type:   string;
  search: string;
  sort:   string;
}

export default function HomePage() {
  const [firms,   setFirms]   = useState<Firm[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: "ALL",
    type:   "ALL",
    region: "ALL",
    search: "",
    sort:   "last_changed_at",
  });

  const loadData = useCallback(async (f: FilterState = filters) => {
    try {
      setLoading(true);
      const [firmsData, statsData] = await Promise.all([
        getFirms({
          status: f.status !== "ALL" ? f.status : undefined,
          type:   f.type   !== "ALL" ? f.type   : undefined,
          region: f.region !== "ALL" ? f.region : undefined,
          search: f.search || undefined,
          sort:   f.sort,
        }),
        getStats(),
      ]);
      setFirms(firmsData.firms);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFiltersChange(f: FilterState) {
    setFilters(f);
    loadData(f);
  }

  function handleFirmUpdated(updated: Firm) {
    setFirms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  async function handleRunComplete() {
    await loadData();
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <BriefcaseIcon className="size-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-zinc-100">
                Internship Tracker
              </h1>
              <p className="text-[10px] text-zinc-500">Live application status</p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-zinc-400">Live</span>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠ {error}
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <section className="mb-6">
            <StatsRow stats={stats} />
          </section>
        )}

        {/* Runner panel */}
        <section className="mb-6">
          <RunnerPanel onRunComplete={handleRunComplete} />
        </section>

        {/* Filters */}
        <section className="mb-4">
          <Filters onChange={handleFiltersChange} />
        </section>

        {/* Grid header */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {loading ? "Loading…" : `${firms.length} firm${firms.length !== 1 ? "s" : ""}`}
          </p>
          <button
            id="refresh-btn"
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            <ArrowPathIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Firms grid */}
        {loading && firms.length === 0 ? (
          /* Skeleton */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40"
              />
            ))}
          </div>
        ) : firms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-zinc-500">
            <BriefcaseIcon className="size-10 opacity-30" />
            <p className="text-sm">No firms match your filters</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {firms.map((firm) => (
              <FirmCard key={firm.id} firm={firm} onUpdated={handleFirmUpdated} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 py-4">
        <p className="text-center text-[11px] text-zinc-600">
          Scraper runs every hour · Data is best-effort · Always verify on the firm&apos;s website
        </p>
      </footer>
    </div>
  );
}
