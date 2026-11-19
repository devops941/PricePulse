import React from 'react';
import { cn } from '@/lib/utils';

export type BentoSpan =
  | 'col-span-12'
  | 'col-span-8'
  | 'col-span-7'
  | 'col-span-6'
  | 'col-span-5'
  | 'col-span-4'
  | 'col-span-3'
  | 'md:col-span-3 lg:col-span-4'
  | 'md:col-span-6 lg:col-span-8'
  | 'md:col-span-3 lg:col-span-6'
  | 'md:col-span-6 lg:col-span-12';

interface BentoTileProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  colSpan?: string;
  className?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

export const BentoTile: React.FC<BentoTileProps> = ({
  title,
  subtitle,
  action,
  children,
  colSpan = 'col-span-12 md:col-span-6 lg:col-span-4',
  className,
  bodyClassName,
  footer,
}) => {
  return (
    <article
      className={cn(
        'bg-tile rounded-tile border border-hairline shadow-shelf p-5 flex flex-col justify-between transition-shadow hover:shadow-tag',
        colSpan,
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 mb-3 border-b border-hairline/60 pb-2.5">
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-serif text-lg font-normal text-ink tracking-tight">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-muted font-sans mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      <div className={cn('flex-1', bodyClassName)}>{children}</div>

      {footer && (
        <footer className="mt-3 pt-2.5 border-t border-hairline/60 text-xs text-muted">
          {footer}
        </footer>
      )}
    </article>
  );
};
