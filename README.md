# 🏷️ PricePulse — Retail Inflation Tracker & Essential Goods Basket Intelligence

> **Institutional & Academic Notice:** All seed and synthetic price data is strictly labeled **"Illustrative Sample Data"** for academic, administrative, and algorithmic demonstration. It is not an official release of the Ministry of Statistics and Programme Implementation (MOSPI) or Reserve Bank of India (RBI).

---

## 📌 1. Project Overview (திட்டத்தின் கண்ணோட்டம்)

**PricePulse** is a specialized retail price intelligence and inflation analytics platform. Traditional government CPI (Consumer Price Index) reports are released with a **30 to 45-day lag**, which is too slow for monitoring sudden market shocks, vegetable supply shortages, or local mandi price cartels.

PricePulse solves this by tracking a standardized **Essential Goods Basket of 15 core commodities** (Vegetables, Cereals, Pulses, Edible Oils, Dairy, Spices, and Sugar) across **6 retail and wholesale markets in 3 districts** on a high-frequency **weekly** reporting cadence.

### What PricePulse Does:
1. **Validates & Normalizes Ground Prices:** Ingests spot prices across units (kg, grams, litres, packets) and screens out typing mistakes or fraudulent data using **Median Absolute Deviation (MAD)** statistical anomaly detection.
2. **Computes Laspeyres Fixed-Weight Index (idx-v1):** Calculates mathematically rigorous weekly and monthly inflation indices relative to a fixed base period ($I_0 = 100.00$).
3. **Decomposes Inflation Drivers:** Mathematically proves which specific commodity pushed the index up or down through exact additive **Points Contribution ($C_{it}$)** decomposition.
4. **Calculates Real Purchasing Power:** Measures the true purchasing power of a ₹100 banknote against the essential consumption bundle.
5. **Projects Short-Term Price Trajectories:** Runs econometric models (**ARIMA, Holt-Winters Exponential Smoothing, Naive Baselines**) to generate 4-week forecasts with 80% and 95% confidence fan ribbons.
6. **Groups Basket Volatility with K-Means:** Unsupervised machine learning clusters commodities into Low-Volatility Staples, Moderate Fluctuations, and High-Volatility Perishables.
7. **Issues Publication-Grade Bulletins:** Generates print-ready, cryptographically verifiable PDF bulletins using ReportLab.

---

## 💡 2. Real-Life Industry Examples (நிஜ வாழ்க்கை பயன்பாடுகள்)

### 🌾 Scenario A: The Household Grocery Shock (குடும்ப பட்ஜெட் கண்காணிப்பு)
* **Real-Life Situation:** Heavy monsoon rains in Karnataka and Andhra Pradesh disrupt tomato and chilli supply routes into Chennai. Within two weeks, tomato jumps from ₹28/kg to ₹72/kg.
* **How PricePulse Helps:**
  - The family or consumer group logs in to the **Dashboard Home**.
  - They immediately see headline inflation rise to **+5.8%**, and the **Purchasing Power of ₹100** erode to **₹94.52** (a loss of ₹5.48 in real purchasing power).
  - The **Points Contribution Breakdown** shows Tomato alone drove **+2.86 index points** of the total rise, proving it is a temporary perishable supply shock rather than broad-based monetary inflation.

### 🏬 Scenario B: Wholesale Mandi vs. Supermarket Arbitrage (சந்தை விலை இடைவெளி)
* **Real-Life Situation:** A small restaurant owner or canteen manager in Madurai buys 50 kg of onions, 20 kg of pulses, and 15 litres of sunflower oil every week.
* **How PricePulse Helps:**
  - They open the **Markets & Price Gaps (`/markets`)** module.
  - The **Cheapest Basket Ranking** shows that buying from **Koyambedu Mandi** costs **₹1,240**, while an **Anna Nagar Retail Supermarket** costs **₹1,580** for the exact same basket (+27.4% retail markup).
  - The **Dumbbell Gap Chart** pinpoints that Onion Sambhar has a spread of ₹16/kg (+50% margin). The restaurant owner immediately switches wholesale procurement to save ₹18,000 monthly.

### 🛡️ Scenario C: Field Officer Data Entry Error Screening (தரவு பிழை கண்டறிதல்)
* **Real-Life Situation:** A field collector in Coimbatore types the spot price of green chilli as **₹600/kg** instead of **₹60/kg** (an extra zero entered by mistake on mobile).
* **How PricePulse Helps:**
  - In a naive system, this 10x error would artificially spike the entire district's inflation index.
  - In PricePulse, the **Ingestion Validator** detects that ₹600 exceeds the commodity's plausible ceiling (`max_plausible: 200.0`) and triggers a **MAD z-score of 4.8σ**.
  - The record is **quarantined** and redirected to the **Review Desk (`/review`)**. An analyst reviews the outlier card, presses **`C`** to correct it to ₹60.00, preserving index accuracy.

### 🏛️ Scenario D: Government Policy & Buffer Stock Intervention (அரசு கொள்முதல் திட்டம்)
* **Real-Life Situation:** The Department of Civil Supplies notices Tur Dal climbing steadily from ₹145 to ₹168/kg over 4 consecutive weeks.
* **How PricePulse Helps:**
  - The policy team visits the **Forecasting Engine (`/forecast`)**.
  - The **ARIMA(1,1,0)** model projects Tur Dal to breach **₹185/kg** within the next 4 weeks ($H+4$).
  - Guided by this early warning, the state government releases buffer stocks through cooperative fair price shops (PDS) before prices reach crisis levels.

---

## 🧩 3. Module-by-Module Breakdown ("எந்த Module எதுக்கு Use பண்றோம்?")

| Module Name | Route | What is it used for? (எதுக்கு Use பண்றோம்?) | Real-Life Example (யதார்த்த உதாரணம்) |
| :--- | :--- | :--- | :--- |
| **Dashboard Home** | `/` | **Executive Intelligence & Real-Time Inflation Summary:** Displays the headline YoY/MoM inflation rate, monthly consumption basket cost, purchasing power of ₹100, dynamic Category Inflation Pressure matrix, top price movers (risers/fallers), and active review queue. | A senior economist or citizen checks the overall health of the food economy in 5 seconds to know if prices are rising or easing. |
| **Index Engine** | `/index` | **Laspeyres Index Maths & Decomposition Engine:** Runs the official fixed-weight Laspeyres index ($I_t = 100 \sum w_i R_{it}$), chain-linking, period-by-period index ledger, and additive points contribution breakdown for every commodity. Supports arithmetic mean, median, and Jevons geometric mean aggregation. | An analyst audits whether the monthly inflation increase of +0.87% was caused by pulses or vegetables, and exports the certified run ledger to CSV. |
| **Markets & Price Gaps** | `/markets` | **Regional Price Dispersion & Wholesale-Retail Arbitrage:** Ranks markets from cheapest to most expensive, plots regional price spreads with interactive Dumbbell charts, and displays small-multiples price time-series across Mandis vs Bazaars. | A consumer or retail watchdog compares whether wholesale mandi price cuts are actually being passed on to neighborhood supermarket shoppers. |
| **Forecasting & Fans** | `/forecast` | **Time-Series Econometrics & Volatility Clustering:** Projects inflation and single-item price trajectories 1 to 8 weeks ahead using ARIMA, ETS, and Naive models with 80%/95% confidence intervals. Employs K-Means machine learning to group commodities by price stability. | Supply chain managers forecast festive season prices (e.g., sugar and edible oil before Diwali/Pongal) to decide advance warehouse procurement. |
| **Prices & Weekly Grid** | `/prices` | **Spreadsheet-Style Ground Data Entry:** Allows field surveyors to enter price observations via a Quick Form, a high-speed keyboard-navigable 15-item Weekly Grid (with Excel copy-paste support), or view historical observation records. | Field data collection officers visiting Koyambedu or Madurai Mandi enter 15 commodity quotes simultaneously in less than 60 seconds. |
| **Upload Conveyor** | `/prices` (Upload Tab) | **Bulk CSV/Excel Data Ingestion:** Uploads large price datasets with automatic header detection, interactive column mapping, SHA-256 deduplication, unit conversion, and dry-run preview before committing to the database. | District collection teams bulk-upload weekly price spreadsheets collected from 30 different markets with automated validation. |
| **Review Desk** | `/review` | **Outlier Quarantine & Quality Desk:** Quarantines suspicious price observations exceeding physical plausible bounds or statistical MAD thresholds ($> 3.0\sigma$). Allows single-keystroke approval (`A`), inline correction (`C`), or rejection (`R`). | A data verification officer inspects an anomaly card where milk was entered at ₹540 instead of ₹54, correcting it before recalculating the index. |
| **Official Bulletins** | `/bulletins` | **Automated PDF Publication Desk:** Generates four institutional PDF formats (Monthly Bulletin, Weekly Watchlist, Mandi Price Sheet, Regional Note) using ReportLab with cryptographic timestamps and custom chart renders. | The statistical department generates, downloads, and archives the official certified PDF inflation report for government press releases. |
| **System Administration** | `/admin` | **Governance, Basket Weights & System Master Data:** Features an interactive proportional **WeightBar** ensuring 100% total weight allocation before activation, item plausible bounds editor, market active switches, live user roster, and audit trail. | A system administrator adjusts the weight of vegetables in the basket from 24% to 28% and creates a new basket version v2.0 with audit logging. |

---

## 🛠️ 4. Technical Stack (தொழில்நுட்ப கட்டமைப்பு)

### 🎨 Frontend Architecture
- **Framework:** React 18 with TypeScript (Strict Type Safety)
- **Build Tool:** Vite 5 (Sub-second HMR & optimized production bundling)
- **Styling System:** Tailwind CSS with custom **Shelf Tag** editorial palette:
  - Cocoa Brown (`#5B3A29`) — Primary brand, serif typography, header tags
  - Shelf Paper (`#F4F2F1`) — Neutral background canvas
  - Warm Hairline (`#DDD6D2`) — Editorial dividers and card borders
  - Price Rise Red (`#8F2D17`) & Price Fall Green (`#2D6A4F`)
- **Typography:** Young Serif (display headers), Rethink Sans (body), Fragment Mono (numbers & indicators)
- **Data Visualizations:** Recharts & custom SVG renderers (Index trend series, Waterfall decomposition, Fan corridors, Dumbbell spreads)
- **Iconography:** Tabler Icons React (`@tabler/icons-react`)
- **State & Data Fetching:** TanStack React Query v5 & Native Fetch API with auto-revalidation
- **Toasts & Feedback:** Sonner notification system

### ⚙️ Backend Architecture
- **Language & Runtime:** Python 3.12+
- **API Framework:** FastAPI (High-performance async ASGI architecture)
- **Validation & Schemas:** Pydantic v2 (Strict request/response serialization contracts)
- **Server:** Uvicorn ASGI production server
- **Database Layer:** PyMongo with native MongoDB Atlas connectivity and seamless in-memory `mongomock` engine for zero-configuration offline execution
- **Authentication & Security:** JWT (JSON Web Tokens) HS256 with 30-minute access tokens, 7-day refresh tokens, passlib bcrypt password hashing, and Role-Based Access Control (`Admin`, `Analyst`, `Collector`, `Viewer`)

### 📊 Statistical & Machine Learning Engines
- **Laspeyres Index Formula Engine:** Pure Python vectorised calculation ($I_t = 100 \sum w_i R_{it}$)
- **Mathematical Points Decomposition:** Exact additive item point contribution ($C_{it} = 100 \cdot w_i \cdot \Delta R_{it}$) verified to $10^{-9}$ floating-point tolerance
- **Econometric Time-Series:** Statsmodels (ARIMA `(1,1,0)`, SimpleExpSmoothing ETS, Naive rolling-origin baselines)
- **Unsupervised Machine Learning:** Scikit-Learn (K-Means Clustering on Coefficient of Variation `CV%` and price momentum)
- **Outlier Detection:** Median Absolute Deviation (MAD) robust z-scores ($1.4826 \times \text{MAD}$)
- **Document Engine:** ReportLab PDF rendering with custom Flowables and canvas page numbering

---

## 🚀 5. How to Run This Project (எப்படி Run பண்ணுவது?)

### System Requirements
- **Python:** Version 3.12 or higher ([Download Python](https://www.python.org/downloads/))
- **Node.js:** Version 18.0 or higher ([Download Node.js](https://nodejs.org/))
- **Operating System:** Windows 10/11, macOS, or Linux

---

### Step 1: Clone or Navigate to the Project
Open **PowerShell** (on Windows) or **Terminal** (on Mac/Linux) and navigate to the project directory:
```powershell
cd "d:\gokul\collage-python-project\PricePulse – Retail Inflation Tracker & Essential Goods Basket"
```

---

### Step 2: Configure Environment Files
Ensure `.env` files exist in both the root and frontend directories:
```powershell
# Copy example environment files if not already present
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
```

> **Note on Database:** By default, `.env` includes `USE_MOCK_DB=true`. This runs a high-speed, 100% in-memory database using `mongomock`, requiring **no local MongoDB installation or cloud connection**. If you wish to connect to a real MongoDB Atlas cluster, set `USE_MOCK_DB=false` and provide your Atlas URI in `MONGODB_URI`.

---

### Step 3: Setup & Launch Backend Server

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create Python virtual environment (if not already created)
python -m venv venv

# 3. Activate virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# (On macOS/Linux: source venv/bin/activate)

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Start the FastAPI backend server
python -m uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000 --reload
```
The backend API will be live at:
👉 **http://localhost:8000**  
👉 **API Interactive Swagger Docs:** http://localhost:8000/docs

---

### Step 4: Setup & Launch Frontend Server

Open a **second terminal window** and run:
```powershell
# 1. Navigate to frontend directory
cd "d:\gokul\collage-python-project\PricePulse – Retail Inflation Tracker & Essential Goods Basket\frontend"

# 2. Install Node dependencies
npm install

# 3. Start Vite dev server
npm run dev
```
The frontend application will be live at:
👉 **http://localhost:5173**

---

### Step 5: Log in to the Application

Open your browser and navigate to **http://localhost:5173**. Use the Super Administrator credentials:

| Field | Credentials |
| :--- | :--- |
| **Email** | `admin@gmail.com` |
| **Password** | `Admin@123` |
| **Role** | **Super Admin** (Full unrestricted access across all modules) |

---

### Step 6: 1-Click Baseline Seeding
If you start on a fresh database:
1. Navigate to **Index Engine (`/index`)** or **Dashboard (`/`)**.
2. Click the **`+ Seed 52-Wk Baseline`** button in the header bar.
3. This automatically seeds 15 essential goods, 6 markets across 3 districts, 52 weeks of synthetic price observations, and computes the official baseline index run. All cards, charts, forecasts, and clusters will immediately come alive with full interactive data!

---

## 🧪 6. Verification & Automated Testing

You can run automated test suites to verify math and system integrity:

```powershell
# Run backend statistical unit & integration tests
cd backend
.\venv\Scripts\python -m pytest tests/ -v

# Run frontend production build check
cd ../frontend
npm run build
```
- ✅ **Mathematical Precision:** `test_golden_index.py` verifies Laspeyres formula and Points Contribution to $10^{-9}$ accuracy.
- ✅ **Production Build:** Vite produces optimized bundles with zero TypeScript or JSX compile errors.

---

## 📐 7. Mathematical & Statistical Reference Table

| Formula / Concept | Mathematical Equation | Purpose in PricePulse |
| :--- | :--- | :--- |
| **Laspeyres Price Index** | $$I_t = 100 \sum_{i=1}^n w_i \left(\frac{P_{it}}{P_{i0}}\right)$$ | Measures overall retail price change of a fixed consumption basket relative to base period $0$. |
| **Purchasing Power of ₹100** | $$\text{PP}_{100} = \frac{10000}{I_t}$$ | Demonstrates real consumer rupee value erosion (e.g. if $I_t = 105.09$, ₹100 buys ₹95.15 worth of goods). |
| **Points Contribution Decomposition** | $$C_{it} = 100 \cdot w_i \cdot \left(R_{it} - R_{i,t-1}\right)$$ | Breaks down total index change into exact commodity drivers ($\sum C_{it} = I_t - I_{t-1}$). |
| **Median Absolute Deviation (MAD)** | $$\text{MAD} = \text{median}\left(\|P_i - \text{median}(P)\|\right)$$ | Robust statistical screening resistant to extreme outliers for quarantine in the Review Desk. |
| **Robust Z-Score** | $$z = \frac{\|P_i - \text{median}(P)\|}{1.4826 \cdot \text{MAD}}$$ | Identifies price anomalies exceeding $3.0\sigma$ without being distorted by the outlier itself. |
| **Chain-Linking Ratio** | $$I_t^{\text{chained}} = I_k^{\text{old}} \times \frac{I_t^{\text{new}}}{100}$$ | Slices and splices updated basket weight revisions seamlessly without historical discontinuity. |

---

## 👥 8. Security & Access Control

| Role | Access Permissions |
| :--- | :--- |
| **Admin** | Full access to Basket Builder, Master Catalog, Plausible Bounds, User Roles, Review Desk, and PDF Bulletins. |
| **Analyst** | Access to Dashboard, Index Engine, Forecasting, Markets, and PDF Generation. Read-only for Admin settings. |
| **Field Collector** | Access to Weekly Price Grid, Quick Price Form, and CSV Upload Conveyor. |
| **Public Viewer** | Read-only access to published bulletins, landing page, and headline dashboard summary. |

---

## 📄 License & Academic Integrity
Developed as a comprehensive retail inflation intelligence software project for academic and analytical demonstration. All code and designs follow modern clean architecture principles.
