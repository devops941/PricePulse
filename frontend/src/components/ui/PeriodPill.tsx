import React from 'react';
import { IconCalendar, IconChevronDown } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface PeriodPillProps {
  currentPeriod: string;
  options?: string[];
  onSelect?: (period: string) => void;
  className?: string;
}

export const PeriodPill: React.FC<PeriodPillProps> = ({
  currentPeriod,
  options = ['Oct 2026', 'Sep 2026', 'Aug 2026', 'Jul 2026', 'Jun 2026'],
  onSelect,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline bg-tile hover:bg-cocoa-wash/30 text-ink text-xs font-medium shadow-shelf transition-all duration-150"
      >
        <IconCalendar size={14} className="text-cocoa" />
        <span className="font-mono">{currentPeriod}</span>
        <IconChevronDown size={14} className={cn("text-muted transition-transform duration-150", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-tile border border-hairline rounded-tile shadow-lg z-50 py-1">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (onSelect) onSelect(opt);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs font-mono transition-colors flex items-center justify-between',
                  opt === currentPeriod
                    ? 'bg-cocoa text-white font-semibold'
                    : 'text-ink hover:bg-cocoa-wash/50'
                )}
              >
                <span>{opt}</span>
                {opt === currentPeriod && <span className="text-[10px]">●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
