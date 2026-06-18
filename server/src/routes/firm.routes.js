const express = require("express");
const router  = express.Router();
const firmController = require("../controllers/firm.controller");

// ── List / create firms ───────────────────────────────────────────────────────
router.get("/",    firmController.listFirms);   // GET  /api/firms
router.post("/",   firmController.createFirm);  // POST /api/firms

// ── Single firm operations ────────────────────────────────────────────────────
router.get("/:id",      firmController.getFirm);     // GET    /api/firms/:id
router.patch("/:id",    firmController.updateFirm);  // PATCH  /api/firms/:id
router.delete("/:id",   firmController.deleteFirm);  // DELETE /api/firms/:id

// ── History + on-demand check ─────────────────────────────────────────────────
router.get("/:id/history", firmController.getFirmHistory); // GET  /api/firms/:id/history
router.post("/:id/check",  firmController.checkFirmNow);   // POST /api/firms/:id/check

module.exports = router;
