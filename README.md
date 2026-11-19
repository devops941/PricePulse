# 🏷️ PricePulse — Retail Inflation Tracker & Essential Goods Basket Intelligence

> **Institutional & Academic Notice:** All seed and synthetic price data is strictly labeled **"Illustrative Sample Data"** for academic, administrative, and algorithmic demonstration. It is not an official statistical release of the Ministry of Statistics and Programme Implementation (MOSPI) or Reserve Bank of India (RBI).

---

## 📌 1. Project Overview

**PricePulse** is an institutional-grade retail price intelligence and high-frequency inflation analytics platform. Traditional consumer price index (CPI) reports published by central statistical offices typically suffer from a **30 to 45-day reporting lag**. During periods of rapid climate fluctuations, supply chain shocks, or market cartels, this reporting delay prevents policymakers, commercial buyers, and ordinary citizens from responding quickly to real-world price changes.

PricePulse bridges this critical intelligence gap by tracking an official **Essential Goods Basket of 15 core commodities** (Vegetables, Cereals, Pulses, Edible Oils, Dairy, Spices, and Sugar) across **6 representative retail and wholesale markets in 3 districts** on a high-frequency **weekly** reporting cycle.

### Core Capabilities:
1. **Automated Ingestion & Physical Validation:** Ingests raw spot price observations across arbitrary measurement units (kg, grams, litres, millilitres, packets) and normalizes them into canonical units while screening out typographical errors using robust **Median Absolute Deviation (MAD)** statistical anomaly detection.
2. **Laspeyres Fixed-Weight Index Engine (`idx-v1`):** Calculates mathematically rigorous weekly and monthly inflation indices relative to an official base period anchor ($I_0 = 100.00$).
3. **Additive Points Contribution Decomposition:** Mathematically isolates and proves the exact degree to which individual commodities pushed the headline inflation rate up or down through exact additive **Points Contribution ($C_{it}$)** decomposition ($\sum C_{it} = I_t - I_{t-1}$).
4. **Real Purchasing Power Measurement:** Quantifies the true erosion in the purchasing power of a standard ₹100 currency note against the active essential consumption bundle.
5. **Short-Horizon Econometric Forecasting:** Deploys time-series models (**ARIMA, Holt-Winters Exponential Smoothing, and Naive baselines**) to generate 1-to-8-week forecasts with 80% and 95% uncertainty fan corridors.
6. **K-Means Basket Volatility Clustering:** Uses unsupervised machine learning to classify commodities into actionable volatility cohorts: Low-Volatility Staples, Moderate Fluctuations, and High-Volatility Perishables.
7. **Certified Print-Ready PDF Bulletins:** Automatically compiles and generates publication-grade, tamper-evident PDF bulletins powered by ReportLab.

---

## 💡 2. Real-Life Industry Case Studies & Scenarios

### 🌾 Scenario A: The Salaried Household Grocery Budget Shock
* **Real-World Situation:** Unseasonal monsoon downpours across major agricultural belts disrupt tomato and green chilli supply routes into metropolitan hubs. Within two weeks, tomato retail quotes surge from ₹28/kg to ₹75/kg.
* **How PricePulse Delivers Value:**
  - The household opens the **Dashboard Home (`/`)**.
  - They immediately see the headline monthly inflation rate rise by **+5.8%**, while the **Purchasing Power of ₹100** drops to **₹94.52** (a direct ₹5.48 purchasing power loss on essential staples).
  - The **Points Contribution Breakdown** reveals that Tomato alone drove **+2.86 index points** of the total inflation increase, providing empirical evidence that this is a transient perishable supply shock rather than structural monetary inflation.

### 🏬 Scenario B: Wholesale Mandi vs. Supermarket Retail Arbitrage
* **Real-World Situation:** A commercial restaurant operator or central kitchen manager purchases 50 kg of onions, 20 kg of pulses, and 15 litres of sunflower oil on a weekly basis.
* **How PricePulse Delivers Value:**
  - The buyer navigates to the **Markets & Price Gaps (`/markets`)** module.
  - The **Cheapest Basket Ranking** shows that purchasing the bundle from **Koyambedu Wholesale Mandi** costs **₹1,240**, whereas procuring the identical basket from an **Anna Nagar Retail Supermarket** totals **₹1,580** (+27.4% retail premium).
  - The **Dumbbell Price Spread Chart** demonstrates a ₹16/kg spread (+50% margin) on Onion Sambhar. The commercial buyer redirects orders directly to wholesale mandis, saving over ₹18,000 every month.

### 🛡️ Scenario C: Field Data Surveyor Typographical Error Quarantine
* **Real-World Situation:** A field surveyor in an agricultural terminal market accidentally types the spot price of green chilli as **₹600.00/kg** instead of **₹60.00/kg** (an unintentional extra zero entered on a mobile interface).
* **How PricePulse Delivers Value:**
  - In a standard database, this ten-fold entry error would corrupt the entire regional and headline inflation calculation.
  - In PricePulse, the **Ingestion Validator** detects that ₹600 exceeds the commodity's pre-configured physical ceiling (`max_plausible: 200.0`) and flags a **MAD robust z-score of 4.8σ**.
  - The corrupted observation is automatically **quarantined** and assigned to the **Review Desk (`/review`)**. A data analyst inspects the flagged card, presses key **`C`** to correct the value to ₹60.00, and recalculates the index without compromising historical accuracy.

### 🏛️ Scenario D: Government Policy & Strategic Buffer Stock Release
* **Real-World Situation:** The Department of Food & Civil Supplies monitors price trends of Tur Dal (Arhar), which has risen steadily from ₹145 to ₹168/kg over four consecutive reporting cycles.
* **How PricePulse Delivers Value:**
  - The market monitoring cell visits the **Forecasting Engine (`/forecast`)**.
  - The automated **ARIMA(1,1,0)** model projects Tur Dal to cross **₹185/kg** within four weeks ($H+4$).
  - Acting upon this early warning, authorities authorize the immediate release of strategic pulses buffer stocks through fair price cooperative distribution centers (PDS) before prices reach crisis levels for the public.

---

## 🧩 3. Comprehensive Module-by-Module Breakdown

| Module Name | Route | Operational Purpose & Utility | Practical Industry Application |
| :--- | :--- | :--- | :--- |
| **Dashboard Home** | `/` | **Executive Intelligence & Real-Time Inflation Summary:** Consolidates headline annual (YoY) and monthly (MoM) inflation figures, monthly consumption basket cost, purchasing power of ₹100, dynamic Category Inflation Pressure matrix, top price movers (risers/fallers), and active review queue. | Provides executive leadership, journalists, and citizens with an instantaneous 5-second snapshot of cost-of-living pressures and inflationary momentum. |
| **Index Engine** | `/index` | **Laspeyres Index Maths & Contribution Decomposition:** Executes the formal fixed-weight Laspeyres index ($I_t = 100 \sum w_i R_{it}$), chain-linking for basket revisions, chronological index ledger auditing, and additive points contribution decomposition. Supports arithmetic mean, median, and Jevons geometric mean aggregation. | Enables statistical economists to audit whether an inflation rise was driven by food staples or energy, review period-by-period calculations, and export certified ledgers to CSV. |
| **Markets & Price Gaps** | `/markets` | **Regional Price Dispersion & Wholesale-Retail Arbitrage:** Ranks markets from most economical to most expensive, plots regional price spreads with interactive Dumbbell charts, and visualizes price trends across mandis versus modern retail supermarkets. | Used by consumer protection boards and bulk procurement teams to verify if wholesale mandi price cuts are being passed down to neighborhood retail shoppers. |
| **Forecasting & Fans** | `/forecast` | **Econometric Projections & Basket Volatility Clustering:** Projects overall inflation and individual commodity prices 1 to 8 weeks into the future using ARIMA, ETS, and Naive models with 80% and 95% confidence intervals. Implements K-Means clustering to segment goods by historical price volatility. | Used by supply chain managers and agricultural departments to forecast festive commodity demand (e.g., sugar and edible oil before major festivals) and plan warehouse inventory. |
| **Prices & Weekly Grid** | `/prices` | **Spreadsheet-Style Ground Data Entry:** Enables field surveyors to record price observations through a single-item Quick Form, a high-speed keyboard-navigable 15-item Weekly Grid (featuring full Excel copy-paste functionality), or a filtered historical observations table. | Allows field data collection officers visiting wholesale terminal mandis to input a complete weekly price sweep of 15 commodities in under 60 seconds. |
| **Upload Conveyor** | `/prices` (Upload Tab) | **High-Throughput CSV/Excel Ingestion Wizard:** Imports large price datasets with automated header discovery, interactive column mapping, cryptographic SHA-256 deduplication, unit conversion, and dry-run preview validation. | Empowers regional administrative teams to bulk-upload weekly price spreadsheets submitted from 30+ disparate regional markets with zero data loss. |
| **Review Desk** | `/review` | **Outlier Quarantine & Quality Assurance Queue:** Automatically isolates suspicious price observations exceeding physical bounds or statistical MAD thresholds ($> 3.0\sigma$). Features rapid single-keystroke approval (`A`), inline editing (`C`), or rejection (`R`). | Quality assurance supervisors review quarantined items (e.g., unit-of-measure mix-ups or data entry typos) before certifying calculations for the public domain. |
| **Official Bulletins** | `/bulletins` | **Automated Publication & Certified PDF Desk:** Generates four standardized institutional publication formats (Monthly Bulletin, Weekly Watchlist, Mandi Price Sheet, Regional Note) using ReportLab with cryptographic timestamps and embedded vector charts. | Enables administrative agencies to generate, download, and archive officially certified PDF inflation bulletins for immediate press distribution. |
| **System Administration** | `/admin` | **Governance, Basket Weights & Master Catalog Management:** Features an interactive proportional **WeightBar** ensuring 100% total expenditure weight allocation before activation, item plausible bounds editor, market active switches, live user roster, and audit logs. | Administrators can adjust basket weights, configure new basket versions (v2.0), manage role permissions, and maintain a tamper-evident administrative audit log. |

---

## 🛠️ 4. Technical Architecture & Stack

```
PricePulse Monorepo Architecture:
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application factory & global error handlers
│   │   ├── core/                       # Config (pydantic-settings), database, logging, bootstrap
│   │   ├── api/v1/routers/             # Typed REST routers (auth, master, prices, uploads, index, markets, forecasts, anomalies, reports)
│   │   ├── schemas/                    # Pydantic v2 validation contracts & response models
│   │   ├── repositories/               # PyMongo database layer with mongomock fallback
│   │   ├── analytics/                  # Statistical & econometric algorithms:
│   │   │   ├── prices.py               # Aggregation (mean, median, Jevons geometric mean)
│   │   │   ├── index.py                # Laspeyres fixed-weight engine & canonical baselines
│   │   │   ├── chain.py                # Chain-linking for basket updates
│   │   │   ├── contributions.py        # Additive mathematical points decomposition
│   │   │   ├── anomalies.py            # MAD robust z-scores & physical sanity gates
│   │   │   └── forecast.py             # ETS, ARIMA, Naive, rolling-origin cross-validation, fan corridors
│   │   └── reports/
│   │       └── pdf_bulletin.py         # ReportLab PDF compiler with Shelf Tag typography
│   ├── scripts/
│   │   ├── seed_demo.py                # 52 weeks synthetic prices, 15 items, 6 markets, initial index run
│   │   └── clear_db.py                 # Clean database initialization utility
│   └── tests/                          # Automated test suites (Golden dataset, API, validation, auth)
└── frontend/
    ├── src/
    │   ├── features/                   # Home, Prices, Index, Markets, Forecast, Review, Bulletins, Admin
    │   ├── components/                 # Shelf Tag design system:
    │   │   ├── bento/                  # BentoGrid, BentoTile
    │   │   ├── charts/                 # IndexLineChart, WaterfallChart, DumbbellChart, FanChart
    │   │   └── ui/                     # HeroNumber (350ms count-up), ChangeBadge (▲▼■), StatusPill
    │   └── lib/                        # apiFetch HTTP client, auth provider, number formatters
```

### 🎨 Frontend Technologies
- **Core Library:** React 18 with TypeScript
- **Bundler:** Vite 5 (Sub-second hot module replacement & tree-shaken production bundles)
- **Styling Architecture:** Tailwind CSS styled with the custom **Shelf Tag** design system:
  - Cocoa Brown (`#5B3A29`) — Primary editorial brand, serif headlines, button tags
  - Shelf Paper (`#F4F2F1`) — Neutral reading background canvas
  - Warm Hairline (`#DDD6D2`) — Editorial dividers and card borders
  - Price Rise Red (`#8F2D17`) & Price Fall Green (`#2D6A4F`)
- **Typography:** Young Serif (editorial headers), Rethink Sans (body text), Fragment Mono (numerics & indicators)
- **Visualizations:** Recharts & bespoke responsive SVG components (Brush scrubber, Waterfall, Fan corridors, Dumbbell charts)
- **Iconography:** Tabler Icons React (`@tabler/icons-react`)
- **State Management & Querying:** TanStack React Query v5 & Native Fetch API with caching
- **Notifications:** Sonner interactive toast system

### ⚙️ Backend Technologies
- **Runtime:** Python 3.12+
- **Web Framework:** FastAPI (High-performance async ASGI architecture)
- **Validation Engine:** Pydantic v2 (Strict request validation and data transformation)
- **ASGI Web Server:** Uvicorn
- **Database Architecture:** PyMongo driver with MongoDB Atlas support and an integrated in-memory `mongomock` engine for zero-configuration local development
- **Security & Authorization:** JWT (HS256) access tokens, refresh tokens, bcrypt password hashing, and Role-Based Access Control (`Admin`, `Analyst`, `Collector`, `Viewer`)

### 📊 Mathematical & Statistical Libraries
- **Laspeyres Index Maths:** Pure Python vectorized implementations verified against baseline benchmark datasets
- **Points Decomposition:** Exact mathematical decomposition ($C_{it} = 100 \cdot w_i \cdot \Delta R_{it}$) verified to $10^{-9}$ numerical precision
- **Econometric Forecasting:** Statsmodels (ARIMA `(1,1,0)`, SimpleExpSmoothing ETS, Naive rolling-origin baselines)
- **Unsupervised Machine Learning:** Scikit-Learn (K-Means Clustering on price volatility CV% and momentum)
- **Outlier Detection:** NumPy-based Median Absolute Deviation (MAD) ($1.4826 \times \text{MAD}$)
- **Document Generation:** ReportLab PDF Engine with custom layout Flowables

---

## 🚀 5. How to Run This Project (Step-by-Step Guide)

### Prerequisites
- **Python:** Version 3.12 or higher ([Download Python](https://www.python.org/downloads/))
- **Node.js:** Version 18.0 or higher ([Download Node.js](https://nodejs.org/))
- **Git:** Version 2.20 or higher ([Download Git](https://git-scm.com/))

---

### Step 1: Open Terminal in Project Root
Open **PowerShell** (Windows) or **Terminal** (macOS/Linux) in the project root directory:
```powershell
cd "d:\gokul\collage-python-project\PricePulse – Retail Inflation Tracker & Essential Goods Basket"
```

---

### Step 2: Configure Environment Files
Ensure `.env` configuration files exist for both backend and frontend:
```powershell
# Copy template configurations if not already created
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
```

> **Zero-Setup Database Mode:** By default, `.env` is configured with `USE_MOCK_DB=true`. This runs a high-speed, 100% in-memory database using `mongomock`, eliminating the need to install or configure MongoDB locally. If connecting to a live MongoDB Atlas cluster, set `USE_MOCK_DB=false` and insert your Atlas connection string in `MONGODB_URI`.

---

### Step 3: Setup & Launch Backend Server

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Create Python virtual environment (if not already created)
python -m venv venv

# 3. Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# (macOS/Linux: source venv/bin/activate)

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Launch the FastAPI server
python -m uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000 --reload
```
The backend API service will be accessible at:
- **API Server:** http://localhost:8000
- **Swagger Interactive API Documentation:** http://localhost:8000/docs

---

### Step 4: Setup & Launch Frontend Application

Open a **second terminal window** in the project directory and execute:
```powershell
# 1. Navigate to the frontend directory
cd "d:\gokul\collage-python-project\PricePulse – Retail Inflation Tracker & Essential Goods Basket\frontend"

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
The web application interface will be live at:
- **Frontend Application:** http://localhost:5173

---

### Step 5: Log In with Administrator Credentials

Open your browser and navigate to **http://localhost:5173**. Log in with the pre-configured Super Administrator account:

| Field | Credentials |
| :--- | :--- |
| **Email** | `admin@gmail.com` |
| **Password** | `Admin@123` |
| **Role** | **Super Admin** (Full unrestricted access across all system features) |

---

### Step 6: One-Click 52-Week Baseline Seeding
When running the application for the first time:
1. Navigate to **Index Engine (`/index`)** or **Dashboard (`/`)**.
2. Click the **`+ Seed 52-Wk Baseline`** button in the top navigation bar.
3. This automatically seeds 15 essential goods, 6 markets across 3 districts, 52 weeks of synthetic price observations, and executes the official baseline index run. All cards, charts, forecasts, and volatility clusters will immediately populate with full interactive time-series data.

---

## 🧪 6. Testing & Quality Verification

You can execute automated test suites to verify mathematical accuracy and system health:

```powershell
# Run backend statistical unit & integration tests
cd backend
.\venv\Scripts\python -m pytest tests/ -v

# Run frontend TypeScript type-checking and production build
cd ../frontend
npm run build
```
- ✅ **Mathematical Precision:** `test_golden_index.py` verifies the Laspeyres index formula and Points Contribution to $10^{-9}$ precision.
- ✅ **Production Quality:** Vite build compiles with zero TypeScript errors or warnings.

---

## 📐 7. Mathematical & Statistical Reference Table

| Formula / Concept | Mathematical Equation | Function within PricePulse |
| :--- | :--- | :--- |
| **Laspeyres Price Index** | $$I_t = 100 \sum_{i=1}^n w_i \left(\frac{P_{it}}{P_{i0}}\right)$$ | Quantifies the aggregate retail price change of a fixed consumption basket relative to base period $0$. |
| **Purchasing Power of ₹100** | $$\text{PP}_{100} = \frac{10000}{I_t}$$ | Calculates real consumer rupee value erosion (e.g., if $I_t = 105.09$, ₹100 purchases ₹95.15 worth of goods). |
| **Points Contribution Decomposition** | $$C_{it} = 100 \cdot w_i \cdot \left(R_{it} - R_{i,t-1}\right)$$ | Exactly attributes aggregate index movement to specific item price shifts ($\sum C_{it} = I_t - I_{t-1}$). |
| **Median Absolute Deviation (MAD)** | $$\text{MAD} = \text{median}\left(\|P_i - \text{median}(P)\|\right)$$ | Outlier-resistant statistical scale parameter used to screen incoming prices in the Review Desk. |
| **Robust Z-Score** | $$z = \frac{\|P_i - \text{median}(P)\|}{1.4826 \cdot \text{MAD}}$$ | Identifies price spikes exceeding $3.0\sigma$ without distortion from extreme outliers. |
| **Chain-Linking Equation** | $$I_t^{\text{chained}} = I_k^{\text{old}} \times \frac{I_t^{\text{new}}}{100}$$ | Slices and splices historical index series across basket weight revisions without historical disruption. |

---

## 👥 8. Security & Role-Based Permissions

| Role | System Privileges |
| :--- | :--- |
| **Admin** | Unrestricted access: Basket Builder, Master Catalog CRUD, Plausible Bounds, User Roles, Review Desk, and PDF Bulletins. |
| **Analyst** | Analytical access: Dashboard, Index Engine, Forecasting, Markets, and PDF Generation. Read-only for Admin settings. |
| **Field Collector** | Data capture access: Weekly Price Grid, Quick Price Form, and CSV Upload Conveyor. |
| **Public Observer** | Read-only access: Published bulletins, landing page metrics, and headline dashboard summary. |

---

## 📄 License & Academic Integrity
Developed as a retail price intelligence and high-frequency inflation analytics platform for academic and analytical demonstration. All architectural patterns, econometric models, and visual styling follow modern software engineering best practices.
