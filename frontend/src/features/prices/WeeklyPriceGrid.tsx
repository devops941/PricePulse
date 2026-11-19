import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { cn, formatNumberIN } from '@/lib/utils';
import { IconDeviceFloppy, IconClipboard, IconCalendar } from '@tabler/icons-react';

interface WeeklyPriceGridProps {
  markets: any[];
  items: any[];
  onBatchSaved?: () => void;
}

export const WeeklyPriceGrid: React.FC<WeeklyPriceGridProps> = ({ markets, items, onBatchSaved }) => {
  const [selectedWeek, setSelectedWeek] = useState('2026-W42');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  // Initialize grid cells
  useEffect(() => {
    const initial: Record<string, Record<string, string>> = {};
    items.forEach((it) => {
      initial[it.id] = {};
      markets.forEach((m) => {
        initial[it.id][m.id] = '';
      });
    });
    setGridData(initial);
  }, [items, markets]);

  const handleCellChange = (itemId: string, marketId: string, value: string) => {
    setGridData((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [marketId]: value,
      },
    }));
  };

  // Keyboard navigation between grid cells (§6.2, §10.6)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, itemIdx: number, marketIdx: number) => {
    let nextItemIdx = itemIdx;
    let nextMarketIdx = marketIdx;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      nextItemIdx = Math.min(items.length - 1, itemIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextItemIdx = Math.max(0, itemIdx - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart !== (e.target as HTMLInputElement).value.length) {
        return; // normal caret cursor movement
      }
      if (marketIdx < markets.length - 1) {
        e.preventDefault();
        nextMarketIdx = marketIdx + 1;
      }
    } else if (e.key === 'ArrowLeft') {
      if ((e.target as HTMLInputElement).selectionStart !== 0) {
        return;
      }
      if (marketIdx > 0) {
        e.preventDefault();
        nextMarketIdx = marketIdx - 1;
      }
    }

    if (nextItemIdx !== itemIdx || nextMarketIdx !== marketIdx) {
      const nextId = `grid-cell-${nextItemIdx}-${nextMarketIdx}`;
      const elem = document.getElementById(nextId);
      if (elem) elem.focus();
    }
  };

  // Paste from Excel spreadsheet tab-separated or newline-separated values (§6.2)
  const handlePaste = (e: React.ClipboardEvent, startItemIdx: number, startMarketIdx: number) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData('text');
    if (!clipboardText) return;

    const rows = clipboardText.split(/\r\n|\n|\r/).filter((r) => r.trim() !== '');
    const newGrid = { ...gridData };

    rows.forEach((rowStr, rOffset) => {
      const targetItemIdx = startItemIdx + rOffset;
      if (targetItemIdx >= items.length) return;
      const itemId = items[targetItemIdx].id;
      const cols = rowStr.split('\t');

      cols.forEach((cellVal, cOffset) => {
        const targetMarketIdx = startMarketIdx + cOffset;
        if (targetMarketIdx >= markets.length) return;
        const marketId = markets[targetMarketIdx].id;
        const cleaned = cellVal.replace(/[^\d.]/g, '');
        if (cleaned) {
          if (!newGrid[itemId]) newGrid[itemId] = {};
          newGrid[itemId][marketId] = cleaned;
        }
      });
    });

    setGridData(newGrid);
    toast.success(`Pasted values across cells starting from row ${startItemIdx + 1}`);
  };

  // Metrics on filled vs flagged vs empty
  let filledCount = 0;
  let flaggedCount = 0;
  let emptyCount = 0;

  items.forEach((it) => {
    markets.forEach((m) => {
      const val = gridData[it.id]?.[m.id];
      if (!val || val.trim() === '') {
        emptyCount++;
      } else {
        filledCount++;
        const p = parseFloat(val);
        if (!isNaN(p) && (p < it.min_plausible || p > it.max_plausible)) {
          flaggedCount++;
        }
      }
    });
  });

  const handleSaveBatch = async () => {
    const observations = [];
    for (const it of items) {
      for (const m of markets) {
        const val = gridData[it.id]?.[m.id];
        if (val && val.trim() !== '') {
          const p = parseFloat(val);
          if (!isNaN(p) && p > 0) {
            observations.push({
              market_id: m.id,
              item_id: it.id,
              date,
              price: p,
              unit: it.canonical_unit || 'kg',
              source: 'weekly_grid',
            });
          }
        }
      }
    }

    if (observations.length === 0) {
      toast.error('No prices have been entered in the grid yet');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<any>('/prices/batch', {
        method: 'POST',
        body: JSON.stringify({ observations }),
      });

      toast.success(`Batch saved: ${res.saved_count} records saved (${res.flagged_count} flagged for review)`);
      if (res.rejected_count > 0) {
        toast.warning(`${res.rejected_count} duplicate or invalid cells were skipped`);
      }
      if (onBatchSaved) onBatchSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save batch prices');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 relative">
      {/* Grid Toolbar */}
      <div className="bg-tile rounded-tile border border-hairline p-4 shadow-shelf flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg text-ink font-normal">Weekly Price Observation Grid</h3>
          <p className="text-xs text-muted font-sans mt-0.5">
            Spreadsheet-style entry across market centers. Keyboard navigation (arrows/enter) and Excel paste supported.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted font-sans">Date:</label>
            <input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono rounded border border-hairline bg-shelf"
            />
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid in Fragment Mono (§10.3) */}
      <div className="bg-tile rounded-tile border border-hairline shadow-shelf overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-shelf/80 border-b border-hairline text-ink">
              <th className="py-2.5 px-3 text-left font-sans font-semibold sticky left-0 bg-shelf/95 z-10 border-r border-hairline min-w-[200px]">
                Basket Item (Canonical Unit)
              </th>
              {markets.map((m) => (
                <th
                  key={m.id}
                  className="py-2.5 px-3 text-center font-sans font-semibold border-r border-hairline last:border-r-0 min-w-[140px]"
                >
                  <div className="truncate max-w-[130px] mx-auto" title={m.name}>
                    {m.name}
                  </div>
                  <div className="text-[10px] text-muted font-normal uppercase">
                    {m.district}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {items.map((it, itemIdx) => (
              <tr key={it.id} className="hover:bg-cocoa-wash/20 transition-colors">
                {/* Item label column (sticky left) */}
                <td className="py-2 px-3 sticky left-0 bg-tile z-10 border-r border-hairline font-sans font-medium text-ink">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate max-w-[150px]">{it.name}</span>
                    <span className="text-[10px] font-mono text-muted bg-shelf px-1 py-0.2 rounded border border-hairline">
                      {it.canonical_unit}
                    </span>
                  </div>
                </td>

                {/* Market columns */}
                {markets.map((m, marketIdx) => {
                  const val = gridData[it.id]?.[m.id] || '';
                  const numVal = parseFloat(val);
                  const isFlagged = !isNaN(numVal) && (numVal < it.min_plausible || numVal > it.max_plausible);
                  const isValid = !isNaN(numVal) && !isFlagged;

                  return (
                    <td
                      key={m.id}
                      className="p-1 border-r border-hairline last:border-r-0 text-center relative"
                    >
                      <input
                        id={`grid-cell-${itemIdx}-${marketIdx}`}
                        type="text"
                        inputMode="decimal"
                        value={val}
                        placeholder="—"
                        onChange={(e) => handleCellChange(it.id, m.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, itemIdx, marketIdx)}
                        onPaste={(e) => handlePaste(e, itemIdx, marketIdx)}
                        className={cn(
                          'w-full py-1.5 px-2 text-center text-xs font-mono rounded border transition-all focus:outline-none focus:ring-1',
                          isValid && 'bg-[#E7F3EE]/60 text-fall border-[#C3E4D6] focus:ring-fall',
                          isFlagged && 'bg-[#FEF7EC] text-warn border-[#F8DCB3] focus:ring-warn font-semibold',
                          !val && 'bg-shelf/20 text-ink border-transparent hover:border-hairline focus:bg-tile focus:border-cocoa focus:ring-cocoa'
                        )}
                        title={
                          isFlagged
                            ? `Price ₹${numVal} is outside expected bounds [₹${it.min_plausible} - ₹${it.max_plausible}]`
                            : undefined
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sticky Bottom-Right "Save Batch" Bar (§6.2, §10.6) */}
      <div className="fixed bottom-4 right-4 sm:right-8 bg-tile border border-hairline rounded-tile shadow-2xl p-3 flex items-center gap-4 z-40 animate-slide-up">
        <div className="flex items-center gap-3 text-xs font-mono divide-x divide-hairline">
          <div className="flex items-center gap-1.5 pr-2">
            <span className="w-2 h-2 rounded-full bg-fall" />
            <span className="text-fall font-semibold">{filledCount - flaggedCount} Valid</span>
          </div>
          {flaggedCount > 0 && (
            <div className="flex items-center gap-1.5 px-2">
              <span className="w-2 h-2 rounded-full bg-warn" />
              <span className="text-warn font-semibold">{flaggedCount} Flagged</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 pl-2 text-muted">
            <span>{emptyCount} Empty</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveBatch}
          disabled={saving || filledCount === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep transition-colors shadow-shelf disabled:opacity-50"
        >
          <IconDeviceFloppy size={15} />
          <span>{saving ? 'Saving Batch...' : `Save Batch (${filledCount} prices)`}</span>
        </button>
      </div>
    </div>
  );
};
