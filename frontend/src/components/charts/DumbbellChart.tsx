import React from 'react';

export interface DumbbellItem {
  item_id: string;
  item_name: string;
  category_name: string;
  unit: string;
  min_price: number;
  min_market: string;
  max_price: number;
  max_market: string;
  spread_abs: number;
  spread_pct: number;
  avg_price: number;
}

interface DumbbellChartProps {
  data: DumbbellItem[];
  maxRange?: number;
}

export const DumbbellChart: React.FC<DumbbellChartProps> = ({ data, maxRange }) => {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-sm font-sans text-shelf-muted">
        No price gap records available for this period.
      </div>
    );
  }

  // Calculate highest price overall to scale horizontal bars
  const computedMax = maxRange || Math.max(...data.map(d => d.max_price), 100) * 1.1;

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const minPct = (item.min_price / computedMax) * 100;
        const maxPct = (item.max_price / computedMax) * 100;

        return (
          <div
            key={item.item_id}
            className="group relative rounded-md border border-hairline/80 bg-shelf-paper p-3 transition hover:border-cocoa hover:shadow-sm"
          >
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-bold text-cocoa">{item.item_name}</span>
                <span className="rounded bg-shelf-base px-1.5 py-0.5 font-mono text-[11px] text-shelf-muted">
                  per {item.unit}
                </span>
                <span className="text-xs text-shelf-muted">({item.category_name})</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-price-rise font-bold">Gap: ₹{item.spread_abs.toFixed(2)}</span>
                <span className="rounded bg-price-rise/10 px-1 py-0.5 font-semibold text-price-rise">
                  +{item.spread_pct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Dumbbell Bar Line */}
            <div className="relative h-6 w-full flex items-center">
              {/* Background scale track */}
              <div className="absolute inset-x-0 h-1.5 rounded-full bg-shelf-base" />

              {/* Connecting spread bar */}
              <div
                className="absolute h-1.5 rounded-full bg-cocoa/40 transition-all group-hover:bg-cocoa/60"
                style={{
                  left: `${minPct}%`,
                  width: `${Math.max(maxPct - minPct, 1)}%`
                }}
              />

              {/* Min Marker */}
              <div
                className="absolute -translate-x-1/2 flex flex-col items-center group/min"
                style={{ left: `${minPct}%` }}
              >
                <div className="h-4 w-4 rounded-full border-2 border-white bg-price-fall shadow-sm" />
                <span className="mt-1 font-mono text-[10px] font-bold text-price-fall whitespace-nowrap">
                  ₹{item.min_price.toFixed(1)}
                </span>
              </div>

              {/* Max Marker */}
              <div
                className="absolute -translate-x-1/2 flex flex-col items-center group/max"
                style={{ left: `${maxPct}%` }}
              >
                <div className="h-4 w-4 rounded-full border-2 border-white bg-price-rise shadow-sm" />
                <span className="mt-1 font-mono text-[10px] font-bold text-price-rise whitespace-nowrap">
                  ₹{item.max_price.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Sub-labels showing markets */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-shelf-muted">
              <span>
                Cheapest in: <strong className="font-medium text-price-fall">{item.min_market}</strong>
              </span>
              <span>
                Highest in: <strong className="font-medium text-price-rise">{item.max_market}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
