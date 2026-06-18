/**
 * Internship Tracker — Express server entry point
 *
 * Boot order:
 *  1. Load environment variables
 *  2. Initialise MySQL schema (CREATE TABLE IF NOT EXISTS + seed)
 *  3. Mount API routes
 *  4. Register cron job
 *  5. Start HTTP server
 */

require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const cron       = require("node-cron");
const { initDb, connectDb } = require("./src/config/db.config");

// ─── Route modules ────────────────────────────────────────────────────────────
const firmRoutes  = require("./src/routes/firm.routes");
const runRoutes   = require("./src/routes/run.routes");
const statsRoutes = require("./src/routes/stats.routes");

// ─── Run controller (for cron ↔ SSE integration) ─────────────────────────────
const {
  broadcast,
  isCronRunning,
  setCronRunning,
} = require("./src/controllers/run.controller");

const { checkAllFirms } = require("./src/services/scraper.service");

// ─── App setup ────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Mount API routes ─────────────────────────────────────────────────────────
app.use("/api/firms",  firmRoutes);   // /api/firms, /api/firms/:id, /api/firms/:id/history, /api/firms/:id/check
app.use("/api",        runRoutes);    // /api/run, /api/events
app.use("/api",        statsRoutes);  // /api/stats, /api/health

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error("[App] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Cron job — scheduled scrape run ─────────────────────────────────────────
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 * * * *"; // default: every hour

cron.schedule(
  CRON_SCHEDULE,
  async () => {
    if (isCronRunning()) {
      console.log("[Cron] Previous run still in progress — skipping this tick");
      return;
    }

    console.log(`[Cron] Starting scheduled run at ${new Date().toISOString()}`);
    setCronRunning(true);
    broadcast("run_started", { at: new Date().toISOString(), scheduled: true });

    try {
      const summary = await checkAllFirms({
        concurrency: parseInt(process.env.SCRAPE_CONCURRENCY, 10) || 5,
        onProgress:  (progress) => broadcast("progress", progress),
      });
      broadcast("run_complete", { ...summary, scheduled: true });
    } catch (err) {
      console.error("[Cron] Run failed:", err.message);
      broadcast("run_error", { error: err.message });
    } finally {
      setCronRunning(false);
    }
  },
  { timezone: "Europe/London" }
);

console.log(`[Cron] Scheduled: "${CRON_SCHEDULE}" (Europe/London)`);

// ─── Bootstrap: connect DB → init schema → start server ──────────────────────
(async () => {
  try {
    await connectDb();
    await initDb();

    app.listen(PORT, () => {
      console.log(`[Server] Listening on http://localhost:${PORT}`);
      console.log(`[Server] Cron schedule: ${CRON_SCHEDULE}`);
      console.log("[Server] Routes:");
      console.log("  GET  /api/firms");
      console.log("  POST /api/firms");
      console.log("  GET  /api/firms/:id");
      console.log("  PATCH  /api/firms/:id");
      console.log("  DELETE /api/firms/:id");
      console.log("  GET  /api/firms/:id/history");
      console.log("  POST /api/firms/:id/check");
      console.log("  POST /api/run");
      console.log("  GET  /api/events");
      console.log("  GET  /api/stats");
      console.log("  GET  /api/health");
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err.message);
    process.exit(1);
  }
})();
