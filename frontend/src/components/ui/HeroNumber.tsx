import React, { useEffect, useState } from 'react';
import { cn, formatNumberIN } from '@/lib/utils';

interface HeroNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  subtext?: string;
  className?: string;
}

export const HeroNumber: React.FC<HeroNumberProps> = ({
  value,
  decimals = 1,
  prefix = '',
  suffix = '',
  label,
  subtext,
  className,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    const duration = 350; // 350ms from spec §10.4
    const startValue = displayValue;
    const diff = value - startValue;
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + diff * easeOut);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted mb-1 font-sans">
          {label}
        </span>
      )}
      <div className="font-serif text-[56px] lg:text-[64px] leading-none text-ink tabular-nums tracking-tight">
        {prefix}
        {formatNumberIN(displayValue, decimals)}
        {suffix}
      </div>
      {subtext && (
        <span className="text-xs text-muted mt-1.5 font-sans">
          {subtext}
        </span>
      )}
    </div>
  );
};
