import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'valid'
  | 'flagged'
  | 'rejected'
  | 'imputed'
  | 'active'
  | 'draft'
  | 'archived'
  | 'open'
  | 'approved'
  | 'corrected';

interface StatusPillProps {
  status: StatusVariant | string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const variantConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  valid: { bg: 'bg-[#E7F3EE]', text: 'text-fall', border: 'border-[#C3E4D6]', dot: 'bg-fall' },
  active: { bg: 'bg-[#E7F3EE]', text: 'text-fall', border: 'border-[#C3E4D6]', dot: 'bg-fall' },
  approved: { bg: 'bg-[#E7F3EE]', text: 'text-fall', border: 'border-[#C3E4D6]', dot: 'bg-fall' },

  flagged: { bg: 'bg-[#FEF7EC]', text: 'text-warn', border: 'border-[#F8DCB3]', dot: 'bg-warn' },
  open: { bg: 'bg-[#FEF7EC]', text: 'text-warn', border: 'border-[#F8DCB3]', dot: 'bg-warn' },

  rejected: { bg: 'bg-[#FBEAE5]', text: 'text-rise', border: 'border-[#F6D0C5]', dot: 'bg-rise' },

  imputed: { bg: 'bg-[#EFF2F5]', text: 'text-series-b', border: 'border-[#D4DFEC]', dot: 'bg-series-b' },
  draft: { bg: 'bg-cocoa-wash', text: 'text-cocoa', border: 'border-[#DDD6D2]', dot: 'bg-cocoa' },
  corrected: { bg: 'bg-cocoa-wash', text: 'text-cocoa', border: 'border-[#DDD6D2]', dot: 'bg-cocoa' },
  archived: { bg: 'bg-[#F4F2F1]', text: 'text-muted', border: 'border-hairline', dot: 'bg-muted' },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  className,
  size = 'md',
}) => {
  const norm = status.toLowerCase();
  const cfg = variantConfig[norm] || variantConfig.archived;
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-sans font-medium',
        cfg.bg,
        cfg.text,
        cfg.border,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      <span>{displayLabel}</span>
    </span>
  );
};
