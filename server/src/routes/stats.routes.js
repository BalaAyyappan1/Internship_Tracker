const express = require("express");
const router  = express.Router();
const statsController = require("../controllers/stats.controller");

// ── Aggregate statistics ──────────────────────────────────────────────────────
router.get("/stats",  statsController.getStats);  // GET /api/stats

// ── Service health check ──────────────────────────────────────────────────────
router.get("/health", statsController.getHealth); // GET /api/health

module.exports = router;
