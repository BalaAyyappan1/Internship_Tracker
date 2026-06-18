const firmModel    = require("../models/firm.model");
const historyModel = require("../models/history.model");
const { checkFirm } = require("../services/scraper.service");

// ─── GET /api/firms ───────────────────────────────────────────────────────────
async function listFirms(req, res) {
  try {
    const { status, type, region, search, sort } = req.query;
    const firms = await firmModel.findAll({ status, type, region, search, sort });
    res.json({ firms, total: firms.length });
  } catch (err) {
    console.error("[Controller] listFirms:", err.message);
    res.status(500).json({ error: "Failed to retrieve firms" });
  }
}

// ─── GET /api/firms/:id ───────────────────────────────────────────────────────
async function getFirm(req, res) {
  try {
    const firm = await firmModel.findById(req.params.id);
    if (!firm) return res.status(404).json({ error: "Firm not found" });
    res.json(firm);
  } catch (err) {
    console.error("[Controller] getFirm:", err.message);
    res.status(500).json({ error: "Failed to retrieve firm" });
  }
}

// ─── POST /api/firms ──────────────────────────────────────────────────────────
async function createFirm(req, res) {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: "name and url are required" });
    }

    const firm = await firmModel.create(req.body);
    res.status(201).json(firm);
  } catch (err) {
    console.error("[Controller] createFirm:", err.message);
    res.status(500).json({ error: "Failed to create firm" });
  }
}

// ─── PATCH /api/firms/:id ─────────────────────────────────────────────────────
async function updateFirm(req, res) {
  try {
    const existing = await firmModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Firm not found" });

    if (!Object.keys(req.body).length) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    const updated = await firmModel.updateById(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("[Controller] updateFirm:", err.message);
    res.status(500).json({ error: "Failed to update firm" });
  }
}

// ─── DELETE /api/firms/:id ────────────────────────────────────────────────────
async function deleteFirm(req, res) {
  try {
    const existing = await firmModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Firm not found" });

    await firmModel.softDeleteById(req.params.id);
    res.json({ ok: true, message: `Firm "${existing.name}" deactivated` });
  } catch (err) {
    console.error("[Controller] deleteFirm:", err.message);
    res.status(500).json({ error: "Failed to delete firm" });
  }
}

// ─── GET /api/firms/:id/history ───────────────────────────────────────────────
async function getFirmHistory(req, res) {
  try {
    const firm = await firmModel.findById(req.params.id);
    if (!firm) return res.status(404).json({ error: "Firm not found" });

    const history = await historyModel.findByFirmId(req.params.id, req.query.limit);
    res.json({ history, total: history.length });
  } catch (err) {
    console.error("[Controller] getFirmHistory:", err.message);
    res.status(500).json({ error: "Failed to retrieve history" });
  }
}

// ─── POST /api/firms/:id/check ─────────────────────────────────────────────────
async function checkFirmNow(req, res) {
  try {
    const firm = await firmModel.findById(req.params.id);
    if (!firm) return res.status(404).json({ error: "Firm not found" });

    const result  = await checkFirm(firm);
    const updated = await firmModel.findById(req.params.id);
    res.json({ result, firm: updated });
  } catch (err) {
    console.error("[Controller] checkFirmNow:", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listFirms,
  getFirm,
  createFirm,
  updateFirm,
  deleteFirm,
  getFirmHistory,
  checkFirmNow,
};
