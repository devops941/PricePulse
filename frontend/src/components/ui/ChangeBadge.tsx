import React from 'react';
import { cn, formatNumberIN } from '@/lib/utils';

export type ChangeType = 'rise' | 'fall' | 'steady';

interface ChangeBadgeProps {
  value: number; // e.g. 1.8 for +1.8%, -0.4 for -0.4%
  suffix?: string;
  isIndexPoint?: boolean;
  className?: string;
  showZeroAsSteady?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ChangeBadge: React.FC<ChangeBadgeProps> = ({
  value,
  suffix = '%',
  isIndexPoint = false,
  className,
  showZeroAsSteady = true,
  size = 'md',
}) => {
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  let type: ChangeType = 'steady';
  if (safeVal > 0.0001) {
    type = 'rise';
  } else if (safeVal < -0.0001) {
    type = 'fall';
  }

  const glyph = type === 'rise' ? '▲' : type === 'fall' ? '▼' : '■';
  const prefix = type === 'rise' ? '+' : '';
  const formattedVal = formatNumberIN(Math.abs(safeVal), 2);
  const displayVal = type === 'fall' ? `-${formattedVal}` : `${prefix}${formattedVal}`;

  const colorStyles = {
    rise: 'text-rise bg-[#FBEAE5] border-[#F6D0C5]',
    fall: 'text-fall bg-[#E7F3EE] border-[#C3E4D6]',
    steady: 'text-steady bg-[#EFF2F5] border-[#DCE2E8]',
  };

  const sizeStyles = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5 font-medium',
    lg: 'text-sm px-2.5 py-1 gap-2 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border tabular-nums transition-colors',
        colorStyles[type],
        sizeStyles[size],
        className
      )}
      title={`${type.toUpperCase()}: ${displayVal}${isIndexPoint ? ' pts' : suffix}`}
    >
      <span className="text-[10px] leading-none select-none">{glyph}</span>
      <span className="font-mono">
        {displayVal}
        {isIndexPoint ? ' pts' : suffix}
      </span>
    </span>
  );
};
