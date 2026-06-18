const mysql = require("mysql2/promise");
require("dotenv").config();

// ─── Connection Pool ──────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER_NAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "intern_tracker",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

function getPool() {
  return pool;
}

// ─── Schema DDL ───────────────────────────────────────────────────────────────
async function initSchema(conn) {
  // firms table — includes `region` column for global tracking
  await conn.query(`
    CREATE TABLE IF NOT EXISTS firms (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      name               VARCHAR(255)  NOT NULL,
      type               VARCHAR(100)  NOT NULL DEFAULT 'Other',
      region             VARCHAR(100)  NOT NULL DEFAULT 'Global',
      url                TEXT          NOT NULL,
      selector           TEXT,
      scrape_method      VARCHAR(50)   NOT NULL DEFAULT 'playwright',
      open_signal        TEXT,
      closed_signal      TEXT,
      detection_strategy VARCHAR(50)   NOT NULL DEFAULT 'hybrid',
      current_status     VARCHAR(20)   NOT NULL DEFAULT 'UNKNOWN',
      last_checked_at    DATETIME      DEFAULT NULL,
      last_changed_at    DATETIME      DEFAULT NULL,
      active             TINYINT(1)    NOT NULL DEFAULT 1,
      created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add `region` column if upgrading from an older schema (safe to run on existing DB)
  const [columns] = await conn.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'firms' 
      AND COLUMN_NAME = 'region'
  `);
  if (columns.length === 0) {
    await conn.query(`
      ALTER TABLE firms ADD COLUMN region VARCHAR(100) NOT NULL DEFAULT 'Global' AFTER type
    `);
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS status_history (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      firm_id     INT          NOT NULL,
      status      VARCHAR(20)  NOT NULL,
      page_hash   VARCHAR(64)  DEFAULT NULL,
      detected_by VARCHAR(30)  NOT NULL DEFAULT 'keyword',
      raw_snippet TEXT         DEFAULT NULL,
      checked_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_history_firm FOREIGN KEY (firm_id) REFERENCES firms(id)
    )
  `);

  const [idx1] = await conn.query(`
    SELECT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'status_history' 
      AND INDEX_NAME = 'idx_history_firm_id'
  `);
  if (idx1.length === 0) {
    await conn.query(`CREATE INDEX idx_history_firm_id ON status_history (firm_id)`);
  }

  const [idx2] = await conn.query(`
    SELECT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'status_history' 
      AND INDEX_NAME = 'idx_history_checked_at'
  `);
  if (idx2.length === 0) {
    await conn.query(`CREATE INDEX idx_history_checked_at ON status_history (checked_at DESC)`);
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cron_runs (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      started_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at    DATETIME     DEFAULT NULL,
      firms_checked  INT          DEFAULT 0,
      firms_changed  INT          DEFAULT 0,
      errors         INT          DEFAULT 0,
      status         VARCHAR(20)  NOT NULL DEFAULT 'running'
    )
  `);

  console.log("[DB] Schema initialised");
}

// ─── Global firm seed list ────────────────────────────────────────────────────
const SEED_FIRMS = [
  // ── Bulge Bracket Banks ────────────────────────────────────────────────────
  { name: "Goldman Sachs",        type: "Bulge Bracket",  region: "Global",        url: "https://www.goldmansachs.com/careers/students/programs-and-internships",                                          scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "0 Items",               detection_strategy: "hybrid" },
  { name: "JP Morgan",            type: "Bulge Bracket",  region: "Global",        url: "https://careers.jpmorgan.com/global/en/students/programs/internships",                                            scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Applications Closed",  detection_strategy: "hybrid" },
  { name: "Morgan Stanley",       type: "Bulge Bracket",  region: "Global",        url: "https://www.morganstanley.com/people-opportunities/students-graduates/programs/internships",                      scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Coming Soon",          detection_strategy: "hybrid" },
  { name: "Bank of America",      type: "Bulge Bracket",  region: "Global",        url: "https://campus.bankofamerica.com/programs-and-internships.html",                                                  scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Applications Closed",  detection_strategy: "hybrid" },
  { name: "Citi",                 type: "Bulge Bracket",  region: "Global",        url: "https://jobs.citi.com/early-careers",                                                                             scrape_method: "playwright",  open_signal: "Submit Application",    closed_signal: "Applications Closed",  detection_strategy: "hybrid" },
  { name: "Barclays",             type: "Bulge Bracket",  region: "EMEA",          url: "https://joinus.barclays/emea/early-careers/internships/",                                                         scrape_method: "playwright",  open_signal: "Apply here",            closed_signal: "Opening soon",         detection_strategy: "hybrid" },
  { name: "HSBC",                 type: "Bulge Bracket",  region: "Global",        url: "https://www.hsbc.com/careers/students-and-graduates/student-opportunities",                                       scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Opening Soon",         detection_strategy: "hybrid" },
  { name: "Deutsche Bank",        type: "Bulge Bracket",  region: "Global",        url: "https://careers.db.com/students/internships/",                                                                    scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "UBS",                  type: "Bulge Bracket",  region: "Global",        url: "https://www.ubs.com/global/en/careers/students.html",                                                             scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Not accepting",        detection_strategy: "hybrid" },
  { name: "BNP Paribas",          type: "Bulge Bracket",  region: "Global",        url: "https://group.bnpparibas/en/careers/students-young-graduates",                                                    scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Credit Suisse",        type: "Bulge Bracket",  region: "Global",        url: "https://www.credit-suisse.com/careers/en/students-and-graduates.html",                                           scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Societe Generale",     type: "Bulge Bracket",  region: "Global",        url: "https://careers.societegenerale.com/en/students-young-graduates/internships",                                    scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Wells Fargo",          type: "Bulge Bracket",  region: "Americas",      url: "https://www.wellsfargojobs.com/en/early-careers/",                                                                scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Nomura",               type: "Bulge Bracket",  region: "Global",        url: "https://www.nomura.com/careers/students/",                                                                        scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Mizuho",               type: "Bulge Bracket",  region: "Global",        url: "https://www.mizuhogroup.com/careers/graduates",                                                                   scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },

  // ── Elite Boutiques ────────────────────────────────────────────────────────
  { name: "Lazard",               type: "Boutique",       region: "Global",        url: "https://www.lazard.com/careers/students/",                                                                        scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Check back",           detection_strategy: "hybrid" },
  { name: "Rothschild & Co",      type: "Boutique",       region: "Global",        url: "https://www.rothschildandco.com/en/careers/students-and-graduates/",                                              scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Applications open soon", detection_strategy: "hybrid" },
  { name: "Evercore",             type: "Boutique",       region: "Americas",      url: "https://www.evercore.com/careers/",                                                                                scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Moelis & Company",     type: "Boutique",       region: "Global",        url: "https://www.moelis.com/careers/students/",                                                                        scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Not available",        detection_strategy: "hybrid" },
  { name: "Jefferies",            type: "Boutique",       region: "Global",        url: "https://jefferies.com/careers/students/",                                                                         scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Houlihan Lokey",       type: "Boutique",       region: "Global",        url: "https://hl.com/careers/campus/",                                                                                  scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "PJT Partners",         type: "Boutique",       region: "Global",        url: "https://www.pjtpartners.com/careers/campus-recruiting/",                                                          scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Perella Weinberg",     type: "Boutique",       region: "Global",        url: "https://www.pwpartners.com/careers/",                                                                             scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Centerview Partners",  type: "Boutique",       region: "Americas",      url: "https://www.centerviewpartners.com/careers/",                                                                     scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },

  // ── Big 4 Accounting ───────────────────────────────────────────────────────
  { name: "PwC",                  type: "Big 4",          region: "Global",        url: "https://www.pwc.com/gx/en/careers/student-jobs.html",                                                             scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Applications Closed",  detection_strategy: "hybrid" },
  { name: "Deloitte",             type: "Big 4",          region: "Global",        url: "https://www.deloitte.com/global/en/careers/students.html",                                                        scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Deadline passed",      detection_strategy: "hybrid" },
  { name: "EY",                   type: "Big 4",          region: "Global",        url: "https://www.ey.com/en_gl/careers/students",                                                                       scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "KPMG",                 type: "Big 4",          region: "Global",        url: "https://home.kpmg/xx/en/home/careers/students.html",                                                              scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Coming soon",          detection_strategy: "hybrid" },

  // ── Management Consulting ──────────────────────────────────────────────────
  { name: "McKinsey & Company",   type: "Consulting",     region: "Global",        url: "https://www.mckinsey.com/careers/students",                                                                       scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Applications closed",  detection_strategy: "hybrid" },
  { name: "BCG",                  type: "Consulting",     region: "Global",        url: "https://careers.bcg.com/job-search-results/?positiontype=Internship",                                             scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Bain & Company",       type: "Consulting",     region: "Global",        url: "https://www.bain.com/careers/find-a-role/students/",                                                              scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Not accepting",        detection_strategy: "hybrid" },
  { name: "Oliver Wyman",         type: "Consulting",     region: "Global",        url: "https://www.oliverwyman.com/careers/students.html",                                                               scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Roland Berger",        type: "Consulting",     region: "Global",        url: "https://www.rolandberger.com/en/Career/Students/",                                                                scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "A.T. Kearney",         type: "Consulting",     region: "Global",        url: "https://www.kearney.com/careers/students",                                                                        scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "L.E.K. Consulting",    type: "Consulting",     region: "Global",        url: "https://www.lek.com/careers/students",                                                                            scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },

  // ── Private Equity ─────────────────────────────────────────────────────────
  { name: "Blackstone",           type: "Private Equity", region: "Global",        url: "https://www.blackstone.com/careers/campus-recruiting/",                                                           scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Check back",           detection_strategy: "hybrid" },
  { name: "KKR",                  type: "Private Equity", region: "Global",        url: "https://www.kkr.com/careers/students",                                                                            scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Apollo Global",        type: "Private Equity", region: "Global",        url: "https://www.apollo.com/careers",                                                                                  scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "The Carlyle Group",    type: "Private Equity", region: "Global",        url: "https://www.carlyle.com/join-carlyle/careers",                                                                    scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "TPG",                  type: "Private Equity", region: "Global",        url: "https://www.tpg.com/about/careers",                                                                               scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Warburg Pincus",       type: "Private Equity", region: "Global",        url: "https://warburgpincus.com/about/careers/",                                                                        scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },

  // ── Hedge Funds ────────────────────────────────────────────────────────────
  { name: "Citadel",              type: "Hedge Fund",     region: "Global",        url: "https://www.citadel.com/careers/open-positions/students/",                                                        scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Applications Closed",  detection_strategy: "hybrid" },
  { name: "Two Sigma",            type: "Hedge Fund",     region: "Global",        url: "https://www.twosigma.com/careers/",                                                                               scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "D.E. Shaw",            type: "Hedge Fund",     region: "Global",        url: "https://www.deshaw.com/careers/internships",                                                                      scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Bridgewater",          type: "Hedge Fund",     region: "Americas",      url: "https://www.bridgewater.com/working-here/",                                                                       scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Man Group",            type: "Hedge Fund",     region: "Global",        url: "https://www.man.com/careers/students-and-graduates",                                                              scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Millennium Management",type: "Hedge Fund",     region: "Global",        url: "https://www.mlp.com/careers/",                                                                                    scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Point72",              type: "Hedge Fund",     region: "Global",        url: "https://point72.com/careers/campus/",                                                                             scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },

  // ── Technology (Global) ────────────────────────────────────────────────────
  { name: "Google",               type: "Technology",     region: "Global",        url: "https://careers.google.com/jobs/results/?employment_type=INTERN",                                                 scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "No jobs",              detection_strategy: "listing_presence" },
  { name: "Microsoft",            type: "Technology",     region: "Global",        url: "https://careers.microsoft.com/students/us/en/usuniversityinternship",                                             scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Applications Closed",  detection_strategy: "hybrid" },
  { name: "Meta",                 type: "Technology",     region: "Global",        url: "https://www.metacareers.com/jobs?roles[0]=intern",                                                                scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Amazon",               type: "Technology",     region: "Global",        url: "https://www.amazon.jobs/en/job_categories/student-programs",                                                      scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Apple",                type: "Technology",     region: "Global",        url: "https://jobs.apple.com/en-us/search?team=internships-STDNT-INTRN",                                                scrape_method: "playwright",  open_signal: "Apply",                 closed_signal: "No results",           detection_strategy: "listing_presence" },
  { name: "Jane Street",          type: "Hedge Fund",     region: "Global",        url: "https://www.janestreet.com/join-jane-street/open-roles/",                                                         scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "IMC Trading",          type: "Hedge Fund",     region: "Global",        url: "https://careers.imc.com/eu/en/students",                                                                          scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },

  // ── Asia-Pacific ───────────────────────────────────────────────────────────
  { name: "DBS Bank",             type: "Bulge Bracket",  region: "Asia-Pacific",  url: "https://www.dbs.com/careers/join-us/students-and-fresh-graduates.html",                                           scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
  { name: "Macquarie Group",      type: "Bulge Bracket",  region: "Asia-Pacific",  url: "https://www.macquarie.com/au/en/careers/campus.html",                                                             scrape_method: "playwright",  open_signal: "Apply Now",             closed_signal: "Closed",               detection_strategy: "hybrid" },
];

// ─── Additive seed — inserts any firm in SEED_FIRMS not already in the DB ────────
// Uses INSERT IGNORE so existing rows (matched on name) are left untouched.
async function seedFirms(conn) {
  // Deduplicate existing firms on name (keeping the oldest ID) before adding the UNIQUE index
  await conn.query(`
    DELETE f1 FROM firms f1
    INNER JOIN firms f2 
    ON f1.name = f2.name AND f1.id > f2.id
  `);

  // Temporarily add a UNIQUE constraint on name if missing (safe no-op if already exists)
  const [indexes] = await conn.query(`
    SELECT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'firms' 
      AND INDEX_NAME = 'uq_firm_name'
  `);
  if (indexes.length === 0) {
    await conn.query(
      "ALTER TABLE firms ADD UNIQUE INDEX uq_firm_name (name)"
    );
  }

  const sql = `
    INSERT IGNORE INTO firms (name, type, region, url, scrape_method, open_signal, closed_signal, detection_strategy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let inserted = 0;
  for (const firm of SEED_FIRMS) {
    const [result] = await conn.query(sql, [
      firm.name,
      firm.type,
      firm.region,
      firm.url,
      firm.scrape_method,
      firm.open_signal,
      firm.closed_signal,
      firm.detection_strategy,
    ]);
    if (result.affectedRows > 0) inserted++;
  }

  console.log(`[DB] Seed complete — ${inserted} new firms added (${SEED_FIRMS.length - inserted} already existed)`);
}

// ─── Init DB (call once at app start) ────────────────────────────────────────
async function initDb() {
  const conn = await pool.getConnection();
  try {
    await initSchema(conn);
    // Always run additive seed — INSERT IGNORE means no duplicates
    await seedFirms(conn);
    // Back-fill region = 'EMEA' on firms whose URL points to a UK/EMEA domain
    await conn.query(`
      UPDATE firms
      SET region = 'EMEA'
      WHERE region = 'Global'
        AND (
          url LIKE '%barclays%' OR url LIKE '%hsbc%'
          OR url LIKE '%.co.uk%' OR url LIKE '%emea%'
          OR url LIKE '%joinus.barclays%'
        )
    `);
  } finally {
    conn.release();
  }
}

// ─── Test connection ──────────────────────────────────────────────────────────
async function connectDb() {
  try {
    const conn = await pool.getConnection();
    console.log("[DB] Connected to MySQL");
    conn.release();
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    throw err;
  }
}

module.exports = { getPool, initDb, connectDb };