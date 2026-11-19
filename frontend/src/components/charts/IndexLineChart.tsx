import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  CartesianGrid,
} from 'recharts';
import { cn, formatNumberIN } from '@/lib/utils';

interface IndexLineChartProps {
  data: { period: string; index: number; mom?: number; yoy?: number }[];
  height?: number;
  showBrush?: boolean;
  className?: string;
}

export const IndexLineChart: React.FC<IndexLineChartProps> = ({
  data,
  height = 280,
  showBrush = true,
  className,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-muted font-sans bg-shelf/30 rounded border border-hairline">
        No index series calculated yet. Run the index engine to generate trend data.
      </div>
    );
  }

  const validIndexes = data.map((d) => Number(d.index)).filter((v) => !isNaN(v) && v > 0);
  const minVal = validIndexes.length > 0 ? Math.floor(Math.min(...validIndexes) * 0.98) : 90;
  const maxVal = validIndexes.length > 0 ? Math.ceil(Math.max(...validIndexes) * 1.02) : 120;

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'Fragment Mono' }}
            stroke="var(--hairline)"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'Fragment Mono' }}
            stroke="var(--hairline)"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const pt = payload[0].payload;
                return (
                  <div className="bg-tile border border-hairline rounded-tile p-3 shadow-xl font-mono text-xs">
                    <div className="font-sans font-semibold text-cocoa mb-1">{label}</div>
                    <div className="text-ink">
                      Index: <span className="font-bold">{formatNumberIN(pt.index, 2)}</span>
                    </div>
                    {pt.mom !== undefined && (
                      <div className="text-muted text-[11px] mt-0.5">
                        MoM Change: {pt.mom > 0 ? `+${pt.mom}%` : `${pt.mom}%`}
                      </div>
                    )}
                    {pt.yoy !== undefined && pt.yoy !== null && (
                      <div className="text-muted text-[11px]">
                        YoY Change: {pt.yoy > 0 ? `+${pt.yoy}%` : `${pt.yoy}%`}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="index"
            stroke="var(--cocoa)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--cocoa)' }}
            activeDot={{ r: 5, fill: 'var(--cocoa-deep)' }}
          />
          {showBrush && data.length > 6 && (
            <Brush
              dataKey="period"
              height={24}
              stroke="var(--hairline)"
              fill="var(--shelf)"
              travellerWidth={8}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
