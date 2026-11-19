import React from 'react';
import { cn, formatNumberIN } from '@/lib/utils';

export interface WeightBarItem {
  id: string;
  name: string;
  weight: number; // 0 to 1.0
  color?: string;
}

interface WeightBarProps {
  items: WeightBarItem[];
  className?: string;
}

const PALETTE = [
  '#5B3A29', // cocoa
  '#3D5A80', // series-b
  '#8A6D3B', // series-c
  '#1F7A5A', // fall
  '#B93815', // rise
  '#6B7A8F', // steady
  '#A15C00', // warn
  '#75675F', // muted
  '#9B6A50',
  '#556B2F',
  '#4682B4',
  '#CD853F',
  '#708090',
  '#2E8B57',
  '#8B4513',
];

export const WeightBar: React.FC<WeightBarProps> = ({ items, className }) => {
  const totalWeight = items.reduce((sum, it) => sum + (it.weight || 0), 0);
  const totalPct = totalWeight * 100;
  const isBalanced = Math.abs(totalWeight - 1.0) < 0.001;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header bar metrics */}
      <div className="flex items-center justify-between text-xs font-sans">
        <span className="font-semibold uppercase tracking-wider text-muted text-[11px]">
          Proportional Basket Weight Bar (§10.6)
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted">Total:</span>
          <span
            className={cn(
              'font-mono font-bold px-2 py-0.5 rounded text-xs',
              isBalanced
                ? 'bg-[#E7F3EE] text-fall border border-[#C3E4D6]'
                : 'bg-[#FBEAE5] text-rise border border-[#F6D0C5]'
            )}
          >
            {formatNumberIN(totalPct, 1)}%
            {isBalanced ? ' (Balanced 100%)' : ' (Must equal 100%)'}
          </span>
        </div>
      </div>

      {/* The Proportional Bar */}
      <div className="h-6 w-full bg-shelf rounded-md border border-hairline overflow-hidden flex shadow-inner">
        {items.map((item, idx) => {
          const pct = Math.max((item.weight / (totalWeight || 1)) * 100, 0);
          const color = item.color || PALETTE[idx % PALETTE.length];
          if (pct <= 0) return null;
          return (
            <div
              key={item.id}
              style={{ width: `${pct}%`, backgroundColor: color }}
              className="h-full relative group transition-all duration-200 border-r border-white/20 last:border-r-0 cursor-pointer"
              title={`${item.name}: ${(item.weight * 100).toFixed(1)}%`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-ink text-white text-[10px] font-sans px-2 py-1 rounded shadow-md whitespace-nowrap">
                  <span className="font-bold">{item.name}</span>: {(item.weight * 100).toFixed(1)}%
                </div>
                <div className="w-1.5 h-1.5 bg-ink rotate-45 -mt-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {items.map((item, idx) => {
          const color = item.color || PALETTE[idx % PALETTE.length];
          return (
            <div
              key={item.id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-tile border border-hairline text-[11px] font-sans text-ink shadow-shelf"
            >
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate max-w-[120px]">{item.name}</span>
              <span className="font-mono text-muted text-[10px]">
                {(item.weight * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
