const { checkAllFirms } = require("../services/scraper.service");

// ─── Shared SSE client registry ────────────────────────────────────────────
// Exported so the cron job in app.js can broadcast to the same set
const sseClients = new Set();
let cronRunning  = false;

function isCronRunning() {
  return cronRunning;
}

function setCronRunning(value) {
  cronRunning = value;
}

// ─── Broadcast helper (used internally + by cron job) ─────────────────────
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(message);
    } catch {
      // client disconnected — will be cleaned up on 'close'
    }
  }
}

// ─── POST /api/run — trigger a full scrape run manually ───────────────────
async function triggerRun(req, res) {
  if (cronRunning) {
    return res.status(409).json({ error: "A run is already in progress" });
  }

  cronRunning = true;
  broadcast("run_started", { at: new Date().toISOString(), scheduled: false });

  // Respond immediately so the client can subscribe to SSE
  res.json({
    ok: true,
    message: "Scrape run started. Subscribe to GET /api/events for live progress.",
  });

  // Run scraper asynchronously
  checkAllFirms({
    concurrency: parseInt(process.env.SCRAPE_CONCURRENCY, 10) || 5,
    onProgress:  (progress) => broadcast("progress", progress),
  })
    .then((summary) => {
      cronRunning = false;
      broadcast("run_complete", { ...summary, scheduled: false });
    })
    .catch((err) => {
      cronRunning = false;
      broadcast("run_error", { error: err.message });
    });
}

// ─── GET /api/events — Server-Sent Events stream ───────────────────────────
function sseEvents(req, res) {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  // Immediately inform client of current cron state
  res.write(`event: status\ndata: ${JSON.stringify({ running: cronRunning })}\n\n`);

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
}

module.exports = {
  sseClients,
  broadcast,
  isCronRunning,
  setCronRunning,
  triggerRun,
  sseEvents,
};
