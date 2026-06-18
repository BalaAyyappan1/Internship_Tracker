// Centralised API client — all fetch calls go through here
// Base URL comes from NEXT_PUBLIC_API_URL in .env.local

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Firm {
  id: number;
  name: string;
  type: string;
  region: string;
  url: string;
  selector: string | null;
  scrape_method: string;
  open_signal: string | null;
  closed_signal: string | null;
  detection_strategy: string;
  current_status: "OPEN" | "CLOSED" | "UNKNOWN";
  last_checked_at: string | null;
  last_changed_at: string | null;
  active: number;
  created_at: string;
}

export interface HistoryEntry {
  id: number;
  firm_id: number;
  status: string;
  page_hash: string | null;
  detected_by: string;
  raw_snippet: string | null;
  checked_at: string;
}

export interface Stats {
  statusCounts: { status: string; count: number }[];
  typeCounts: { type: string; count: number }[];
  recentChanges: {
    name: string;
    type: string;
    status: string;
    detected_by: string;
    checked_at: string;
  }[];
  cronRuns: {
    id: number;
    started_at: string;
    finished_at: string | null;
    firms_checked: number;
    firms_changed: number;
    errors: number;
    status: string;
  }[];
  total: number;
}

export interface Health {
  status: string;
  firms: number;
  cronRunning: boolean;
  uptime: number;
}

export interface RunResult {
  ok: boolean;
  message: string;
}

export interface CheckResult {
  result: {
    firmId: number;
    name: string;
    status: string;
    changed: boolean;
    detectedBy: string;
    error?: string;
  };
  firm: Firm;
}

// ─── Firms ──────────────────────────────────────────────────────────────────

export const getFirms = (params?: {
  status?: string;
  type?: string;
  region?: string;
  search?: string;
  sort?: string;
}) => {
  const qs = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()
    : "";
  return apiFetch<{ firms: Firm[]; total: number }>(`/api/firms${qs}`);
};

export const getFirm = (id: number) =>
  apiFetch<Firm>(`/api/firms/${id}`);

export const createFirm = (body: Partial<Firm>) =>
  apiFetch<Firm>("/api/firms", { method: "POST", body: JSON.stringify(body) });

export const updateFirm = (id: number, body: Partial<Firm>) =>
  apiFetch<Firm>(`/api/firms/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteFirm = (id: number) =>
  apiFetch<{ ok: boolean; message: string }>(`/api/firms/${id}`, { method: "DELETE" });

export const getFirmHistory = (id: number, limit = 50) =>
  apiFetch<{ history: HistoryEntry[]; total: number }>(`/api/firms/${id}/history?limit=${limit}`);

export const checkFirmNow = (id: number) =>
  apiFetch<CheckResult>(`/api/firms/${id}/check`, { method: "POST" });

// ─── Run ────────────────────────────────────────────────────────────────────

export const triggerRun = () =>
  apiFetch<RunResult>("/api/run", { method: "POST" });

// ─── Stats / Health ─────────────────────────────────────────────────────────

export const getStats = () => apiFetch<Stats>("/api/stats");
export const getHealth = () => apiFetch<Health>("/api/health");

// ─── SSE helper ─────────────────────────────────────────────────────────────

export function createEventSource(
  onMessage: (event: string, data: unknown) => void
): EventSource {
  const es = new EventSource(`${BASE_URL}/api/events`);

  es.onmessage = (e) => {
    try { onMessage("message", JSON.parse(e.data)); } catch { /* noop */ }
  };

  ["status", "run_started", "progress", "run_complete", "run_error"].forEach((ev) => {
    es.addEventListener(ev, (e) => {
      try { onMessage(ev, JSON.parse((e as MessageEvent).data)); } catch { /* noop */ }
    });
  });

  return es;
}
