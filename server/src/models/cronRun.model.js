const { getPool } = require("../config/db.config");

// ─── Open a new cron run record, returns its generated ID ─────────────────────
async function createRun() {
  const pool = getPool();
  const [result] = await pool.query(
    "INSERT INTO cron_runs (firms_checked, firms_changed, errors, status) VALUES (0, 0, 0, 'running')"
  );
  return result.insertId;
}

// ─── Mark a run as completed with final counts ────────────────────────────────
async function completeRun(runId, { firms_checked, firms_changed, errors }) {
  const pool = getPool();
  await pool.query(
    `UPDATE cron_runs
     SET finished_at   = NOW(),
         firms_checked = ?,
         firms_changed = ?,
         errors        = ?,
         status        = 'completed'
     WHERE id = ?`,
    [firms_checked, firms_changed, errors, runId]
  );
}

// ─── Mark a run as failed ─────────────────────────────────────────────────────
async function failRun(runId) {
  const pool = getPool();
  await pool.query(
    "UPDATE cron_runs SET finished_at = NOW(), status = 'failed' WHERE id = ?",
    [runId]
  );
}

// ─── Fetch the N most recent runs (for stats endpoint) ───────────────────────
async function findRecent(limit = 10) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT * FROM cron_runs ORDER BY started_at DESC LIMIT ?",
    [limit]
  );
  return rows;
}

module.exports = { createRun, completeRun, failRun, findRecent };
