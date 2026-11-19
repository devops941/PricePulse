import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen bg-shelf text-ink flex flex-col">
      <header className="border-b border-hairline bg-tile px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl text-cocoa font-normal">PricePulse</span>
          <span className="text-xs uppercase tracking-wider bg-cocoa-wash text-cocoa px-2 py-0.5 rounded-full font-sans font-semibold">
            Illustrative sample data
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link to="/" className="text-cocoa hover:text-cocoa-deep">Home</Link>
          <Link to="/design" className="text-muted hover:text-ink">Design System</Link>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <Routes>
          <Route
            path="/"
            element={
              <div className="p-8 bg-tile rounded-tile border border-hairline shadow-shelf">
                <h1 className="font-serif text-3xl text-ink mb-3">Retail Inflation Tracker</h1>
                <p className="text-muted text-base max-w-2xl">
                  Monitoring essential household baskets, validating prices across districts, and calculating fixed-weight Laspeyres price indices.
                </p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
