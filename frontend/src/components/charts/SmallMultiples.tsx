import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { ChangeBadge } from '../ui/ChangeBadge';

export interface MarketHistoryItem {
  period: string;
  basket_cost: number | null;
}

export interface MarketMultipleItem {
  market_id: string;
  market_name: string;
  district: string;
  market_type: string;
  history: MarketHistoryItem[];
  trend_pct: number;
}

interface SmallMultiplesProps {
  markets: MarketMultipleItem[];
}

export const SmallMultiples: React.FC<SmallMultiplesProps> = ({ markets }) => {
  if (!markets || markets.length === 0) {
    return (
      <div className="py-8 text-center text-sm font-sans text-shelf-muted">
        No regional historical series found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((m) => {
        const cleanHistory = m.history.filter((h) => h.basket_cost !== null);
        const latestCost = cleanHistory.length > 0 ? cleanHistory[cleanHistory.length - 1].basket_cost : null;

        return (
          <div
            key={m.market_id}
            className="flex flex-col justify-between rounded-lg border border-hairline/80 bg-shelf-paper p-4 transition hover:border-cocoa hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-serif text-sm font-bold text-cocoa">{m.market_name}</h4>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-shelf-muted">
                    <span className="capitalize">{m.district}</span>
                    <span>•</span>
                    <span className="capitalize">{m.market_type}</span>
                  </div>
                </div>
                <ChangeBadge value={m.trend_pct} suffix="%" />
              </div>

              <div className="mt-2 flex items-baseline gap-1 font-mono">
                <span className="text-xs text-shelf-muted">Latest:</span>
                <span className="text-base font-bold text-cocoa">
                  {latestCost !== null ? `₹${latestCost.toFixed(2)}` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-3 h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cleanHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as MarketHistoryItem;
                        return (
                          <div className="rounded border border-hairline bg-shelf-paper px-2 py-1 font-mono text-[11px] shadow-sm">
                            <div className="text-shelf-muted">{data.period}</div>
                            <div className="font-bold text-cocoa">₹{data.basket_cost?.toFixed(2)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="basket_cost"
                    stroke="#5B3A29"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: '#5B3A29' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
};
