# PricePulse — Retail Inflation Tracker & Essential Goods Basket Intelligence

> **Disclaimer:** All seed and demo data is **Illustrative sample data** for academic and exploratory demonstrations. Never present it as official CPI/market statistics.

## Overview
PricePulse tracks a defined basket of essential consumer goods across markets and time periods, validates each collected price observation, computes Laspeyres fixed-weight price indices with chain-linking, item contributions, purchasing power metrics, and flags anomalies for human review.

## Architecture
- **Backend:** FastAPI (Python 3.12), Pydantic v2 + `pydantic-settings`, PyMongo (MongoDB Atlas), NumPy, Pandas, SciPy, statsmodels, slowapi rate limiting.
- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives), TanStack Query, TanStack Table, Recharts, Tabler Icons, `@fontsource/{young-serif, rethink-sans, fragment-mono}`.
- **Design System:** "Shelf Tag" light theme with warm cocoa palette, hanging price tags, shelf strip, bento tiles, and tabular numerals.

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm
- MongoDB Atlas connection string (or local mock for development)

### 1. Environment Setup
Copy the example environment files:
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```
Fill in your `MONGODB_URI` and `JWT_SECRET` in `.env`.

### 2. Backend Setup
```bash
python -m venv backend/venv
# Windows:
backend\venv\Scripts\activate
# Linux/Mac:
source backend/venv/bin/activate

pip install -r backend/requirements.txt
pytest
uvicorn app.main:create_app --factory --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## User Roles & Demo Credentials
- **Admin:** Master basket management, markets, user provisioning, audit trail.
- **Analyst:** Run index calculations, review forecasts and anomaly flags, generate bulletins.
- **Collector:** Enter and upload price observations for assigned markets.
- **Viewer:** Read-only access to published dashboards and bulletins.

## API Documentation
Interactive Swagger UI: `http://localhost:8000/api/docs`
ReDoc: `http://localhost:8000/api/redoc`
Health Check: `http://localhost:8000/api/v1/health`
