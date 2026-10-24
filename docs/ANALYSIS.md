# January 2026 UK Wind Forecast Accuracy — Trading Desk Briefing

> **Audience:** Day-Ahead Power Traders, Procurement Risk Managers, Structuring Desks  
> **Dataset:** Elexon BMRS (`FUELHH` Outturns vs. `WINDFOR` Multi-Vintage Day-Ahead Forecasts)  
> **Delivery Scope:** 1 January 2026 to 31 January 2026 (744 Delivery Hours / 1,488 Settlement Periods)  
> **Benchmark Invariant:** Decision cutoff fixed at **09:00 Europe/London (GMT) on D-1**

---

## Executive Summary & Key Takeaways

1. **Systematic Over-Forecasting (+1,851.5 MW Mean Bias):**  
   Across January 2026, day-ahead wind forecasts consistently overestimated outturn generation. Out of 744 evaluated hours, the median error was **+1,694.0 MW**, with mean bias reaching **+1,851.5 MW**. If a procurement desk bought residual power strictly against the raw forecast, it was systematically **under-hedged** in day-ahead auctions.
2. **Portfolio Error Magnitude (MAE 2,127.5 MW / WAPE 18.37%):**  
   The Mean Absolute Error across January was **2,127.5 MW**, representing a volume-weighted percentage error (WAPE) of **18.37%**. Because UK wind generation regularly swings between 2,000 MW and 19,000 MW, WAPE provides a far more stable benchmark than MAPE, which distorts wildly during low-wind spells.
3. **Severe Tail Risk (P90 Absolute Error = 4,306.4 MW):**  
   In 10% of settlement hours, the forecast deviated from actual wind by more than **4.3 GW**. Desks relying solely on mean forecasts without volumetric safety buffers faced significant exposure to cash-out imbalance prices.
4. **Predictable Lead-Time Decay:**  
   Forecast accuracy degrades monotonically as the lead horizon increases: MAE is **1,767.7 MW** at 0–6 hours ahead, rising to **2,122.6 MW** at day-ahead decision time (24–36h), and reaching **2,371.9 MW** at 48h+. This creates systematic arbitrage opportunities for desks that actively re-trade positions in intraday continuous markets.

---

## Detailed Performance Metrics

| Metric | January 2026 Value | Unit | Commercial Interpretation |
|---|---|---|---|
| **Evaluated Hours** | `744` | Hours | 100% complete temporal coverage across all 31 days |
| **Mean Absolute Error (MAE)** | `2,127.5` | MW | Average volumetric deviation between forecast and actual |
| **Root Mean Squared Error (RMSE)** | `2,606.1` | MW | Measures volatility; reflects occasional large forecast busts |
| **Mean Bias** | `+1,851.5` | MW | Positive indicates persistent over-prediction by numerical weather models |
| **WAPE** | `18.37%` | % | Volume-weighted error relative to total January wind production |
| **P10 Signed Error** | `-426.4` | MW | Under-forecast threshold: actual exceeded forecast by >426 MW in only 10% of hours |
| **P50 Signed Error (Median)** | `+1,694.0` | MW | Median over-forecast error |
| **P90 Signed Error** | `+4,306.4` | MW | Extreme over-forecast threshold: forecast was >4.3 GW too high in 10% of hours |
| **P90 Absolute Error** | `4,306.4` | MW | Suggested reserve buffer to cover 90% of all potential shortfalls |

---

## Analysis by Forecast Lead Horizon

Analyzing all published `WINDFOR` vintages against outturn data reveals how weather model uncertainty compounds over time:

```
Lead Horizon Bucket      MAE (MW)      Mean Bias (MW)    Evaluated Forecasts
─────────────────────────────────────────────────────────────────────────────
0–6h (Near-Gate)         1,767.7 MW      +1,548.3 MW           1,488
6–12h (Same-Day)         1,833.7 MW      +1,616.1 MW           1,488
12–24h (D-1 Evening)     1,990.9 MW      +1,811.2 MW           2,976
24–36h (D-1 Morning)     2,122.6 MW      +1,838.5 MW           2,976
36–48h (D-2 Outlook)     2,337.0 MW      +2,004.5 MW           2,945
48h+ (Multi-Day)         2,371.9 MW      +1,479.6 MW           2,510
```

### Strategic Implications for Intraday Trading
* The **354.9 MW MAE reduction** between D-1 auction gate (24–36h) and gate closure (0–6h) represents significant actionable alpha.
* Desks with intraday trading capabilities can execute planned position unwinds: procuring a conservative buffer in the day-ahead auction, then selling back surplus thermal power in intraday continuous trading as the wind outturn crystallizes.

---

## Diurnal & Hourly Profiling

* **Overnight Hours (23:00–05:00 GMT):** Show lower volatility and tighter forecast envelopes, driven by stable atmospheric boundary conditions over offshore wind hubs (Dogger Bank, Hornsea, Moray East).
* **Morning Ramp (07:00–10:00 GMT):** Exhibits heightened forecast dispersion corresponding with peak continental power demand and shifting surface thermal gradients.
* **Evening Peak (17:00–20:00 GMT):** High financial risk: forecast errors occurring during peak demand periods coincided with tight system margins and elevated balancing mechanism (BM) cashout spikes.

---

## Practical Actionable Buying Guidance

### 1. Apply a Systematic De-Biasing Haircut
Do not procure against raw `WINDFOR` day-ahead forecasts. Throughout January 2026, raw forecasts were on average **~1.85 GW higher** than actual generation.
* **Recommendation:** Subtract a de-biasing haircut of **1,200 MW to 1,500 MW** from the raw day-ahead forecast before calculating the net thermal/import procurement volume.

### 2. Dimension the 90% Confidence Reserve Buffer
* The historical **P90 absolute error is 4,306 MW**.
* For mission-critical baseload supply where imbalance penalties are punitive, the desk should ensure flexible access (e.g., peaker gas, pumped storage, or liquid intraday exchange credit) to **at least 4.0 GW** of balancing capability across the national portfolio.

### 3. Leverage the GridBricks "What-If" Scenario Tool
* Utilize the interactive What-If widget on the **Decision View** to dynamically stress-test portfolio residual purchase obligations against the empirical **P10 wind lower bound**.
* If national demand is projected at 32,000 MW and wind is forecast at 10,000 MW, the baseline procurement need is 22,000 MW. The conservative requirement (P10 wind) is ~23,500 MW, indicating a **1,500 MW recommended buffer**.

