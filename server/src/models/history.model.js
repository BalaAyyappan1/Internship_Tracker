const { getPool } = require("../config/db.config");

// ─── Insert a scrape result into history ──────────────────────────────────────
async function create({ firm_id, status, page_hash = null, detected_by = "keyword", raw_snippet = null }) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO status_history (firm_id, status, page_hash, detected_by, raw_snippet)
     VALUES (?, ?, ?, ?, ?)`,
    [firm_id, status, page_hash, detected_by, raw_snippet]
  );
  return result.insertId;
}

// ─── Fetch paginated history for a single firm ────────────────────────────────
async function findByFirmId(firmId, limit = 50) {
  const pool = getPool();
  const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
  const [rows] = await pool.query(
    "SELECT * FROM status_history WHERE firm_id = ? ORDER BY checked_at DESC LIMIT ?",
    [firmId, safeLimit]
  );
  return rows;
}

// ─── Get the most recent entry for a firm (used in Tier-2 hash check) ─────────
async function findLatestByFirmId(firmId) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM status_history WHERE firm_id = ? ORDER BY checked_at DESC LIMIT 1",
    [firmId]
  );
  return rows[0] || null;
}

// ─── Recent changes across all firms (stats endpoint) ─────────────────────────
async function findRecentChanges(days = 7, limit = 20) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT f.name, f.type, h.status, h.detected_by, h.checked_at
     FROM status_history h
     JOIN firms f ON f.id = h.firm_id
     WHERE h.checked_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     ORDER BY h.checked_at DESC
     LIMIT ?`,
    [days, limit]
  );
  return rows;
}

module.exports = {
  create,
  findByFirmId,
  findLatestByFirmId,
  findRecentChanges,
};
