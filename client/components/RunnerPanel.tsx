"use client";

import { useEffect, useRef, useState } from "react";
import { triggerRun, createEventSource } from "@/lib/api";
import { PlayIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

interface RunProgress {
  checked: number;
  total:   number;
  changed: number;
  errors:  number;
}

interface RunnerPanelProps {
  onRunComplete: () => void; // refresh firms list after a run
}

export default function RunnerPanel({ onRunComplete }: RunnerPanelProps) {
  const [running,  setRunning]  = useState(false);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [lastRun,  setLastRun]  = useState<{ checked: number; changed: number; errors: number } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Connect to SSE on mount to track cron state
  useEffect(() => {
    esRef.current = createEventSource((event, data) => {
      const d = data as Record<string, number | boolean | string>;
      if (event === "status") {
        setRunning(Boolean(d.running));
      }
      if (event === "run_started") {
        setRunning(true);
        setProgress(null);
      }
      if (event === "progress") {
        setProgress(d as unknown as RunProgress);
      }
      if (event === "run_complete") {
        setRunning(false);
        setLastRun({ checked: d.checked as number, changed: d.changed as number, errors: d.errors as number });
        setProgress(null);
        onRunComplete();
      }
      if (event === "run_error") {
        setRunning(false);
        setProgress(null);
      }
    });

    return () => esRef.current?.close();
  }, [onRunComplete]);

  async function handleTrigger() {
    try {
      await triggerRun();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("already in progress")) return;
    }
  }

  const pct = progress ? Math.round((progress.checked / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Scraper Engine</p>
          <p className="text-xs text-zinc-500">
            {running ? "Running…" : "Idle — cron runs every hour"}
          </p>
        </div>
        <button
          id="trigger-run-btn"
          onClick={handleTrigger}
          disabled={running}
          className={`
            flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition
            ${running
              ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
              : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95"}
          `}
        >
          {running
            ? <ArrowPathIcon className="size-3.5 animate-spin" />
            : <PlayIcon className="size-3.5" />}
          {running ? "Running" : "Run now"}
        </button>
      </div>

      {/* Progress bar */}
      {running && progress && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-zinc-500">
            <span>{progress.checked} / {progress.total} firms checked</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-4 text-[11px] text-zinc-500">
            <span className="text-emerald-400">{progress.changed} changed</span>
            {progress.errors > 0 && <span className="text-red-400">{progress.errors} errors</span>}
          </div>
        </div>
      )}

      {/* Last run summary */}
      {!running && lastRun && (
        <p className="text-[11px] text-zinc-500">
          Last run — {lastRun.checked} checked, <span className="text-emerald-400">{lastRun.changed} changed</span>
          {lastRun.errors > 0 && <>, <span className="text-red-400">{lastRun.errors} errors</span></>}
        </p>
      )}
    </div>
  );
}
