import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import {
  IconBuildingStore,
  IconScale,
  IconFileCertificate,
  IconShieldCheck,
  IconArrowRight,
  IconDownload,
  IconCoins,
  IconCalculator,
  IconUserCircle,
} from '@tabler/icons-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedItemName, setSelectedItemName] = useState<string>('Standard Basket');
  const [rupeesAmount, setRupeesAmount] = useState<number>(100);

  // Fetch published bulletin from backend
  const { data: publishedReport } = useQuery({
    queryKey: ['published-landing'],
    queryFn: () => apiFetch<any>('/reports/landing/published'),
  });

  // Purchasing power calculations
  const purchasingData: Record<string, { currentUnit: string; baseQty: number; currentQty: number; unitLabel: string }> = {
    'Standard Basket': { currentUnit: 'units', baseQty: 1.0, currentQty: 0.88, unitLabel: 'basket' },
    'Tomato': { currentUnit: 'kg', baseQty: 5.0, currentQty: 2.63, unitLabel: 'kg' },
    'Onion': { currentUnit: 'kg', baseQty: 4.0, currentQty: 2.35, unitLabel: 'kg' },
    'Milk': { currentUnit: 'L', baseQty: 2.2, currentQty: 1.85, unitLabel: 'L' },
    'Mustard Oil': { currentUnit: 'L', baseQty: 0.8, currentQty: 0.61, unitLabel: 'L' },
  };

  const itemPower = purchasingData[selectedItemName] || purchasingData['Standard Basket'];
  const calcBase = (itemPower.baseQty * (rupeesAmount / 100)).toFixed(2);
  const calcCurrent = (itemPower.currentQty * (rupeesAmount / 100)).toFixed(2);
  const shrinkagePct = Math.round(((itemPower.baseQty - itemPower.currentQty) / itemPower.baseQty) * 100);

  const headlineYoY = publishedReport?.summary?.headline_yoy ?? 5.82;
  const period = publishedReport?.period ?? '2025-W04';

  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-cocoa/20 bg-shelf-paper p-8 shadow-md md:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6 mb-8">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-cocoa px-3 py-1 font-serif text-xs font-bold text-white shadow-xs">
              PricePulse
            </span>
            <span className="font-serif text-xs text-shelf-muted uppercase tracking-wider">
              Essential Household Retail Intelligence
            </span>
          </div>
          <span className="rounded-full bg-shelf-base px-3 py-1 font-mono text-xs text-shelf-muted border border-hairline">
            Illustrative sample data
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Hero Left: Headline text */}
          <div className="lg:col-span-7 space-y-5">
            <h1 className="font-serif text-3xl font-extrabold text-cocoa sm:text-5xl leading-tight">
              Retail Inflation Tracker & Essential Goods Basket
            </h1>
            <p className="font-sans text-sm text-shelf-muted sm:text-base leading-relaxed max-w-xl">
              Monitoring high-frequency market prices across districts, eliminating outliers with robust-z scoring,
              and calculating pure fixed-weight Laspeyres price indices.
            </p>

            {/* Quick Hero Metrics Strip */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="font-mono">
                <span className="block text-xs text-shelf-muted uppercase">Headline YoY Inflation</span>
                <span className="text-3xl font-extrabold text-price-rise">
                  ▲ +{headlineYoY.toFixed(2)}%
                </span>
              </div>
              <div className="h-10 w-px bg-hairline" />
              <div className="font-mono">
                <span className="block text-xs text-shelf-muted uppercase">Latest Reporting Period</span>
                <span className="text-2xl font-bold text-cocoa">{period}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                to="/"
                className="flex items-center gap-2 rounded-lg bg-cocoa px-5 py-2.5 font-serif text-sm font-bold text-white hover:bg-cocoa/90 transition shadow-sm"
              >
                <span>Launch Dashboard Home</span>
                <IconArrowRight size={16} />
              </Link>
              <Link
                to="/index"
                className="flex items-center gap-2 rounded-lg border border-hairline bg-shelf-base px-5 py-2.5 font-serif text-sm font-bold text-cocoa hover:bg-hairline/60 transition"
              >
                <span>Explore Index Engine</span>
              </Link>
            </div>
          </div>

          {/* Hero Right: Interactive "What does ₹100 buy today?" Card */}
          <div className="lg:col-span-5 rounded-xl border-2 border-hairline bg-shelf-base p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-hairline pb-3 mb-4">
              <div className="rounded-md bg-cocoa/10 p-2 text-cocoa">
                <IconCalculator size={20} />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-cocoa">What does ₹{rupeesAmount} buy today?</h3>
                <p className="text-[11px] text-shelf-muted">Interactive purchasing power erosion calculator</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Item picker */}
              <div>
                <label className="text-xs font-serif font-bold text-cocoa block mb-1">Select Basket Commodity</label>
                <div className="grid grid-cols-3 gap-1.5 font-sans text-xs">
                  {Object.keys(purchasingData).map((it) => (
                    <button
                      key={it}
                      onClick={() => setSelectedItemName(it)}
                      className={`rounded px-2 py-1.5 font-medium transition ${
                        selectedItemName === it
                          ? 'bg-cocoa text-white shadow-xs'
                          : 'bg-shelf-paper border border-hairline text-shelf-muted hover:text-cocoa'
                      }`}
                    >
                      {it}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount slider */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-shelf-muted">Currency Amount:</span>
                  <span className="font-bold text-cocoa">₹{rupeesAmount}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={50}
                  value={rupeesAmount}
                  onChange={(e) => setRupeesAmount(parseInt(e.target.value))}
                  className="w-full accent-cocoa"
                />
              </div>

              {/* Purchasing Power Output Bento */}
              <div className="rounded-lg border border-hairline bg-shelf-paper p-4 font-mono space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-shelf-muted">Base Year Purchasing Quantity:</span>
                  <span className="font-bold text-cocoa">
                    {calcBase} {itemPower.unitLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-shelf-muted">Current Quantity Bought:</span>
                  <span className="font-bold text-price-rise">
                    {calcCurrent} {itemPower.unitLabel}
                  </span>
                </div>
                <div className="border-t border-hairline pt-2 flex items-center justify-between text-xs">
                  <span className="text-price-rise font-medium">Real Volume Loss:</span>
                  <span className="rounded bg-price-rise/10 px-2 py-0.5 font-bold text-price-rise">
                    -{shrinkagePct}% Volume
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works in 4 Hanging Tags (§10.6, §14) */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold text-cocoa">How PricePulse Works</h2>
          <p className="text-xs text-shelf-muted mt-1">Four rigorous operational phases from retail shelf to published index</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tag 1 */}
          <div className="relative rounded-xl border border-hairline bg-shelf-paper p-6 shadow-sm transition hover:border-cocoa hover:shadow-md">
            <div className="mb-3 inline-flex rounded-lg bg-cocoa/10 p-2.5 text-cocoa">
              <IconBuildingStore size={22} />
            </div>
            <span className="block font-mono text-[11px] font-bold text-shelf-muted uppercase">Phase 01</span>
            <h3 className="font-serif text-base font-bold text-cocoa mt-1">Multi-Market Collection</h3>
            <p className="mt-2 text-xs text-shelf-muted leading-relaxed">
              Price observations collected across wholesale terminal mandis and suburban retail stores with role-scoped authentication.
            </p>
          </div>

          {/* Tag 2 */}
          <div className="relative rounded-xl border border-hairline bg-shelf-paper p-6 shadow-sm transition hover:border-cocoa hover:shadow-md">
            <div className="mb-3 inline-flex rounded-lg bg-cocoa/10 p-2.5 text-cocoa">
              <IconScale size={22} />
            </div>
            <span className="block font-mono text-[11px] font-bold text-shelf-muted uppercase">Phase 02</span>
            <h3 className="font-serif text-base font-bold text-cocoa mt-1">Unit Normalization & Outliers</h3>
            <p className="mt-2 text-xs text-shelf-muted leading-relaxed">
              Automatic packaging converter (g to kg, mL to L) and robust Median Absolute Deviation (MAD) z-score screening.
            </p>
          </div>

          {/* Tag 3 */}
          <div className="relative rounded-xl border border-hairline bg-shelf-paper p-6 shadow-sm transition hover:border-cocoa hover:shadow-md">
            <div className="mb-3 inline-flex rounded-lg bg-cocoa/10 p-2.5 text-cocoa">
              <IconShieldCheck size={22} />
            </div>
            <span className="block font-mono text-[11px] font-bold text-shelf-muted uppercase">Phase 03</span>
            <h3 className="font-serif text-base font-bold text-cocoa mt-1">Laspeyres Index Engine</h3>
            <p className="mt-2 text-xs text-shelf-muted leading-relaxed">
              Pure Python index engine calculates Laspeyres series, chain-links updates, and decomposes exact points contributions.
            </p>
          </div>

          {/* Tag 4 */}
          <div className="relative rounded-xl border border-hairline bg-shelf-paper p-6 shadow-sm transition hover:border-cocoa hover:shadow-md">
            <div className="mb-3 inline-flex rounded-lg bg-cocoa/10 p-2.5 text-cocoa">
              <IconFileCertificate size={22} />
            </div>
            <span className="block font-mono text-[11px] font-bold text-shelf-muted uppercase">Phase 04</span>
            <h3 className="font-serif text-base font-bold text-cocoa mt-1">Official Publication</h3>
            <p className="mt-2 text-xs text-shelf-muted leading-relaxed">
              Automatic generation of print-ready PDF bulletins, public dashboard streaming, and immutable audit logs.
            </p>
          </div>
        </div>
      </div>

      {/* Role Entry Section */}
      <div className="rounded-xl border border-hairline bg-shelf-paper p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h2 className="font-serif text-xl font-bold text-cocoa">Role-Based Access Portals</h2>
          <p className="text-xs text-shelf-muted mt-1">Select your operational workspace or explore as a public viewer</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/login"
            className="flex flex-col items-center rounded-lg border border-hairline bg-shelf-base/50 p-5 text-center transition hover:border-cocoa hover:bg-shelf-base"
          >
            <IconUserCircle size={28} className="text-cocoa mb-2" />
            <h4 className="font-serif text-sm font-bold text-cocoa">Administrator</h4>
            <p className="mt-1 text-[11px] text-shelf-muted">Manage basket weights, markets, items, and users</p>
          </Link>

          <Link
            to="/login"
            className="flex flex-col items-center rounded-lg border border-hairline bg-shelf-base/50 p-5 text-center transition hover:border-cocoa hover:bg-shelf-base"
          >
            <IconUserCircle size={28} className="text-cocoa mb-2" />
            <h4 className="font-serif text-sm font-bold text-cocoa">Research Analyst</h4>
            <p className="mt-1 text-[11px] text-shelf-muted">Run index calculations, review desk audits, and forecasts</p>
          </Link>

          <Link
            to="/login"
            className="flex flex-col items-center rounded-lg border border-hairline bg-shelf-base/50 p-5 text-center transition hover:border-cocoa hover:bg-shelf-base"
          >
            <IconUserCircle size={28} className="text-cocoa mb-2" />
            <h4 className="font-serif text-sm font-bold text-cocoa">Field Collector</h4>
            <p className="mt-1 text-[11px] text-shelf-muted">Weekly price matrix grid, quick forms, and CSV upload</p>
          </Link>

          <Link
            to="/"
            className="flex flex-col items-center rounded-lg border border-cocoa/40 bg-cocoa/5 p-5 text-center transition hover:bg-cocoa/10"
          >
            <IconUserCircle size={28} className="text-cocoa mb-2" />
            <h4 className="font-serif text-sm font-bold text-cocoa">Public Viewer</h4>
            <p className="mt-1 text-[11px] text-shelf-muted">Explore regional prices, small multiples, and live charts</p>
          </Link>
        </div>
      </div>
    </div>
  );
};
