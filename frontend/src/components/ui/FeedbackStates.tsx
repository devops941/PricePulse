import React from 'react';
import { IconAlertTriangle, IconFileSearch, IconRefresh } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-hairline/60 rounded-md", className)} />
);

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No price records found",
  description = "No observations or calculated runs match the selected filters or period.",
  actionLabel,
  onAction,
  icon,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-cocoa-wash/50 flex items-center justify-center text-cocoa mb-3">
        {icon || <IconFileSearch size={24} />}
      </div>
      <h4 className="font-serif text-lg text-ink font-normal mb-1">{title}</h4>
      <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Failed to load data",
  message = "A network or server error occurred while retrieving this section.",
  onRetry,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-[#FBEAE5] flex items-center justify-center text-rise mb-3 border border-[#F6D0C5]">
        <IconAlertTriangle size={24} />
      </div>
      <h4 className="font-serif text-lg text-ink font-normal mb-1">{title}</h4>
      <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed font-mono">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-tile border border-hairline hover:bg-cocoa-wash/40 text-ink text-xs font-medium transition-colors shadow-shelf"
        >
          <IconRefresh size={14} className="text-cocoa" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
