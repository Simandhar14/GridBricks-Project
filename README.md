# GridBricks — Day-Ahead Wind Power Procurement Platform

[![GridBricks CI](https://github.com/your-org/gridbricks/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/gridbricks/actions)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Institutional-grade web dashboard engineered for a UK energy utility's day-ahead power procurement desk.**  
> Evaluates national wind generation forecasts against outturn actuals from Elexon BMRS for January 2026 delivery days with **zero look-ahead leakage**.

---

## 1. Project Summary

In the UK electricity market, wholesale power procurement orders for delivery day **D** must be committed on **D-1** prior to the day-ahead auction gate closure (typically 09:00–11:00 London time). Weather-dependent wind generation is the single largest volumetric risk factor in sizing thermal and interconnection purchase requirements.

**GridBricks provides trading desks with three synchronized capabilities:**
1. **Decision View:** Extracts the **latest available wind forecast** published at or prior to the exact D-1 cutoff (default 09:00 London), plots it against confirmed actuals with empirical P10–P90 uncertainty envelopes, and includes an interactive "What-If" scenario procurement calculator with CSV export.
2. **Accuracy View:** Quantitatively benchmarks forecast performance across January 2026 (MAE, RMSE, Mean Bias, WAPE, and P90 tail risk), featuring diurnal hourly profiles, lead-time horizon degradation curves (0–6h to 48h+), error distribution histograms, and actionable trader guidance.
3. **Forecast Revisions View:** Visualizes the chronological evolution of successive weather model vintages for any chosen delivery day, highlighting the exact decision vintage used at auction time.

**Live Deployment URL:** `https://gridbricks-wind-desk.herokuapp.com` *(Placeholder)*

---

## 2. Directory and File Guide

```
GridBricks Project/
├── Dockerfile                       # Multi-stage production container (Node 20 build + Python 3.12 runtime)
├── docker-compose.yml               # Local development (hot-reload) & single-command production run
├── heroku.yml                       # Heroku container stack manifest
├── .env.example                     # Environment template
├── README.md                        # Master project documentation
│
├── backend/
│   ├── pyproject.toml               # Python project configuration (Ruff, Black, Pytest)
│   ├── requirements.txt             # Pinned backend dependencies
│   ├── data/                        # Committed Parquet snapshots (100% offline runtime capable)
│   │   ├── actuals_wind_2026-01.parquet    # Elexon FUELHH actuals (1,488 rows)
│   │   ├── windfor_forecasts_2026-01.parquet # Elexon WINDFOR forecasts (18,080 rows)
│   │   └── snapshot_meta.json              # Ingestion timestamps, URLs, parameters, row counts
│   ├── app/
│   │   ├── main.py                  # FastAPI factory, CORS, lifespan, and static SPA serving
│   │   ├── config.py                # Pydantic-settings configuration singleton
│   │   ├── data_loader.py           # In-memory Parquet cache loaded at startup
│   │   ├── analytics.py             # Pure domain logic (invariants, cutoff, metrics, quantiles)
│   │   ├── schemas.py               # Pydantic v2 request/response schemas
│   │   └── routers/
│   │       ├── health.py            # GET /api/health
│   │       ├── meta.py              # GET /api/meta
│   │       ├── forecast.py          # /api/forecast/decision, revisions, what-if
│   │       └── accuracy.py          # /api/accuracy/summary, daily, by-hour, by-horizon, error-dist
│   ├── scripts/
│   │   └── fetch_data.py            # Ingestion script with polite chunking, backoff, and validation
│   └── tests/
│       ├── conftest.py              # In-memory test fixtures (zero network calls)
│       ├── test_analytics.py        # Invariant unit tests (strict no-leakage, hand-computed metrics)
│       ├── test_api.py              # FastAPI TestClient endpoint tests
│       ├── test_fetch_data.py       # Ingestion & retry unit tests (Respx mocked)
│       └── fixtures/                # Raw API response sample fixtures
│
├── frontend/
│   ├── package.json                 # React 18, TanStack Query, Recharts, Tailwind CSS, Lucide
│   ├── vite.config.ts               # Vite configuration with API proxy and Vitest setup
│   ├── tsconfig.json                # Strict TypeScript configuration
│   ├── tailwind.config.js           # Institutional dashboard theme
│   └── src/
│       ├── App.tsx                  # Root layout, tab state, query client provider
│       ├── main.tsx                 # DOM entry point
│       ├── api/                     # TanStack Query custom hooks & fetch client
│       ├── components/
│       │   ├── layout/              # Navbar, Methodology slide-over drawer
│       │   ├── shared/              # KpiCard, LoadingSkeleton, ErrorState, CsvDownloadButton
│       │   ├── decision/            # ForecastChart, WhatIfWidget, HalfHourlyTable, DecisionView
│       │   ├── accuracy/            # DailyErrorChart, HourOfDayChart, HorizonChart, ErrorHistogram, AccuracyView
│       │   └── revisions/           # RevisionsChart, RevisionsView
│       ├── utils/                   # formatMW, formatMWh, formatPercent, London datetime formatters
│       ├── types/                   # TypeScript interfaces matching backend Pydantic models
│       └── __tests__/               # Vitest unit tests for utilities and components
│
└── docs/
    ├── ARCHITECTURE.md              # Mermaid component diagrams, data flows, trade-offs
    ├── ANALYSIS.md                  # Detailed January 2026 trading findings & buying guidance
    └── DEMO_SCRIPT.md               # 10-minute executive presentation & engineering walkthrough
```

---

## 3. How to Run Locally

### Option A: With Docker & Docker Compose (Recommended)

#### 1. One-Command Production Run (Single Container)
Builds the multi-stage image (compiling React in Stage 1 and serving statically via FastAPI in Stage 2):
```bash
docker compose up app
```
Open your browser at `http://localhost:8000`.

#### 2. Local Development with Live Reload
Spins up the FastAPI backend with `--reload` on port 8000 and the Vite dev server with Hot Module Replacement on port 5173:
```bash
docker compose --profile dev up
```
Open `http://localhost:5173` in your browser.

---

### Option B: Without Docker (Native Python & Node)

#### Prerequisites
- **Python:** 3.12+ (tested on Python 3.12 and 3.14)
- **Node.js:** v18+ (tested on Node v20 and v24)
- **Package Managers:** `pip` and `npm`

#### 1. Start the Backend
```bash
# From repository root
cd backend
python -m pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```
The interactive Swagger API documentation is available at `http://localhost:8000/docs`.

#### 2. Start the Frontend
```bash
# In a separate terminal window
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. Requests to `/api/*` are automatically proxied to `http://localhost:8000`.

---

## 4. How to Run Tests

### Backend Test Suite (Pytest)
The backend test suite executes with **zero network dependencies**, using in-memory fixtures:
```bash
# From repository root
python -m pytest backend/tests/test_analytics.py backend/tests/test_api.py backend/tests/test_fetch_data.py -v
```
To run linters and code formatters:
```bash
cd backend
python -m ruff check app tests scripts
python -m black --check app tests scripts
```

### Frontend Test Suite (Vitest)
Executes component and formatter tests using Vitest and React Testing Library:
```bash
cd frontend
npm test
```
To verify the strict TypeScript production build:
```bash
cd frontend
npm run build
```

---

## 5. How to Refresh Data

To re-fetch fresh data from the public Elexon BMRS API and overwrite the committed Parquet snapshots in `backend/data/`:
```bash
# From repository root
python -m backend.scripts.fetch_data --refresh
```
* **Ingestion Strategy:** Queries `FUELHH` actuals chunked by 7-day settlement date windows (`fuelType=WIND`) and queries `WINDFOR` forecasts published between `2025-12-28` and `2026-01-31T23:59:59Z`.
* **Polite Rate Limiting:** Implements exponential back-off on HTTP 5xx errors, auto-shrinks chunk windows on HTTP 400/413 errors, and pauses 0.5s between requests.
* **Integrity Validation:** Every row is validated with Pydantic before saving.

---

## 6. How to Deploy to Heroku

GridBricks is pre-configured for the **Heroku Container Stack** via [`heroku.yml`](file:///d:/GridBricks%20Project/heroku.yml).

### Step-by-Step Deployment Commands:
```bash
# 1. Log in to the Heroku CLI
heroku login
heroku container:login

# 2. Create the Heroku app using container stack
heroku create gridbricks-wind-desk --stack container

# 3. Set production environment variables
heroku config:set APP_ENV=production LOG_LEVEL=INFO

# 4. Deploy via Git
git push heroku main

# Or alternatively build and push the Docker image directly:
heroku container:push web --app gridbricks-wind-desk
heroku container:release web --app gridbricks-wind-desk

# 5. Open the deployed application
heroku open --app gridbricks-wind-desk
```

---

## 7. Key Assumptions & Domain Conventions

1. **Decision Cutoff:** Defaulted to **09:00 Europe/London (GMT) on D-1**. January is in Greenwich Mean Time (UTC+0), but all datetime logic explicitly uses `ZoneInfo("Europe/London")` to ensure seamless operation across daylight saving transitions.
2. **Zero Look-Ahead Leakage Guarantee:**
   - Any forecast with `publish_time <= cutoff(D-1)` is eligible for selection ($\le$ semantics: a forecast published exactly at 09:00:00 is included).
   - Any forecast published after cutoff (even at `09:00:01`) is **strictly excluded** from decision forecasts and decision accuracy metrics. Unit tests explicitly verify this boundary.
3. **Missing Forecast Policy:** If no forecast was published prior to cutoff for a given settlement period, it is flagged as `forecast_missing = True`. The system **never imputes or silently fills** missing data.
4. **Error Sign Convention:**
   $$\text{Error} = \text{Forecast Generation} - \text{Actual Generation}$$
   - **Positive (+) Error:** Over-forecast (risk of under-procuring alternative power).
   - **Negative (−) Error:** Under-forecast (risk of over-procuring alternative power).
5. **WAPE over MAPE:**
   $$\text{WAPE} = \frac{\sum |\text{Forecast} - \text{Actual}|}{\sum \text{Actual}} \times 100\%$$
   MAPE divides by each half-hour's actual generation ($\frac{|\text{err}|}{\text{actual}}$), causing astronomical percentage distortions during calm wind periods (e.g. 50 MW actual). WAPE uses the portfolio-wide sum of actuals as the denominator, weighting errors by energy volume.
6. **Empirical P10/P90 Error Bands:** Quantiles are derived directly from the January 2026 dataset errors and serve as empirical risk envelopes, not probabilistic forecast guarantees.

---

## 8. Known Limitations

- **Elexon WINDFOR Resolution:** WINDFOR forecasts from Elexon BMRS are published on an **hourly** cadence (`:00`), whereas FUELHH actuals are **half-hourly** (`:00` and `:30`). For `:30` settlement periods, no exact forecast exists in WINDFOR; these are reported transparently as missing rather than synthetically interpolated.
- **National Level Aggregation:** Elexon data represents Great Britain national aggregate wind. Regional transmission constraints (e.g. Scottish export constraints across the B6 boundary) are outside the scope of this national-level dataset.
- **Scenario Demand:** Expected national demand in the What-If tool is a scenario input provided by the user, not a real-time Elexon feed.

---

## 9. AI Tools Used

In compliance with project specifications, AI assistance was utilized during the development of this application:
- **AI Tool:** **Google Antigravity AI Agent** (Advanced Agentic Coding Pair Programmer)
- **Role:** Antigravity assisted with end-to-end architecture planning, pure analytics module implementation, test-driven development (TDD), React/Recharts component authoring, and multi-stage container optimization. All code and mathematical formulas were rigorously reviewed, linted, and tested against hand-computed fixtures.
