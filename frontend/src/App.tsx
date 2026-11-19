import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { DesignShowcase } from './features/design/DesignShowcase';
import { PriceTagNav } from './components/nav/PriceTagNav';
import { CommandPalette } from './components/ui/CommandPalette';

export default function App() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [period, setPeriod] = useState('Oct 2026');

  return (
    <>
      <Routes>
        <Route path="/design" element={<DesignShowcase />} />
        <Route
          path="/*"
          element={
            <div className="min-h-screen bg-shelf text-ink flex flex-col">
              <PriceTagNav
                currentRole="Admin"
                userName="Gokul Analyst"
                currentPeriod={period}
                onPeriodChange={setPeriod}
                onOpenCommandPalette={() => setCmdOpen(true)}
              />
              <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
                <div className="p-8 bg-tile rounded-tile border border-hairline shadow-shelf">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-serif text-3xl text-ink">Retail Inflation Tracker</span>
                    <span className="text-xs font-mono bg-cocoa text-white px-2 py-0.5 rounded-full">
                      PricePulse
                    </span>
                  </div>
                  <p className="text-muted text-sm max-w-2xl leading-relaxed mb-6">
                    Monitoring essential household baskets, validating prices across districts, and calculating fixed-weight Laspeyres price indices.
                  </p>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/design"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep transition-colors shadow-shelf"
                    >
                      View "Shelf Tag" Design System Showcase (/design)
                    </Link>
                  </div>
                </div>
              </main>
              <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
            </div>
          }
        />
      </Routes>
    </>
  );
}
