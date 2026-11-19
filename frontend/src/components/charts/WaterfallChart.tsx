import React from 'react';
import { cn, formatNumberIN } from '@/lib/utils';
import { ChangeBadge } from '../ui/ChangeBadge';

export interface ContributionItem {
  item_id: string;
  item_name: string;
  category_name?: string;
  points: number; // e.g. +0.8 pts, -0.4 pts
  percent?: number;
  weight?: number;
}

interface WaterfallChartProps {
  items: ContributionItem[];
  className?: string;
  maxDisplay?: number;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  items,
  className,
  maxDisplay = 8,
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-muted font-sans bg-shelf/30 rounded border border-hairline">
        No contribution data for selected period.
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, maxDisplay);
  const maxAbs = Math.max(...sorted.map((it) => Math.abs(it.points)), 0.1);

  return (
    <div className={cn('space-y-2 py-1', className)}>
      {sorted.map((it) => {
        const isRise = it.points > 0;
        const widthPct = Math.min((Math.abs(it.points) / maxAbs) * 100, 100);

        return (
          <div key={it.item_id} className="text-xs font-sans">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-ink truncate max-w-[180px]">
                {it.item_name}
              </span>
              <ChangeBadge value={it.points} isIndexPoint size="sm" />
            </div>

            {/* Proportional Waterfall Bar */}
            <div className="w-full h-3 bg-shelf rounded-full overflow-hidden flex items-center border border-hairline/60">
              {/* Left spacer if negative, right if positive */}
              <div
                style={{ width: `${widthPct}%` }}
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  isRise ? 'bg-rise' : 'bg-fall'
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
