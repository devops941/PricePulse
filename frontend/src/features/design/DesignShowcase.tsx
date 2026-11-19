import React, { useState } from 'react';
import { HeroNumber } from '@/components/ui/HeroNumber';
import { ChangeBadge } from '@/components/ui/ChangeBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { PeriodPill } from '@/components/ui/PeriodPill';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Skeleton, EmptyState, ErrorState } from '@/components/ui/FeedbackStates';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ShelfStrip } from '@/components/shelf/ShelfStrip';
import { BasketItemSummary } from '@/components/shelf/ItemTag';
import { PriceTagNav } from '@/components/nav/PriceTagNav';
import { IconCheck, IconTrash, IconSearch, IconSparkles } from '@tabler/icons-react';

const SAMPLE_ITEMS: BasketItemSummary[] = [
  { id: '1', name: 'Rice (Sona Masoori)', category: 'Cereals', canonicalUnit: 'kg', currentPrice: 58.0, prevPrice: 56.5, changePct: 2.65, weight: 0.14, sparkline: [52, 53, 54, 54, 55, 55, 56, 56, 57, 57, 56.5, 58] },
  { id: '2', name: 'Wheat Flour (Atta)', category: 'Cereals', canonicalUnit: 'kg', currentPrice: 42.0, prevPrice: 42.0, changePct: 0.0, weight: 0.07, sparkline: [40, 40, 41, 41, 41, 41, 42, 42, 42, 42, 42, 42] },
  { id: '3', name: 'Toor Dal (Arhar)', category: 'Pulses', canonicalUnit: 'kg', currentPrice: 168.0, prevPrice: 172.0, changePct: -2.33, weight: 0.08, sparkline: [155, 158, 160, 165, 170, 175, 180, 178, 175, 174, 172, 168] },
  { id: '4', name: 'Pasteurised Milk', category: 'Dairy', canonicalUnit: 'L', currentPrice: 62.0, prevPrice: 60.0, changePct: 3.33, weight: 0.13, sparkline: [58, 58, 58, 58, 60, 60, 60, 60, 60, 60, 60, 62] },
  { id: '5', name: 'Farm Eggs', category: 'Protein', canonicalUnit: 'dozen', currentPrice: 84.0, prevPrice: 88.0, changePct: -4.55, weight: 0.04, sparkline: [75, 78, 80, 85, 90, 88, 85, 84, 86, 90, 88, 84] },
  { id: '6', name: 'Red Onion', category: 'Vegetables', canonicalUnit: 'kg', currentPrice: 48.0, prevPrice: 36.0, changePct: 33.33, weight: 0.05, sparkline: [25, 26, 28, 30, 32, 32, 34, 35, 36, 38, 36, 48] },
  { id: '7', name: 'Hybrid Tomato', category: 'Vegetables', canonicalUnit: 'kg', currentPrice: 38.0, prevPrice: 45.0, changePct: -15.56, weight: 0.05, sparkline: [55, 60, 65, 58, 50, 48, 46, 45, 42, 45, 45, 38] },
  { id: '8', name: 'Sunflower Oil', category: 'Oils', canonicalUnit: 'L', currentPrice: 135.0, prevPrice: 132.0, changePct: 2.27, weight: 0.09, sparkline: [120, 122, 125, 128, 130, 130, 132, 132, 131, 132, 132, 135] },
];

export const DesignShowcase: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>(['1']);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [period, setPeriod] = useState<string>('Oct 2026');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [cmdOpen, setCmdOpen] = useState<boolean>(false);
  const [heroVal, setHeroVal] = useState<number>(5.8);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-shelf pb-16">
      {/* 1. Global Navigation Bar */}
      <PriceTagNav
        currentRole="Admin"
        userName="Gokul Analyst"
        currentPeriod={period}
        onPeriodChange={setPeriod}
        onOpenCommandPalette={() => setCmdOpen(true)}
      />

      {/* 2. Global Shelf Strip */}
      <ShelfStrip
        items={SAMPLE_ITEMS}
        selectedItemIds={selectedItems}
        onToggleSelectItem={toggleItem}
        onClearItemSelection={() => setSelectedItems([])}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6">
        
        {/* Header intro */}
        <div className="mb-6 border-b border-hairline pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-3xl text-ink font-normal">Design System Showcase</h1>
              <span className="text-xs font-mono bg-cocoa text-white px-2 py-0.5 rounded-full">
                "Shelf Tag" UI
              </span>
            </div>
            <p className="text-xs text-muted font-sans mt-1">
              Specification §10 Implementation: Light theme only, warm cocoa palette, Young Serif display, Rethink Sans UI, Fragment Mono tabular numerals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHeroVal((prev) => (prev === 5.8 ? 6.4 : 5.8))}
              className="px-3 py-1.5 rounded-md border border-hairline bg-tile hover:bg-cocoa-wash/50 text-xs font-sans text-ink transition-colors shadow-shelf"
            >
              Trigger Hero Count-up
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="px-3 py-1.5 rounded-md bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep transition-colors shadow-shelf"
            >
              Open Confirm Dialog
            </button>
          </div>
        </div>

        {/* 12-Column Bento Grid (§10.5.3) */}
        <BentoGrid>
          
          {/* Tile 1: Hero Number & Inflation Drivers (span 5) */}
          <BentoTile
            title="Headline Inflation (YoY)"
            subtitle="Laspeyres fixed-weight index relative to Oct 2025"
            colSpan="col-span-12 md:col-span-6 lg:col-span-5"
            action={<PeriodPill currentPeriod={period} onSelect={setPeriod} />}
          >
            <div className="py-2">
              <HeroNumber
                value={heroVal}
                prefix="▲ +"
                suffix="%"
                subtext="MoM: ▲ +0.4% · Coverage: 98.6% of basket weight"
              />
            </div>
            <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between">
              <span className="text-xs text-muted font-sans">Purchasing power of ₹100:</span>
              <span className="font-mono text-sm font-semibold text-ink">₹94.52</span>
            </div>
          </BentoTile>

          {/* Tile 2: ChangeBadges & Directional Glyphs (span 4) */}
          <BentoTile
            title="Change Badges & Glyphs"
            subtitle="▲/▼/■ with signed number, never colour-only"
            colSpan="col-span-12 md:col-span-6 lg:col-span-4"
          >
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans text-muted">Price Rise (Vegetables)</span>
                <ChangeBadge value={33.33} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans text-muted">Price Fall (Pulses)</span>
                <ChangeBadge value={-2.33} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans text-muted">Steady / Flat (Atta)</span>
                <ChangeBadge value={0.0} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans text-muted">Index Point Contribution</span>
                <ChangeBadge value={1.42} isIndexPoint />
              </div>
            </div>
          </BentoTile>

          {/* Tile 3: Status Pills (span 3) */}
          <BentoTile
            title="Observation Statuses"
            subtitle="Validation & review states"
            colSpan="col-span-12 md:col-span-6 lg:col-span-3"
          >
            <div className="flex flex-wrap gap-2 py-1">
              <StatusPill status="valid" />
              <StatusPill status="flagged" />
              <StatusPill status="rejected" />
              <StatusPill status="imputed" />
              <StatusPill status="active" />
              <StatusPill status="draft" />
              <StatusPill status="open" />
            </div>
          </BentoTile>

          {/* Tile 4: Design Tokens & Palette (span 7) */}
          <BentoTile
            title="Palette Tokens (§10.2)"
            subtitle="Warm cocoa ink on cool grey-white shelf"
            colSpan="col-span-12 lg:col-span-7"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
              <div className="p-2.5 rounded border border-hairline bg-shelf text-ink text-xs font-mono">
                <div className="font-bold">--shelf</div>
                <div className="text-[11px] text-muted">#F4F2F1</div>
              </div>
              <div className="p-2.5 rounded border border-hairline bg-tile text-ink text-xs font-mono">
                <div className="font-bold">--tile</div>
                <div className="text-[11px] text-muted">#FFFFFF</div>
              </div>
              <div className="p-2.5 rounded border border-hairline bg-cocoa text-white text-xs font-mono">
                <div className="font-bold">--cocoa</div>
                <div className="text-[11px] opacity-80">#5B3A29</div>
              </div>
              <div className="p-2.5 rounded border border-hairline bg-cocoa-wash text-cocoa text-xs font-mono">
                <div className="font-bold">--cocoa-wash</div>
                <div className="text-[11px] text-cocoa">#EFE3DC</div>
              </div>
              <div className="p-2.5 rounded border border-[#F6D0C5] bg-[#FBEAE5] text-rise text-xs font-mono">
                <div className="font-bold">--rise</div>
                <div className="text-[11px]">#B93815</div>
              </div>
              <div className="p-2.5 rounded border border-[#C3E4D6] bg-[#E7F3EE] text-fall text-xs font-mono">
                <div className="font-bold">--fall</div>
                <div className="text-[11px]">#1F7A5A</div>
              </div>
              <div className="p-2.5 rounded border border-[#DCE2E8] bg-[#EFF2F5] text-steady text-xs font-mono">
                <div className="font-bold">--steady</div>
                <div className="text-[11px]">#6B7A8F</div>
              </div>
              <div className="p-2.5 rounded border border-[#F8DCB3] bg-[#FEF7EC] text-warn text-xs font-mono">
                <div className="font-bold">--warn</div>
                <div className="text-[11px]">#A15C00</div>
              </div>
            </div>
          </BentoTile>

          {/* Tile 5: Typography System (§10.3) (span 5) */}
          <BentoTile
            title="Typography Hierarchy (§10.3)"
            subtitle="Display: Young Serif · UI: Rethink Sans · Prices: Fragment Mono"
            colSpan="col-span-12 lg:col-span-5"
          >
            <div className="space-y-2 py-1">
              <div>
                <span className="text-[10px] uppercase font-mono text-muted">Display / Big Numbers</span>
                <div className="font-serif text-2xl text-ink">PricePulse ₹2,450.00</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-muted">UI Body / Labels</span>
                <div className="font-sans text-sm text-ink font-medium">
                  Laspeyres fixed-weight index formula with chain linking.
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-muted">Monospace / Tabular</span>
                <div className="font-mono text-xs text-ink bg-shelf p-1.5 rounded border border-hairline">
                  P_it / P_i0 = 58.00 / 52.00 = 1.11538
                </div>
              </div>
            </div>
          </BentoTile>

          {/* Tile 6: Feedback States (span 12) */}
          <BentoTile
            title="Feedback & Empty States (§10.8)"
            subtitle="All views support loading, empty, and error scenarios"
            colSpan="col-span-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-hairline rounded-md p-4 bg-shelf/30">
                <span className="text-[11px] uppercase font-mono text-muted font-bold block mb-3">
                  Skeleton Loading State
                </span>
                <div className="space-y-2.5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                </div>
              </div>

              <div className="border border-hairline rounded-md bg-shelf/30">
                <span className="text-[11px] uppercase font-mono text-muted font-bold block p-2 pb-0">
                  Empty State
                </span>
                <EmptyState
                  title="No observations"
                  description="No price records found for the selected market."
                  actionLabel="Add observation"
                  onAction={() => alert('Quick entry opened')}
                />
              </div>

              <div className="border border-hairline rounded-md bg-shelf/30">
                <span className="text-[11px] uppercase font-mono text-muted font-bold block p-2 pb-0">
                  Error State
                </span>
                <ErrorState
                  title="Index Calculation Failed"
                  message="Missing prices exceeded coverage threshold (>2 periods)."
                  onRetry={() => alert('Retrying index run...')}
                />
              </div>
            </div>
          </BentoTile>

        </BentoGrid>
      </main>

      {/* Confirmation Dialog Component */}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Activate Basket Version v2.1?"
        description="Activating this basket version will chain-link the price series starting from Nov 2026. Prior period index runs will remain preserved for audit."
        confirmLabel="Activate & Chain Link"
        onConfirm={() => alert('Basket activated!')}
      />

      {/* Command Palette Component */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
};
