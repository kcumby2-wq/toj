# TOJ Campaign Builder

![CI Verify](https://github.com/kcumby2-wq/TojCampaign/actions/workflows/ci-verify.yml/badge.svg)

A local-first Node/Express app for running tracked campaigns: UTM link builder, QR code generator, contact CSV manager, saved templates, and saved contact sets — all gated behind a real email/password login (bcrypt-hashed, stored locally in JSON).

Built around the TOJ / SubjectMedia / Xpand Dash workflow described in your doc.

---

## What's in here

```
toj-csv-app/
├── server.js              Express app, sessions, auth gate
├── package.json           Dependencies
├── public/                Frontend (no build step)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── routes/                API endpoints
│   ├── auth.js            register / login / logout
│   ├── utm.js             POST /api/utm/build
│   ├── qr.js              POST /api/qr/generate
│   ├── csv.js             build + parse CSV
│   ├── templates.js       save/load column schemas
│   └── contacts.js        save/load contact sets
├── utils/
│   ├── utm.js             URL building + validation
│   ├── csvBuilder.js      proper quote/comma escaping
│   └── validate.js        email/url/phone checks
└── db/                    Local JSON storage
    ├── users.json
    ├── templates.json
    └── contacts.json
```

---

## Setup (in VS Code)

1. Open the folder in VS Code: `File → Open Folder → toj-csv-app`
2. Open the integrated terminal: `` Ctrl+` ``
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open `http://localhost:3000` in your browser.

Requires Node 18+ (for the built-in `fetch` / `URL` APIs used and for `--watch` mode if you run `npm run dev`).

---

## Deploy First, Domain Later

You can deploy now using a provider URL, then connect your custom domain later.

### Render (recommended)

This repo includes `render.yaml` for one-click style setup.

1. Push this project to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Select your repo and deploy.
4. Set required environment variables in Render:
   - `SESSION_SECRET`
   - `BASE_URL` (set to your Render app URL first)
   - `DATABASE_URL` (if using Postgres Phase 1 scripts in hosted env)
5. Confirm app health at `/api/me`.

### Attach your custom domain later

1. Buy your domain.
2. In Render service settings, open **Custom Domains** and add your domain.
3. Copy Render DNS targets and add them at your registrar.
4. Update `BASE_URL` to your final domain and redeploy.

### Docker option

This repo also includes `Dockerfile` and `.dockerignore` if you prefer a Docker-based host.

---

## Phase 1 DB workflow (Postgres)

The Phase 1 SQL docs and scripts live in `docs/phase1/`.

### Prerequisites

1. Install PostgreSQL client tools (Windows installer is fine).
2. Ensure your target database exists.
3. Set `DATABASE_URL` in PowerShell before running DB scripts:

```powershell
$env:DATABASE_URL="postgresql://postgres:your_password@localhost:5432/subjectmedia"
```

### Commands

```bash
npm run db:schema   # Apply schema
npm run db:seed     # Insert seed data
npm run db:smoke    # Run rollback-safe smoke assertions
npm run db:reset    # Run schema + seed + smoke in sequence (Windows helper)
```

All DB scripts read `DATABASE_URL` from environment first, then fall back to `.env` if present.
They also auto-detect `psql` from common PostgreSQL install paths on Windows.

### Quick verification

`npm run db:smoke` should finish with PASS notices and no uncaught exceptions.

### API negative contract check

Run the Phase 1 negative Postman collection in one command:

```bash
npm run api:negative
```

This script starts the server, waits for `http://localhost:3000`, runs Newman against
`docs/phase1/postman/SubjectMedia-Phase1-negative.postman_collection.json`, and then stops the server.

### CI verification policy

Use this command for CI-safe verification aligned to production risk:

```bash
npm run ci:verify
```

It runs:

```bash
npm run db:smoke
npm run api:negative
npm run audit:prod
```

Additional audit commands:

```bash
npm run audit:prod   # Production dependencies only (recommended CI gate)
npm run audit:full   # Includes dev dependencies (informational)
```

### Windows troubleshooting

- If `psql` is not recognized:
   - Add your PostgreSQL `bin` directory to PATH (for example, `C:\Program Files\PostgreSQL\16\bin`).
   - Restart terminal and run `psql --version`.
- If auth fails:
   - Re-check username/password in `DATABASE_URL`.
   - Verify host/port/db name and local `pg_hba.conf` rules.
- If DB is empty after smoke:
   - This is expected. Smoke tests end with `ROLLBACK` by design.

---

## First-time use

1. Hit the **Register** tab on the login screen, create an account (min 6-char password).
2. You land on the **UTM + QR** tab:
   - Paste your destination URL (e.g. `https://subjectmedia.xpandsports.com/`)
   - Fill in `utm_source`, `utm_medium`, `utm_campaign`
   - Click **Build link** → full tracked URL + QR code render instantly
   - **Copy** the URL, **Download PNG** for the QR, or **Add to contacts CSV** to drop a row into your sheet
3. The **Contacts** tab is your running CSV:
   - Add Name/Email/Phone rows manually
   - Upload or paste an existing CSV
   - Save the whole set for later, or download it
4. The **Templates** tab lets you save column schemas (so next time you skip setup).

---

## Data storage

Everything is stored in plain JSON files under `db/`:
- `users.json` — emails + bcrypt hashes (never plaintext)
- `templates.json` — per-user column schemas
- `contacts.json` — per-user saved contact sets

This is intentional — no database to set up. For production, swap these reads/writes for SQLite or Postgres later.

---

## Security notes

- Passwords are hashed with bcrypt (cost 10). No plaintext storage.
- Sessions use an HTTP-only cookie; secret is read from `SESSION_SECRET` env var if set, otherwise a dev default.
- **Before exposing this to the internet:** set `SESSION_SECRET`, enable `cookie.secure: true` behind HTTPS, and move `db/` JSON files to a real database.

---

## What this connects to (next steps)

This app is the **link + CSV + contact layer**. To plug it into the full TOJ stack described in your doc:

1. **Xpand Dash** — paste the generated UTMs into campaigns you launch, and Xpand will aggregate them under `utm_campaign`.
2. **Meta / TikTok pixels** — install those via GTM on the destination sites, not this app.
3. **Short links** — if you want Bitly-style short links, you can wire the Bitly MCP or API into `routes/utm.js` as a post-build step.

---

## Common issues

- **`EADDRINUSE: port 3000`** — another app is using 3000. Run `PORT=3001 npm start`.
- **Can't log in after restart** — sessions reset when the server restarts (in-memory store). Log in again. To persist sessions, swap in `connect-sqlite3` or similar.
- **CSV download opens in browser instead of downloading** — some browsers do this for small files. Right-click → Save As.
