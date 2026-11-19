import React from 'react';
import { IconExternalLink, IconCircleFilled } from '@tabler/icons-react';

export const AppFooter: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-hairline/80 bg-shelf-paper py-4 text-xs font-sans text-shelf-muted">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Scientific formula note */}
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-cocoa">PricePulse</span>
          <span>•</span>
          <span className="font-mono text-[11px]">
            Laspeyres Index Engine (Formula: <strong className="text-cocoa">idx-v1</strong>)
          </span>
        </div>

        {/* Center: Copyright / Academic label */}
        <div className="text-center font-sans text-[11px]">
          PricePulse Retail Intelligence © 2026 • Essential Goods Basket Monitoring
        </div>

        {/* Right: API status & Docs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-price-fall font-semibold">
            <IconCircleFilled size={8} />
            <span>API Online (Port 8000)</span>
          </div>

          <a
            href="http://localhost:8000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-cocoa hover:underline"
          >
            <span>Swagger Docs</span>
            <IconExternalLink size={12} />
          </a>
        </div>
      </div>
    </footer>
  );
};
