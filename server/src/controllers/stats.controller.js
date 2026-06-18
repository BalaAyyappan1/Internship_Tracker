const firmModel    = require("../models/firm.model");
const historyModel = require("../models/history.model");
const cronRunModel = require("../models/cronRun.model");
const { isCronRunning } = require("./run.controller");

// ─── GET /api/stats ───────────────────────────────────────────────────────────
async function getStats(req, res) {
  try {
    const [statusCounts, typeCounts, recentChanges, cronRuns, total] =
      await Promise.all([
        firmModel.getStatusCounts(),
        firmModel.getTypeCounts(),
        historyModel.findRecentChanges(7, 20),
        cronRunModel.findRecent(10),
        firmModel.getTotalActive(),
      ]);

    res.json({ statusCounts, typeCounts, recentChanges, cronRuns, total });
  } catch (err) {
    console.error("[Controller] getStats:", err.message);
    res.status(500).json({ error: "Failed to retrieve stats" });
  }
}

// ─── GET /api/health ──────────────────────────────────────────────────────────
async function getHealth(req, res) {
  try {
    const firmCount = await firmModel.getTotalActive();
    res.json({
      status:     "ok",
      firms:      firmCount,
      cronRunning: isCronRunning(),
      uptime:     process.uptime(),
    });
  } catch (err) {
    console.error("[Controller] getHealth:", err.message);
    res.status(500).json({ status: "error", error: err.message });
  }
}

module.exports = { getStats, getHealth };
