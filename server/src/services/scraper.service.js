/**
 * Scraper service — two-tier internship status detection engine
 *
 * Tier 1 — Keyword detection  (free,  ~80% coverage)
 * Tier 2 — Hash-based change  (free,  flags unknown changes)
 */

const crypto = require("crypto");
const firmModel   = require("../models/firm.model");
const historyModel = require("../models/history.model");
const cronRunModel = require("../models/cronRun.model");


// ─── Global keyword lists ─────────────────────────────────────────────────────
const OPEN_KEYWORDS = [
  "apply now",
  "apply here",
  "submit application",
  "applications open",
  "applications are open",
  "now accepting",
  "start your application",
  "begin your application",
  "apply today",
  "applications live",
  "summer analyst programme",
  "summer associate programme",
  "internship programme",
  "recruiting now",
];

const CLOSED_KEYWORDS = [
  "applications closed",
  "applications are closed",
  "no longer accepting",
  "deadline has passed",
  "deadline passed",
  "not currently accepting",
  "check back",
  "check back later",
  "opening soon",
  "coming soon",
  "not yet open",
  "applications will open",
  "opens in",
  "0 items",
  "no results found",
  "no open positions",
];

// ─── Playwright fetch (handles JS-rendered pages) ─────────────────────────────
async function fetchWithPlaywright(url, selector) {
  // Dynamic import — server starts even if playwright is not yet installed
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

    let text;
    if (selector) {
      try {
        await page.waitForSelector(selector, { timeout: 5_000 });
        text = await page.innerText(selector);
      } catch {
        text = await page.innerText("body");
      }
    } else {
      text = await page.innerText("body");
    }

    return text;
  } finally {
    await browser.close();
  }
}

// ─── Axios fetch (static pages / known API endpoints) ────────────────────────
async function fetchWithAxios(url) {
  const axios = require("axios");

  const response = await axios.get(url, {
    timeout: 15_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml,*/*",
    },
  });

  // Strip HTML tags, collapse whitespace
  return response.data
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Tier 1: keyword detection ────────────────────────────────────────────────
function keywordDetect(text, firmOpenSignal, firmClosedSignal) {
  const normalised = text.toLowerCase();

  // Firm-specific signals take priority over global lists
  if (firmOpenSignal && normalised.includes(firmOpenSignal.toLowerCase())) return "OPEN";
  if (firmClosedSignal && normalised.includes(firmClosedSignal.toLowerCase())) return "CLOSED";

  if (OPEN_KEYWORDS.some((kw) => normalised.includes(kw))) return "OPEN";
  if (CLOSED_KEYWORDS.some((kw) => normalised.includes(kw))) return "CLOSED";

  return null; // ambiguous — escalate to next tier
}

// ─── Tier 2: SHA-256 page hash ────────────────────────────────────────────────
function computeHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// ─── Check a single firm (two-tier detection) ─────────────────────────────────
async function checkFirm(firm) {
  const now = new Date().toISOString().slice(0, 19).replace("T", " "); // MySQL DATETIME format
  let pageText  = "";
  let newStatus = "UNKNOWN";
  let detectedBy = "keyword";
  let errorMessage = null;

  try {
    // ── Fetch page content ──────────────────────────────────────────────────
    if (
      firm.scrape_method === "playwright" ||
      firm.scrape_method === "playwright_interact"
    ) {
      pageText = await fetchWithPlaywright(firm.url, firm.selector);
    } else {
      pageText = await fetchWithAxios(firm.url);
    }

    const newHash = computeHash(pageText);

    // ── Tier 1: keyword detection ───────────────────────────────────────────
    const keywordResult = keywordDetect(pageText, firm.open_signal, firm.closed_signal);

    if (keywordResult) {
      newStatus  = keywordResult;
      detectedBy = "keyword";
    } else {
      // ── Tier 2: hash comparison ─────────────────────────────────────────
      const lastEntry = await historyModel.findLatestByFirmId(firm.id);

      if (!lastEntry) {
        // First ever scrape — no prior data, mark as UNKNOWN
        newStatus  = "UNKNOWN";
        detectedBy = "no_history";
      } else if (lastEntry.page_hash === newHash) {
        // Page unchanged — carry forward last known status
        newStatus  = lastEntry.status;
        detectedBy = "hash_match";
      } else {
        // Hash changed but keywords inconclusive — mark UNKNOWN for manual review
        newStatus  = "UNKNOWN";
        detectedBy = "hash_changed";
      }

    }

    const rawSnippet = pageText.slice(0, 500).replace(/\s+/g, " ").trim();

    // ── Persist scrape result ───────────────────────────────────────────────
    await historyModel.create({
      firm_id:    firm.id,
      status:     newStatus,
      page_hash:  computeHash(pageText),
      detected_by: detectedBy,
      raw_snippet: rawSnippet,
    });

    const changed = firm.current_status !== newStatus;

    // ── Update firm record ──────────────────────────────────────────────────
    await firmModel.updateStatus(firm.id, { newStatus, changed, now });



    return {
      firmId:     firm.id,
      name:       firm.name,
      status:     newStatus,
      changed,
      detectedBy,
    };
  } catch (err) {
    errorMessage = err.message;
    console.error(`[Scraper] Error checking ${firm.name}:`, err.message);

    // Record error in history
    await historyModel.create({
      firm_id:     firm.id,
      status:      "UNKNOWN",
      detected_by: "error",
      raw_snippet: `ERROR: ${err.message.slice(0, 200)}`,
    });

    // Update last_checked_at only
    await firmModel.updateById(firm.id, { last_checked_at: now });

    return {
      firmId:     firm.id,
      name:       firm.name,
      status:     "UNKNOWN",
      changed:    false,
      detectedBy: "error",
      error:      errorMessage,
    };
  }
}

// ─── Run all active firms with a concurrency cap ──────────────────────────────
async function checkAllFirms({ concurrency = 5, onProgress } = {}) {
  const pool = require("../config/db.config").getPool();
  const [rows] = await pool.query("SELECT * FROM firms WHERE active = 1");
  const firms = rows;

  // Open a new cron run record
  const runId = await cronRunModel.createRun();

  let checked = 0;
  let changed  = 0;
  let errors   = 0;
  const errorDetails = [];

  // Process firms in batches of `concurrency`
  for (let i = 0; i < firms.length; i += concurrency) {
    const batch   = firms.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map((f) => checkFirm(f)));

    for (const result of results) {
      checked++;

      if (result.status === "fulfilled") {
        if (result.value.changed) changed++;
        if (result.value.error) {
          errors++;
          errorDetails.push({ name: result.value.name, error: result.value.error });
        }
      } else {
        errors++;
        errorDetails.push({ name: "Unknown Firm", error: result.reason || "Promise rejected" });
      }

      if (onProgress) {
        onProgress({ checked, total: firms.length, changed, errors, errorDetails });
      }
    }

    // Small delay between batches — polite to target servers
    if (i + concurrency < firms.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Finalise cron run record
  await cronRunModel.completeRun(runId, {
    firms_checked: checked,
    firms_changed: changed,
    errors,
  });

  console.log(
    `[Scraper] Run complete — checked: ${checked}, changed: ${changed}, errors: ${errors}`
  );

  return { checked, changed, errors, errorDetails, runId };
}

module.exports = { checkFirm, checkAllFirms };
