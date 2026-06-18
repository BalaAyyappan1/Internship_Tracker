const express = require("express");
const router  = express.Router();
const runController = require("../controllers/run.controller");

// ── Trigger a full scrape run ─────────────────────────────────────────────────
router.post("/run",    runController.triggerRun); // POST /api/run

// ── Server-Sent Events stream for live progress ───────────────────────────────
router.get("/events",  runController.sseEvents);  // GET  /api/events

module.exports = router;
