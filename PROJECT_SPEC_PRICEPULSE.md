# PricePulse — Retail Inflation Tracker & Essential Goods Basket Intelligence
### Final-Year Project · Full-Stack Development Specification + Claude Code Phase Prompts
Domain: Business & Economics · Stack: React 18 + TypeScript (Vite) + Tailwind + shadcn/ui · FastAPI (Python) · MongoDB Atlas · `.env` configuration

---
## 0. HARD RULES (read first, apply in every phase)
1. **No Streamlit, no Dash, no notebooks-as-UI.** A real website + dashboard: public landing site, login screens, role dashboards, and **data entry inside the dashboard**.
2. **Python is the core**: all index/inflation maths, validation, forecasting and anomaly logic live in reusable Python modules under `backend/app/analytics/`. React never calculates official numbers; it only displays what the API returns.
3. **MongoDB Atlas** is the database. Every setting (URI, DB name, JWT secret, CORS, upload limits, tokens) comes from `.env` via `pydantic-settings`. Fail fast if `MONGODB_URI` or `JWT_SECRET` is missing or still a placeholder.
4. **Secrets:** `.env` and `frontend/.env` are git-ignored. Commit only `.env.example` with placeholders. Never print or log the Mongo URI. Use an Atlas user with `readWrite` on this one database only and an IP allow-list.
5. **Light theme only.** Neat, clear, high-contrast. No dark mode.
6. **UI uniqueness:** this project's colours, fonts, navigation and page structure are defined in §10 and must not resemble any other project of mine (see §10.9 banned list).
7. All seed/demo data is **synthetic and labelled "Illustrative sample data"** in the UI and README. Never present it as official CPI/market statistics.
8. Every phase ends with: run tests, run the app, fix errors, commit with a clear message.

---
## 1. VISION & PROBLEM
Households, small shops, students and local-economy researchers see prices rising but cannot quantify it. Price notes sit in notebooks, WhatsApp messages and spreadsheets in different formats. **PricePulse** tracks a defined **basket of essential goods** across markets and weeks/months, validates each price, builds a **weighted price index**, and shows inflation rate, category drivers, regional gaps, forecasts and unusual price jumps — with human review and exportable bulletins.

Practical relevance: consumer price awareness and local economic studies.

## 2. OBJECTIVES (map to modules)
| # | Objective | Module |
|---|---|---|
| O1 | Reliable price data entry (form, spreadsheet grid, CSV/Excel upload) with clear validation for missing, duplicate and invalid values | Data Entry & Import |
| O2 | Configurable basket: items, units, categories, weights, base period, versioning | Basket Configuration |
| O3 | Python index maths: price relatives, Laspeyres (fixed-weight) index, chain-linking, MoM/YoY, contributions, purchasing power | Index Engine |
| O4 | Regional/market comparison and category analysis | Insight Analysis |
| O5 | Short-term forecast + price-spike detection with confidence/error | Forecast & Anomaly Engine |
| O6 | Charts, filters, tables, drill-down to underlying records | Insight Dashboard |
| O7 | Human review of suspicious prices and forecasts; audit trail; export bulletins/CSV/PDF | Review & Export |

## 3. USER ROLES & LOGIN
| Role | Can do |
|---|---|
| **Admin** | Users, markets, basket versions, thresholds, audit logs, everything below |
| **Analyst** | Index runs, forecasts, regional analysis, review decisions, bulletins |
| **Collector** | Enter/upload prices for assigned markets only; see own submissions + corrections |
| **Viewer** | Read-only dashboards and published bulletins |

Login screens: Sign-in, Forgot/reset password (token flow; email can be console-logged in dev), First-login password change, Session-expired notice. JWT (access + refresh), bcrypt hashing, rate-limit on login (slowapi), role guards on **every** backend route (UI hiding is not security). Collector queries are always scoped to assigned `market_ids` server-side.

## 4. END-TO-END FLOW
```
Landing site → Sign in → Role dashboard
Admin/Analyst: define basket (items, weights, base period) ─┐
Collector: enter / grid-paste / upload prices ──► validate ─┤
          valid → price_observations   invalid/suspicious → review queue
Index Engine (Python) reads observations + active basket version
   → item relatives → category & overall index → MoM/YoY → contributions
   → saved as index_runs (reproducible: basket version + filters + formula version)
Forecast/Anomaly Engine → forecasts, anomaly flags
Dashboard & Bulletins read index_runs (never recalculate in React)
Review Desk: approve / correct / reject flags → audit_logs → data corrected → re-run index
Export: CSV / XLSX / PDF bulletin using the same saved run
```

## 5. METHODS (Python modules, pure functions, unit-tested)
Let item *i*, period *t*, base period 0. Price for an item in a period = **average (or median, configurable) of valid observations across selected markets**; elementary aggregation across markets can use the **geometric mean (Jevons)** option.
1. **Price relative:** `R_it = P_it / P_i0`.
2. **Basket weights:** expenditure shares `w_i` (sum = 1), entered directly or derived from `w_i = q_i0·P_i0 / Σ q_j0·P_j0`.
3. **Laspeyres-type fixed-weight index:** `I_t = 100 · Σ w_i · R_it`.
4. **Chain-linking** (when basket version changes): `I_t = I_{t-1} · L_{t-1→t}`, where the link `L` uses the new weights between adjacent periods. Records the version used per period.
5. **Inflation:** `MoM% = (I_t / I_{t-1} − 1)·100`, `YoY% = (I_t / I_{t-12} − 1)·100` (monthly) or 52 weeks for weekly series. Show weekly, monthly or custom frequency.
6. **Contribution of item i to index change (points):** `C_it = 100·w_i·(R_it − R_i,t−1)`; to % change: `C_it / I_{t−1} · 100`. Contributions sum exactly to the headline change (unit test asserts it).
7. **Cost of basket:** `Σ q_i·P_it` (fixed quantities) in ₹; **purchasing power of ₹100** = `10000 / I_t`.
8. **Missing prices:** carry forward at most 2 periods and mark as *imputed*; beyond that exclude the item and **renormalise weights**, publishing a *coverage %* (weight share with real prices). Never silently fill.
9. **Anomaly detection:** robust z-score on log price change using median and MAD; also hard limits (price ≤ 0, > 5× previous). Output: flag, score, expected range, reason text.
10. **Forecast (short horizon 1–6 periods):** statsmodels ETS / ARIMA candidates + naive baseline; rolling-origin validation; report MAPE/MAE and 80%/95% intervals; choose best by validation error; show caveat "indicative, not official".
11. **Optional ML (kept small):** scikit-learn KMeans to group items by price-volatility profile (volatile / steady). Only if time permits; label as exploratory.
Formula version string (`"idx-v1"`) is stored with every run.

## 6. DATA ENTRY (inside the dashboard)
1. **Quick price form** (single observation): market, item, date, price, unit, source/notes.
2. **Weekly Price Grid:** spreadsheet-like grid (rows = items, columns = markets or days) with keyboard navigation, paste from Excel, per-cell validation state, save all as a batch.
3. **CSV/Excel upload wizard:** download template → upload → map columns → preview → validation summary → duplicate policy (skip / replace with audit / reject) → confirm → result with rejected-rows CSV.
4. **Photo-of-receipt note** is out of scope (not included).
Validation catalog: required fields; numeric price > 0; plausible range per item (configurable min/max); unit must match the item's canonical unit or convertible (kg↔g, L↔mL); date not in the future; duplicate (market+item+date+source); market/item must exist; outlier flag (not reject) for large jumps. Every error message shows row, field, reason.

## 7. SEED / SAMPLE DATA (synthetic — label clearly)
Items (name · unit · category · example weight): Rice (kg · Cereals · 0.14), Wheat flour (kg · Cereals · 0.07), Toor dal (kg · Pulses · 0.08), Milk (L · Dairy · 0.13), Eggs (dozen · Protein · 0.04), Onion (kg · Vegetables · 0.05), Tomato (kg · Vegetables · 0.05), Potato (kg · Vegetables · 0.04), Sunflower oil (L · Oils · 0.09), Sugar (kg · Staples · 0.05), Tea (250 g · Beverages · 0.04), Bread (400 g · Bakery · 0.03), LPG cylinder (14.2 kg · Fuel · 0.12), Detergent (kg · Household · 0.04), Toothpaste (100 g · Household · 0.03). (Weights sum to 1.00.) 
Markets: 6 synthetic markets in 3 districts. 52 weeks of generated prices with seasonality (vegetables), a festival-month bump, one shock (onion spike), ~1% missing, 0.3% duplicates, 0.1% invalid rows for testing. Generator in `backend/scripts/seed_demo.py` with fixed random seed. Demo users per role created from `.env`-supplied demo password (never hard-coded).

## 8. TECH STACK
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), TanStack Query + TanStack Table, React Hook Form + Zod, Recharts + custom SVG (waterfall, dumbbell, proportional bar), framer-motion, sonner toasts, cmdk, react-router-dom, **Tabler Icons** (`@tabler/icons-react`).
- **Backend:** Python 3.12, FastAPI, Pydantic v2 + pydantic-settings, PyMongo (or Motor), Pandas, NumPy, SciPy, statsmodels, scikit-learn (optional), openpyxl, ReportLab or WeasyPrint (PDF), PyJWT, bcrypt, slowapi.
- **DB:** MongoDB Atlas (free tier OK).
- **Quality:** pytest (+ golden-dataset fixtures), Vitest + Testing Library, Playwright E2E, ruff, mypy-lite, Docker Compose optional.

## 9. MONGODB COLLECTIONS
| Collection | Key fields | Indexes |
|---|---|---|
| `users` | email, password_hash, name, role, market_ids, status, must_change_password | unique email |
| `markets` | name, district, state, type (retail/wholesale/online), active | unique name |
| `categories` | name, color_key, order | unique name |
| `items` | name, category_id, canonical_unit, min_plausible, max_plausible, active | unique name |
| `basket_versions` | name, base_period, frequency, status (draft/active/archived), lines[{item_id, weight, base_quantity}], created_by, effective_from | status, effective_from |
| `price_observations` | market_id, item_id, date, period_key, price, unit, price_per_canonical_unit, source, status (valid/flagged/rejected/imputed), batch_id, entered_by | (market,item,date,source) unique; (item,period_key); (batch_id) |
| `upload_batches` | filename, checksum, mapping, counts, duplicate_policy, status, actor | checksum |
| `index_runs` | basket_version_id, filters, frequency, formula_version, series[{period, index, mom, yoy, coverage}], category_series, contributions, warnings, created_by, created_at | created_at |
| `forecasts` | index_run_id, target (overall/category/item), model, horizon, points, intervals, mape, mae | index_run_id |
| `anomalies` | observation_id, item_id, market_id, score, expected_range, reason, status (open/approved/corrected/rejected), reviewer, note | status |
| `reports` | index_run_id, template, format, storage_key, status, generated_at | index_run_id |
| `audit_logs` | actor, action, resource, safe_metadata, created_at | created_at |
Rules: store dates as ISO/UTC; never embed unbounded observation arrays; bounded bulk writes; scope queries by role.

## 10. UI / UX DESIGN SYSTEM — "SHELF TAG" (light theme, unique)

### 10.1 Concept
A **supermarket shelf**: hanging price-tags for navigation, a shelf strip of basket items, and bento tiles for analysis. Warm cocoa ink on cool grey-white. No sidebars, no dark bars.

### 10.2 Colour tokens (CSS variables + Tailwind theme; use only these)
| Token | Hex | Use |
|---|---|---|
| `--shelf` | `#F4F2F1` | page background |
| `--tile` | `#FFFFFF` | tiles, tables, forms |
| `--ink` | `#231815` | text |
| `--muted` | `#75675F` | secondary text |
| `--hairline` | `#DDD6D2` | borders |
| `--cocoa` | `#5B3A29` | primary buttons, active tag, links |
| `--cocoa-deep` | `#3E2519` | hover/pressed |
| `--cocoa-wash` | `#EFE3DC` | selected rows, soft fills |
| `--rise` | `#B93815` | price up / inflation up |
| `--fall` | `#1F7A5A` | price down / deflation |
| `--steady` | `#6B7A8F` | flat / neutral |
| `--series-b` | `#3D5A80` | second chart series (regional/comparison) |
| `--series-c` | `#8A6D3B` | third chart series |
| `--warn` | `#A15C00` | flagged / review |
Rule: change direction is never colour-only — always ▲/▼/■ glyph + signed number (e.g. ▲ +1.8%). Category colours are tints of the tokens above, assigned by `color_key`.

### 10.3 Fonts (install with npm `@fontsource/...`)
- Display & big numbers: **Young Serif** — `@fontsource/young-serif` (400).
- UI/body: **Rethink Sans** — `@fontsource/rethink-sans` (400, 500, 600, 700).
- Prices, codes, grid cells, CSV: **Fragment Mono** — `@fontsource/fragment-mono` (400).
Scale: hero number 64, page title 32, section 20, body 15, table 13.5, micro-label 11 uppercase. Tabular numerals everywhere. Currency shown as ₹ with Indian digit grouping (`en-IN`).

### 10.4 Shape & motion
Corner radius 10 px on tiles, **tag shape** (angled top-left corner + punched hole) for nav and item chips, pill for status. No heavy shadows: 1 px hairline + very soft 0 1px 0 shadow. Motion: tag "drop" 180 ms when selected, number count-up 350 ms, shelf strip drag-scroll; respect `prefers-reduced-motion`.

### 10.5 Global layout (NEW — no sidebar)
1. **Masthead row (light):** logo "PricePulse" in Young Serif at left; **hanging price-tag navigation** centred (Home · Prices · Index · Markets · Forecast · Review · Bulletins · Admin) — each a tag on a thin string rail, the active tag hangs ~8 px lower and is cocoa-filled; role-hidden tags vanish; Review tag shows an open-count badge. Right: period selector pill ("Oct 2026 ▾"), ⌘K search button, avatar menu.
2. **Shelf strip (global, under masthead):** horizontal drag-scrollable row of **basket item tags** (name, current ₹ price, ▲▼ % vs previous period, 12-point sparkline). Clicking tags toggles the item filter for the whole page (multi-select); "All items" tag at the start; category filter as small chips above the strip.
3. **Page canvas:** 12-column **bento grid** of tiles with varied spans (no uniform card rows). Max width 1400 px.
4. **Mobile:** nav tags collapse into a swipeable tag row; shelf strip stays; tiles stack.

### 10.6 Pages
- **Landing site (public):** a big **price-tag hero** ("What does ₹100 buy today?" — an interactive number that shows purchasing power from the latest published run or sample data), "How it works" in 4 tags, sample bulletin preview, role entry buttons, footer.
- **Login:** a large **hanging price-tag card** centred on a string from the top edge, punched hole, barcode strip at the bottom decorative; fields: email, password (show/hide); links: forgot password; first-login password-change screen is the same tag flipped (flip animation). Session-expired = tag swings with banner.
- **Home (dashboard):** bento — Hero tile (headline inflation: huge YoY % in Young Serif with ▲/▼, MoM beneath, coverage %); *Basket cost* tile (₹ cost vs base, purchasing power of ₹100); *Index line* tile (wide, with period brush); *Top movers* tile (6 items with bars up/down); *Category contribution waterfall* tile; *Open flags* tile (count + 3 latest); *Data freshness* tile (last entries per market with traffic of days-since).
- **Prices (data entry & records):** left-of-canvas is NOT a sidebar — it's a top **segmented switch** (Quick form · Weekly Grid · Upload · Records). *Weekly Grid:* spreadsheet in Fragment Mono, row = item, column = market, week selector above, cell state chips (valid / flagged / empty), "Save batch" sticky bottom-right bar. *Upload:* horizontal **conveyor stepper** (Template → File → Map → Preview → Confirm → Result) with big step tags. *Records:* TanStack table with inline row expansion, filters on top, export button.
- **Index:** big index chart; **frequency toggle** (Weekly/Monthly); **Contributions waterfall** for the selected period; **Basket version badge**; table of period results; "Run index" button with parameter popover (aggregation: mean/median/geometric; missing-price rule; market subset); run history as a dropdown list.
- **Markets (regional comparison):** **small-multiples grid** (one mini line per market) + **dumbbell chart** (min/max price gap per item) + ranking list "Cheapest basket this week"; map is optional (simple SVG district tiles).
- **Forecast:** one chart with fan intervals (80/95), model comparison table (MAPE/MAE) shown as small tags, horizon slider, caveat text, target switcher (Overall / Category / Item).
- **Review Desk:** **single-card queue** (one flagged price/forecast at a time) with mini chart, expected range, reason, and three big buttons **Approve · Correct · Reject** with keyboard shortcuts A / C / R, remaining-count tag, "undo last". History tab lists decisions.
- **Bulletins:** template tags (Monthly Inflation Bulletin · Weekly Watchlist · Item Price Sheet · Regional Gap Note) → choose run & period → **full-page preview** with "Download PDF/CSV/XLSX" and "Publish to landing". Generated bulletins listed as a tag shelf with status.
- **Admin:** Basket builder (items table + **proportional weight bar with draggable dividers** that must total 100%, base period, save as new version), Markets, Items & plausible ranges, Users & roles, Thresholds, Audit logs.

### 10.7 Component list
PriceTagNav, ShelfStrip, ItemTag, PeriodPill, BentoGrid/Tile, HeroNumber, ChangeBadge (▲▼■), BasketCostTile, IndexChart, WaterfallChart, DumbbellChart, SmallMultiples, FanChart, WeightBar, PriceGrid, UploadConveyor, MappingRow, ValidationSummary, ReviewCard, ShortcutHint, BulletinPreview, StatusPill, EmptyState, ErrorState, Skeleton, ConfirmDialog, CommandPalette.

### 10.8 Accessibility & states
Contrast ≥ 4.5:1; keyboard nav for tags (arrow keys), grid cells and review shortcuts; visible focus ring (2 px cocoa); every chart has loading/empty/error/populated states and a data-table alternative; no fake hard-coded metrics outside labelled demo mode.

### 10.9 Banned (belongs to my other projects)
Left or right sidebar navigation; dark top command bar; floating bottom dock; round INDEX overlay button; scroll-snap acts; mode carousel/HUD; book spread; tiling panes/terminal status line; filmstrip or block-editor reports; kanban columns; node graphs; right-edge spine tabs; sentence-style filter ribbon; sun-arc motif; numbered index bands; vertical ladder steppers; fonts Inter, IBM Plex, Bricolage Grotesque, Figtree, Red Hat Mono, Sora, DM Sans/Mono, Fraunces, Manrope, JetBrains Mono, Space Grotesk, Hanken Grotesk, Spline Sans Mono, Instrument Serif, Albert Sans, Martian Mono, Josefin Sans, Public Sans, Overpass Mono, Unbounded, Schibsted Grotesk, Azeret Mono; icon sets Lucide, Phosphor; green/gold farm, glacier blue, transit blue, parchment/terracotta, concrete/safety-yellow, lavender/violet, coral pastel, ruby, linen/lime, petrol-teal/brass, magenta/sun-orange palettes.

## 11. API (base `/api/v1`, all typed, role-guarded, standard error `{error:{code,message,details[]}}`)
`POST /auth/login|logout|refresh|forgot|reset|change-password` · `GET /auth/me`
`GET/POST/PATCH /markets` · `/items` · `/categories` · `/users`
`GET/POST /basket-versions`, `POST /basket-versions/{id}/activate`
`POST /prices` (single) · `POST /prices/batch` (grid) · `GET /prices` (filter/paginate) · `PATCH /prices/{id}` (audit)
`GET /uploads/template` · `GET /uploads/sample` · `POST /uploads/preview` · `POST /uploads/{id}/confirm` · `GET /uploads/{id}` · `GET /uploads/{id}/errors.csv`
`POST /index/runs` · `GET /index/runs` · `GET /index/runs/{id}` · `GET /index/runs/{id}/contributions`
`GET /markets/compare` · `GET /dashboard/summary` · `GET /dashboard/movers`
`POST /forecasts` · `GET /forecasts/{id}`
`GET /anomalies` · `PATCH /anomalies/{id}` (approve/correct/reject)
`POST /reports` · `GET /reports/{id}/download` · `GET /audit-logs`
Rules: workspace/role scope from the token; dashboard, index and exports share one query/filter contract; exports use the saved `index_run`.

## 12. PROJECT STRUCTURE
```
pricepulse/
  backend/app/{main.py, core/(config,security,errors,logging), api/v1/routers/, schemas/, repositories/, services/,
               analytics/(prices.py, index.py, chain.py, contributions.py, anomalies.py, forecast.py, clustering.py),
               ingestion/(parser,mapper,validators,dedupe), reports/}
  backend/tests/  backend/scripts/(seed_demo.py, create_indexes.py)
  frontend/src/{app, routes, features/(landing,auth,home,prices,index,markets,forecast,review,bulletins,admin),
               components/(nav,shelf,bento,charts,grid,ui), lib/(api,query,format), styles/, types/}
  docs/  .env.example  frontend/.env.example  docker-compose.yml  README.md
```

## 13. `.env.example` (placeholders only)
```
APP_ENV=development
MONGODB_URI=<paste-your-atlas-uri-here-locally-only>
MONGODB_DB_NAME=pricepulse
MONGODB_TEST_DB_NAME=pricepulse_test
JWT_SECRET=<generate-a-long-random-string>
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
CORS_ORIGINS=http://localhost:5173
UPLOAD_MAX_MB=10
DEMO_USER_PASSWORD=<choose-a-local-demo-password>
LOG_LEVEL=INFO
```
`frontend/.env.example`: `VITE_API_BASE_URL=http://localhost:8000/api/v1`

## 14. TESTING
- **Golden dataset:** hand-calculated 3-item × 4-period fixture with known index, MoM, YoY, contributions; tests assert tolerance 1e-9; contribution sum equals headline change; renormalised-weight case; chain-link case; missing-price cases.
- Validation tests (every rule in §6), duplicate policies, unit conversion.
- API tests: auth, RBAC (collector cannot read other markets), batch save, run index, review actions, report generation. Test DB isolated (`MONGODB_TEST_DB_NAME`).
- Frontend tests: grid validation, upload wizard, review shortcuts, ChangeBadge glyphs, tag-nav keyboard.
- E2E: login → grid entry → upload → run index → dashboard → review flag → bulletin PDF.
- Security: login rate-limit, cross-role access, malformed file, NoSQL injection, secret redaction.

## 15. RISKS
| Risk | Mitigation |
|---|---|
| Weights not official | Label as user-defined; allow versioning; show basket version on every number |
| Sparse/missing prices | Coverage %, renormalisation, no silent filling |
| Forecast over-trusted | Baseline comparison, intervals, "indicative" caveat |
| Unit confusion (kg/g, L/mL) | Canonical unit per item + conversion tests |
| Exposed DB credentials | `.env` only, rotate if shared, least-privilege Atlas user |
| Demo data mistaken for real | "Illustrative sample data" label everywhere |

## 16. DELIVERABLES
Working app, README (setup + `.env`), API docs, seed script, template/sample CSVs, test report, screenshots (1440/1024/390), `docs/ui-uniqueness-check.md`, short user guide, demo script.

---
## 17. CLAUDE CODE PHASE PROMPTS (paste one by one; finish + commit each before the next)

**Phase 1 — Project foundation.** Create the monorepo structure in §12. Backend: FastAPI app factory, `pydantic-settings` config reading `.env` (fail fast on missing/placeholder `MONGODB_URI`/`JWT_SECRET`), structured logging that never prints the URI, error handler for the standard error contract, `/health` endpoint. Frontend: Vite + React 18 + TS + Tailwind + shadcn/ui + router + TanStack Query. Add `.gitignore` (ignores `.env`), `.env.example` files, README skeleton. Tests: config fail-fast test.

**Phase 2 — Design system "Shelf Tag".** Implement §10.2–10.4 tokens, install fonts `@fontsource/young-serif`, `@fontsource/rethink-sans`, `@fontsource/fragment-mono` and `@tabler/icons-react`; build PriceTagNav, ShelfStrip/ItemTag, BentoGrid/Tile, HeroNumber, ChangeBadge, StatusPill, PeriodPill, Skeleton/Empty/Error, ConfirmDialog, CommandPalette. Create a `/design` dev route showing all components with states. No sidebar anywhere.

**Phase 3 — Database layer.** PyMongo connection, repositories for §9 collections, `create_indexes.py`, role-scoped query helpers, test DB fixtures. Tests for unique indexes and scoping.

**Phase 4 — Auth & roles.** Register-by-admin, login, refresh, logout, forgot/reset (dev token logged to console), first-login password change, bcrypt, slowapi limit, role guards, collector market scoping. Frontend: hanging price-tag login + flip to password-change, session-expired state, protected routes, role-aware PriceTagNav.

**Phase 5 — Master data & basket.** CRUD for markets, categories, items (plausible ranges), users. Basket versions with weights summing to 1, base period, activate/archive. Frontend Admin: Basket builder with proportional WeightBar (drag dividers, total must equal 100%).

**Phase 6 — Price entry.** Quick form, `POST /prices`, `POST /prices/batch`, validation catalog (§6), unit conversion to canonical unit, duplicate detection, status flags. Frontend: Prices page with segmented switch, Weekly Grid (keyboard navigation, paste, cell states, sticky Save batch bar), Records table.

**Phase 7 — Upload wizard.** Template + sample CSV/XLSX download, preview, column mapping, validation summary, duplicate policy, idempotent confirm with SHA-256 checksum, batch progress, rejected-rows CSV. Frontend UploadConveyor stepper.

**Phase 8 — Index engine (Python).** Implement §5 steps 1–8 as pure functions in `analytics/`; golden-dataset tests; `POST /index/runs` persisting runs with filters, basket version, formula version, coverage, warnings; contributions endpoint. No UI numbers computed in React.

**Phase 9 — Dashboard Home & Index page.** Bento Home tiles (hero YoY/MoM/coverage, basket cost + purchasing power, index line with brush, top movers, waterfall, open flags, data freshness), Index page (frequency toggle, run popover, run history, period table). Skeleton/empty/error states; real API data only.

**Phase 10 — Markets & category analysis.** `GET /markets/compare`; SmallMultiples, DumbbellChart, cheapest-basket ranking, category drill-down; shared filter contract with Home.

**Phase 11 — Anomaly + forecast engines.** Robust-z anomaly detection on ingest and on demand → `anomalies`; ETS/ARIMA/naive forecast with rolling-origin validation, MAPE/MAE, intervals; FanChart UI with model comparison and caveat. Optional KMeans volatility grouping labelled exploratory.

**Phase 12 — Review Desk & audit.** Single-card queue with Approve/Correct/Reject (A/C/R shortcuts), undo, correction updates observation + audit log + marks index as stale with "Re-run" prompt; decision history; Audit logs page.

**Phase 13 — Bulletins & exports.** Filtered records CSV, index series CSV/XLSX, error CSV, PDF Monthly Bulletin / Weekly Watchlist / Item Sheet / Regional Note from a saved `index_run`; job status UI; "Publish to landing" for the public price-tag hero and sample bulletin; ensure PDF numbers equal dashboard numbers.

**Phase 14 — Landing site.** Public landing with interactive "What does ₹100 buy today?" hero, how-it-works tags, sample bulletin, role entry; responsive; clearly labelled sample data when no published run.

**Phase 15 — QA, security, polish.** Run all test layers (§14), E2E, accessibility pass, responsive screenshots, security checks, Docker Compose (optional), README, user guide, demo script, write `docs/ui-uniqueness-check.md`, final cleanup.

---
## 18. REFERENCES (concepts to cite in the project report)
Laspeyres price index and chain-linking (ILO/IMF CPI Manual concepts); percentage change and weighted averages; Jevons elementary index; median absolute deviation for robust outlier detection; exponential smoothing / ARIMA (statsmodels docs); MAPE/MAE forecast evaluation; FastAPI, Pydantic, MongoDB Atlas and React documentation.
