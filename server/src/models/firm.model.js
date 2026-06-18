const { getPool } = require("../config/db.config");

// ─── Fetch all active firms with optional filters ─────────────────────────────
async function findAll({ status, type, region, search, sort = "last_changed_at" } = {}) {
  const pool = getPool();
  const allowedSorts = ["name", "current_status", "last_changed_at", "last_checked_at"];
  const orderCol = allowedSorts.includes(sort) ? sort : "last_changed_at";

  let sql = "SELECT * FROM firms WHERE active = 1";
  const params = [];

  if (status && status !== "ALL") {
    sql += " AND current_status = ?";
    params.push(status);
  }
  if (type && type !== "ALL") {
    sql += " AND type = ?";
    params.push(type);
  }
  if (region && region !== "ALL") {
    sql += " AND region = ?";
    params.push(region);
  }
  if (search) {
    sql += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  sql += ` ORDER BY ${orderCol} DESC`;

  const [rows] = await pool.query(sql, params);
  return rows;
}

// ─── Find a single firm by primary key ───────────────────────────────────────
async function findById(id) {
  const pool = getPool();
  const [rows] = await pool.query("SELECT * FROM firms WHERE id = ?", [id]);
  return rows[0] || null;
}

// ─── Insert a new firm ────────────────────────────────────────────────────────
async function create({ name, type = "Other", region = "Global", url, selector = null, scrape_method = "playwright", open_signal = null, closed_signal = null, detection_strategy = "hybrid" }) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO firms (name, type, region, url, selector, scrape_method, open_signal, closed_signal, detection_strategy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, type, region, url, selector, scrape_method, open_signal, closed_signal, detection_strategy]
  );
  return findById(result.insertId);
}

// ─── Partial update of a firm ─────────────────────────────────────────────────
async function updateById(id, fields) {
  const pool = getPool();
  const allowed = ["name", "type", "region", "url", "selector", "scrape_method", "open_signal", "closed_signal", "detection_strategy", "active", "current_status", "last_checked_at", "last_changed_at"];


  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!setClauses.length) return null;

  params.push(id);
  await pool.query(`UPDATE firms SET ${setClauses.join(", ")} WHERE id = ?`, params);
  return findById(id);
}

// ─── Soft-delete (set active = 0) ─────────────────────────────────────────────
async function softDeleteById(id) {
  const pool = getPool();
  await pool.query("UPDATE firms SET active = 0 WHERE id = ?", [id]);
}

// ─── Update status after a scrape ────────────────────────────────────────────
async function updateStatus(id, { newStatus, changed, now }) {
  const pool = getPool();
  await pool.query(
    `UPDATE firms
     SET current_status  = ?,
         last_checked_at = ?,
         last_changed_at = IF(?, ?, last_changed_at)
     WHERE id = ?`,
    [newStatus, now, changed ? 1 : 0, now, id]
  );
}

// ─── Status / type aggregates for stats endpoint ──────────────────────────────
async function getStatusCounts() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT current_status AS status, COUNT(*) AS count FROM firms WHERE active = 1 GROUP BY current_status"
  );
  return rows;
}

async function getTypeCounts() {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT type, COUNT(*) AS count FROM firms WHERE active = 1 GROUP BY type ORDER BY count DESC"
  );
  return rows;
}

async function getTotalActive() {
  const pool = getPool();
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM firms WHERE active = 1");
  return rows[0].total;
}

module.exports = {
  findAll,
  findById,
  create,
  updateById,
  softDeleteById,
  updateStatus,
  getStatusCounts,
  getTypeCounts,
  getTotalActive,
};
