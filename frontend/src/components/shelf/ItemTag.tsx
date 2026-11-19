import React from 'react';
import { cn, formatINR, formatNumberIN } from '@/lib/utils';
import { ChangeBadge } from '../ui/ChangeBadge';

export interface BasketItemSummary {
  id: string;
  name: string;
  category: string;
  canonicalUnit: string;
  currentPrice: number;
  prevPrice: number;
  changePct: number;
  weight: number;
  sparkline: number[]; // 12-point trend
}

interface ItemTagProps {
  item: BasketItemSummary;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  className?: string;
}

export const ItemTag: React.FC<ItemTagProps> = ({
  item,
  isSelected = false,
  onToggleSelect,
  className,
}) => {
  // Generate mini SVG sparkline
  const min = Math.min(...item.sparkline, item.currentPrice);
  const max = Math.max(...item.sparkline, item.currentPrice);
  const range = max - min || 1;
  const height = 18;
  const width = 48;
  const points = item.sparkline
    .map((val, idx) => {
      const x = (idx / (item.sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isUp = item.changePct > 0;

  return (
    <div
      onClick={() => onToggleSelect && onToggleSelect(item.id)}
      className={cn(
        'price-tag-shape shrink-0 p-2.5 min-w-[170px] max-w-[190px] border rounded-sm transition-all duration-150 cursor-pointer select-none relative',
        isSelected
          ? 'bg-cocoa-wash/90 border-cocoa shadow-sm ring-1 ring-cocoa/30'
          : 'bg-tile border-hairline hover:border-cocoa/50 shadow-shelf'
      )}
    >
      {/* Punched hole top left */}
      <div className="price-tag-hole absolute top-1 left-1" />

      {/* Item title and category */}
      <div className="flex items-start justify-between gap-1 mb-1.5 pl-2">
        <span className="font-sans font-semibold text-xs text-ink truncate" title={item.name}>
          {item.name}
        </span>
        <span className="text-[10px] font-mono text-muted uppercase bg-shelf px-1 py-0.2 rounded border border-hairline">
          {item.canonicalUnit}
        </span>
      </div>

      {/* Price & Sparkline */}
      <div className="flex items-end justify-between gap-2 pl-2">
        <div>
          <div className="font-mono text-sm font-semibold text-ink tabular-nums">
            {formatINR(item.currentPrice)}
          </div>
          <div className="mt-1">
            <ChangeBadge value={item.changePct} size="sm" />
          </div>
        </div>

        {/* 12-point sparkline */}
        <div className="shrink-0 mb-1">
          <svg width={width} height={height} className="overflow-visible">
            <polyline
              fill="none"
              stroke={isUp ? 'var(--rise)' : 'var(--fall)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
