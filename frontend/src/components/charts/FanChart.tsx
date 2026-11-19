import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface ForecastPoint {
  period: string;
  mean: number;
  lower_80: number;
  upper_80: number;
  lower_95: number;
  upper_95: number;
  actual?: number | null;
  is_forecast?: boolean;
}

export interface HistoricalPoint {
  period: string;
  actual: number;
  is_forecast?: boolean;
}

interface FanChartProps {
  historicalData?: HistoricalPoint[];
  forecastData: ForecastPoint[];
  metricLabel?: string;
  unit?: string;
}

export const FanChart: React.FC<FanChartProps> = ({
  historicalData = [],
  forecastData = [],
  metricLabel = 'Value',
  unit = '',
}) => {
  if ((!historicalData || historicalData.length === 0) && (!forecastData || forecastData.length === 0)) {
    return (
      <div className="py-16 text-center text-sm font-sans text-shelf-muted">
        No time-series or forecast data available.
      </div>
    );
  }

  // Anchor period (T0) from forecast data (first item in forecast is T0)
  const anchorPeriod = forecastData.length > 0 ? forecastData[0].period : null;

  // Build unified continuous timeline
  const combinedPoints: any[] = [];

  // Add historical points (excluding anchor if it overlaps with forecast anchor)
  historicalData.forEach((h) => {
    if (h.period !== anchorPeriod) {
      combinedPoints.push({
        period: h.period,
        actual: h.actual,
        mean: null,
        lower_80: null,
        upper_80: null,
        lower_95: null,
        upper_95: null,
        band95_base: null,
        band95_range: null,
        band80_base: null,
        band80_range: null,
        is_forecast: false,
      });
    }
  });

  // Add forecast points (including anchor T0)
  forecastData.forEach((f) => {
    const range95 = Math.max(f.upper_95 - f.lower_95, 0);
    const range80 = Math.max(f.upper_80 - f.lower_80, 0);

    combinedPoints.push({
      period: f.period,
      actual: f.actual !== undefined ? f.actual : null,
      mean: f.mean,
      lower_80: f.lower_80,
      upper_80: f.upper_80,
      lower_95: f.lower_95,
      upper_95: f.upper_95,
      band95_base: f.lower_95,
      band95_range: range95,
      band80_base: f.lower_80,
      band80_range: range80,
      is_forecast: true,
    });
  });

  // Calculate dynamic Y-axis min/max
  const allValues: number[] = [];
  combinedPoints.forEach((p) => {
    if (p.actual !== null && p.actual !== undefined) allValues.push(p.actual);
    if (p.lower_95 !== null && p.lower_95 !== undefined) allValues.push(p.lower_95);
    if (p.upper_95 !== null && p.upper_95 !== undefined) allValues.push(p.upper_95);
    if (p.mean !== null && p.mean !== undefined) allValues.push(p.mean);
  });

  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 90;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 115;
  const yPadding = Math.max((rawMax - rawMin) * 0.12, 1.0);
  const yDomainMin = Math.floor(rawMin - yPadding);
  const yDomainMax = Math.ceil(rawMax + yPadding);

  return (
    <div className="space-y-3">
      {/* Chart Canvas */}
      <div className="h-88 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedPoints} margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DDD6D2" vertical={false} opacity={0.6} />
            <XAxis
              dataKey="period"
              tick={{ fill: '#5B3A29', fontSize: 11, fontFamily: 'Fragment Mono' }}
              stroke="#DDD6D2"
              dy={8}
            />
            <YAxis
              domain={[yDomainMin, yDomainMax]}
              tick={{ fill: '#5B3A29', fontSize: 11, fontFamily: 'Fragment Mono' }}
              stroke="#DDD6D2"
              tickFormatter={(val) => `${val}${unit ? ' ' + unit : ''}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload;
                  const isHist = !pt.is_forecast || (pt.actual !== null && pt.period === anchorPeriod);
                  return (
                    <div className="rounded-xl border-2 border-hairline bg-white p-3.5 shadow-md font-mono text-xs z-50">
                      <div className="font-serif font-bold text-cocoa text-sm mb-1.5 flex items-center justify-between gap-4">
                        <span>{pt.period}</span>
                        <span
                          className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-semibold ${
                            pt.is_forecast && pt.period !== anchorPeriod
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-cocoa/10 text-cocoa'
                          }`}
                        >
                          {pt.period === anchorPeriod
                            ? 'Baseline (T₀)'
                            : pt.is_forecast
                            ? 'Forecast'
                            : 'Actual'}
                        </span>
                      </div>

                      {pt.actual !== null && pt.actual !== undefined && (
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-shelf-muted">Actual Observed:</span>
                          <span className="font-bold text-cocoa">
                            {pt.actual.toFixed(2)} {unit}
                          </span>
                        </div>
                      )}

                      {pt.mean !== null && pt.mean !== undefined && (
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-price-rise font-medium">Central Projection:</span>
                          <span className="font-bold text-price-rise">
                            {pt.mean.toFixed(2)} {unit}
                          </span>
                        </div>
                      )}

                      {pt.lower_80 !== null && pt.lower_80 !== undefined && (
                        <div className="flex items-center justify-between gap-4 text-[11px] text-shelf-muted py-0.5 border-t border-hairline/60 mt-1 pt-1">
                          <span>80% Confidence Band:</span>
                          <span className="font-medium text-cocoa">
                            [{pt.lower_80.toFixed(2)} – {pt.upper_80.toFixed(2)}]
                          </span>
                        </div>
                      )}

                      {pt.lower_95 !== null && pt.lower_95 !== undefined && (
                        <div className="flex items-center justify-between gap-4 text-[11px] text-shelf-muted py-0.5">
                          <span>95% Confidence Band:</span>
                          <span className="font-medium text-cocoa">
                            [{pt.lower_95.toFixed(2)} – {pt.upper_95.toFixed(2)}]
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* 95% Confidence Band Area (Layered transparent stack) */}
            <Area
              stackId="band95"
              type="monotone"
              dataKey="band95_base"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              stackId="band95"
              type="monotone"
              dataKey="band95_range"
              stroke="none"
              fill="#5B3A29"
              fillOpacity={0.10}
              isAnimationActive={false}
              name="95% Confidence Corridor"
            />

            {/* 80% Confidence Band Area (Layered transparent stack) */}
            <Area
              stackId="band80"
              type="monotone"
              dataKey="band80_base"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              legendType="none"
            />
            <Area
              stackId="band80"
              type="monotone"
              dataKey="band80_range"
              stroke="none"
              fill="#5B3A29"
              fillOpacity={0.16}
              isAnimationActive={false}
              name="80% Confidence Corridor"
            />

            {/* Historical Actual Line (Solid Cocoa) */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#5B3A29"
              strokeWidth={3}
              dot={{ r: 3.5, fill: '#5B3A29', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 5.5, fill: '#5B3A29' }}
              name="Historical Actual"
              connectNulls={false}
            />

            {/* Forecast Projection Line (Dashed Rust) */}
            <Line
              type="monotone"
              dataKey="mean"
              stroke="#B93815"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#B93815', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#B93815' }}
              name="Projected Trajectory"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Interval Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline/80 pt-3 text-xs font-mono text-shelf-muted">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-5 bg-cocoa rounded-sm" />
            <span className="text-cocoa font-bold">Historical Actuals (T)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 border-t-2 border-dashed border-price-rise" />
            <span className="text-price-rise font-bold">Central Forecast Mean</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-xs bg-cocoa/25 border border-cocoa/40" />
            <span>80% Interval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-xs bg-cocoa/10 border border-hairline" />
            <span>95% Interval</span>
          </div>
        </div>

        <div className="text-[11px] text-shelf-muted">
          Anchor Period: <strong className="text-cocoa">{anchorPeriod || 'T₀'}</strong>
        </div>
      </div>
    </div>
  );
};
