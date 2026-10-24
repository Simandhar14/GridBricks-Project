# GridBricks — 10-Minute Video Demonstration Script

> **Structure:** 5-Minute Client Business Pitch + 5-Minute Technical Engineering Walkthrough  
> **Target Audience:** Utility Procurement Heads, Chief Risk Officers, Senior Software Architects

---

## Part 1: Client Business Pitch (0:00 – 5:00)

### 0:00 – 1:00 · The Commercial Problem & Desk Value Proposition
* **Presenter Hook:**
  > "Every morning before 09:00 London time, UK energy utilities face a multi-million-pound decision: how much power to buy on the day-ahead auction to cover customer demand. Weather-dependent wind generation is the single largest variable. If you trust the weather forecast blindly and wind under-delivers, you get crushed by imbalance cash-out prices. If you over-procure, you dump expensive surplus power at a loss."
* **Solution Introduction:**
  > "GridBricks was engineered specifically for day-ahead procurement desks. It isolates the exact forecast available when the trader clicks 'buy'—with strict zero look-ahead leakage—and quantifies forecast uncertainty using historical outturns."

### 1:00 – 2:30 · Live Walkthrough: D-1 Decision View & "What-If" Planning
* **Screen:** Open Dashboard at `http://localhost:8000/#/decision` (Delivery Day: 15 Jan 2026, Cutoff: 09:00 London).
* **Narrative:**
  * Point to the **KPI Cards**: Forecast Peak (MW), Average Generation, Total Delivery MWh, Matched Coverage, and the exact Model Vintage used.
  * Demonstrate the **Decision-Time Forecast vs. Actual Chart**: Show the blue forecast curve and black actual curve. Point to the **P10–P90 shaded empirical band**:
    > "Notice the shaded envelope. This isn't theoretical Gaussian noise. It's the empirical P10–P90 outturn range derived directly from Elexon BMRS January data. It shows the trader what could realistically happen."
  * Demonstrate the **What-If Scenario Widget**:
    * Enter an expected national demand of `32,000 MW`.
    * Show how it instantly computes the baseline purchase need (`~22,000 MW`), the conservative need (`~23,500 MW`), and highlights the **Recommended Buffer** of `1,500 MW`.
  * Highlight the **Half-Hourly Schedule Table** and click **Export CSV** to demonstrate frictionless downstream reporting for dispatch operators.

### 2:30 – 3:45 · Live Walkthrough: Accuracy & Risk Evaluation
* **Screen:** Navigate to **Accuracy View** (`#/accuracy`).
* **Narrative:**
  * Show the **Trader Insight Callout**:
    > "On average, January forecasts exhibited a persistent positive bias of +1,851 MW. Weather models consistently overestimated UK wind generation. GridBricks alerts the trader that relying on raw forecasts creates systematic under-hedging."
  * Tour the **4 Analytic Charts**:
    1. *Daily Error Trend:* Visualizing volatility across the 31 days.
    2. *Hour of Day:* Revealing stability overnight vs. morning ramp dispersion.
    3. *Lead Horizon:* Proving that error rises from 1,767 MW (near-gate) to 2,371 MW (48h+).
    4. *Error Histogram:* Highlighting tail risks where over-forecasts exceeded 4 GW.

### 3:45 – 5:00 · Live Walkthrough: Multi-Vintage Forecast Revisions
* **Screen:** Navigate to **Forecast Revisions View** (`#/revisions`).
* **Narrative:**
  * Show the multi-line chart with 20+ model runs published for the day.
  * Point out the **bold highlighted line**:
    > "Here is our decision forecast, locked at 09:00 on D-1. Notice how subsequent weather model updates shifted right before outturn. GridBricks gives traders visibility into forecast drift."
  * Open the **Methodology Drawer** from the top navbar: Show transparent definitions of WAPE vs. MAPE, D-1 cutoff logic, and zero look-ahead invariants.

---

## Part 2: Technical Engineering Walkthrough (5:00 – 10:00)

### 5:00 – 6:15 · Architecture & Project Organization
* **Screen:** Open VS Code showing the repository root.
* **Narrative:**
  * Explain the monorepo layout:
    * `/backend`: FastAPI, pure analytics domain module, Parquet snapshot caching.
    * `/frontend`: React 18, TypeScript, Tailwind CSS, TanStack Query, Recharts.
    * `/docs`: System architecture, trading analysis, and deployment specifications.
  * Highlight the **Committed Parquet Snapshots** in `backend/data/`:
    > "Rather than relying on live API calls that fail or rate-limit during production trading, data is ingested, validated with Pydantic, and committed as immutable Parquet snapshots."

### 6:15 – 7:30 · Domain Logic Purity & Strict No-Leakage Invariants
* **Screen:** Open [`backend/app/analytics.py`](file:///d:/GridBricks%20Project/backend/app/analytics.py).
* **Narrative:**
  * Walk through `get_decision_cutoff_utc`:
    > "Notice the explicit timezone handling: `ZoneInfo('Europe/London')` on day D-1. January is GMT, but this guarantees summertime BST safety."
  * Walk through `filter_decision_forecasts`:
    > "Here is the critical invariant: `publish_time <= cutoff_utc`. Any forecast published even one second after the cutoff is strictly filtered out."
  * Open [`backend/tests/test_analytics.py`](file:///d:/GridBricks%20Project/backend/tests/test_analytics.py) and show:
    * `test_l1_exact_cutoff_is_included`
    * `test_l2_one_second_after_cutoff_is_excluded`
    * Hand-calculated math tests validating MAE, RMSE, Bias, and WAPE.

### 7:30 – 8:30 · Test Suite Execution & Code Quality
* **Screen:** Terminal window.
* **Action:** Run the full test suite and linters live:
  ```powershell
  # Backend Tests (Domain logic & API endpoints)
  python -m pytest backend/tests/test_analytics.py backend/tests/test_api.py -v
  # Linting
  python -m ruff check backend/app backend/tests
  # Frontend Tests (Vitest + React Testing Library)
  cd frontend; npm test; npm run build
  ```
* **Narrative:**
  > "32 backend pytest cases pass in under 1 second. All 9 Vitest frontend tests pass. TypeScript compiles strictly with zero errors, and Vite builds the production bundle in 8 seconds."

### 8:30 – 9:30 · Single-Container Docker Architecture & Heroku Deployment
* **Screen:** Open [`Dockerfile`](file:///d:/GridBricks%20Project/Dockerfile) and [`heroku.yml`](file:///d:/GridBricks%20Project/heroku.yml).
* **Narrative:**
  * Explain the multi-stage build:
    * Stage 1: `node:20-alpine` builds the React frontend.
    * Stage 2: `python:3.12-slim` installs backend wheels, copies `frontend/dist`, and drops root privileges to `appuser`.
  * Explain dynamic `$PORT` binding:
    > "Heroku assigns a dynamic port at runtime. Our CMD uses `uvicorn backend.app.main:app --port ${PORT:-8000}`. FastAPI serves both the `/api/*` endpoints and the static SPA from the exact same container."

### 9:30 – 10:00 · CI/CD Automation & Summary
* **Screen:** Open [`.github/workflows/ci.yml`](file:///d:/GridBricks%20Project/.github/workflows/ci.yml).
* **Narrative:**
  * Explain the 3 automated GitHub Actions jobs:
    1. Python quality (Ruff, Black, Pytest).
    2. Frontend quality (TypeScript build, Vitest).
    3. Docker container build verification.
* **Wrap-up Statement:**
  > "GridBricks delivers a production-ready, mathematically audited, high-performance platform for UK power procurement desks. Clean code, zero look-ahead leakage, and trader-focused utility."
