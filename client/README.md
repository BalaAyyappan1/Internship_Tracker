# Internship Tracker

A full-stack internship application tracker for monitoring when firms open or close their internship programs. The app stores firms in MySQL, checks career pages with a keyword/hash-based scraping engine, exposes an Express API, and provides a light Next.js dashboard for filtering firms and running checks.

## Features

- Light dashboard for firm status, filters, stats, manual refreshes, and scraper runs.
- Firm CRUD API with status history and on-demand single-firm checks.
- Scheduled scraper runs with `node-cron`.
- Live scraper progress in the UI through Server-Sent Events.
- MySQL persistence for firms, scrape history, and run summaries.
- Seed data for investment banks, boutiques, Big 4, consulting, private equity, hedge funds, and technology firms.
- No Discord/webhook integration; notifications are intentionally not part of the current codebase.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Heroicons
- Backend: Node.js, Express, MySQL, node-cron
- Scraping: Playwright for JavaScript-rendered pages, Axios for static pages
- Database driver: mysql2

## Project Structure

```text
Internship_Tracker/
  client/                 Next.js dashboard
    app/                  App Router pages and global styles
    components/           UI components
    lib/api.ts            Frontend API client
  server/                 Express API and scraper worker
    app.js                Server entry point and cron registration
    src/config/           MySQL connection, schema, and seed data
    src/controllers/      API controller logic
    src/models/           Database access modules
    src/routes/           Express route modules
    src/services/         Scraper service
```

## Prerequisites

- Node.js 20 or newer
- MySQL 8 or compatible MySQL server
- Playwright browser dependencies for scraper runs that use Playwright

## Environment Variables

Create `server/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_USER_NAME=root
DB_PASSWORD=your_mysql_password
DB_NAME=intern_tracker

CRON_SCHEDULE=0 * * * *
SCRAPE_CONCURRENCY=5
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Setup

Install server dependencies:

```bash
cd server
npm install
```

Install Playwright browsers if this is a fresh machine:

```bash
npx playwright install
```

Install client dependencies:

```bash
cd ../client
npm install
```

Create the MySQL database:

```sql
CREATE DATABASE intern_tracker;
```

The server creates tables and inserts seed firms on startup.

## Running Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:3000`.

## API Overview

Base URL: `http://localhost:3001`

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/firms` | List firms with optional `status`, `type`, `region`, `search`, and `sort` filters |
| `POST` | `/api/firms` | Create a firm |
| `GET` | `/api/firms/:id` | Get one firm |
| `PATCH` | `/api/firms/:id` | Update one firm |
| `DELETE` | `/api/firms/:id` | Soft-delete/deactivate one firm |
| `GET` | `/api/firms/:id/history` | Get status history for one firm |
| `POST` | `/api/firms/:id/check` | Run an immediate scrape for one firm |
| `POST` | `/api/run` | Start a full scrape run |
| `GET` | `/api/events` | Subscribe to live scraper progress with SSE |
| `GET` | `/api/stats` | Get dashboard summary data |
| `GET` | `/api/health` | Check API health and current run state |

## Scraper Behavior

Each active firm is checked with its configured `scrape_method`:

- `playwright` or `playwright_interact`: loads the page in a headless browser.
- Any other value: uses Axios for a static HTTP request.

The scraper then:

1. Looks for firm-specific open and closed signals.
2. Falls back to global open/closed keyword lists.
3. Computes a SHA-256 page hash.
4. Carries forward the last status when the hash is unchanged.
5. Marks status as `UNKNOWN` when content changed but keywords are inconclusive.
6. Writes a `status_history` record and updates the firm timestamps.

## Useful Commands

Server:

```bash
cd server
npm run dev
npm start
```

Client:

```bash
cd client
npm run dev
npm run lint
npm run build
```

## Notes

- The scraper depends on third-party career sites, so false positives and temporary failures can happen. Always verify a result on the firm's website before acting on it.
- Cron defaults to hourly with `0 * * * *` and uses the Europe/London timezone in `server/app.js`.
- The dashboard uses `NEXT_PUBLIC_API_URL`; make sure it points at the Express server.
