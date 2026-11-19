import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { StatusPill } from '@/components/ui/StatusPill';
import { cn, formatINR } from '@/lib/utils';
import { IconCheck, IconAlertTriangle } from '@tabler/icons-react';

interface QuickPriceFormProps {
  markets: any[];
  items: any[];
  onSuccess?: () => void;
}

export const QuickPriceForm: React.FC<QuickPriceFormProps> = ({ markets, items, onSuccess }) => {
  const [marketId, setMarketId] = useState('');
  const [itemId, setItemId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Set default market and item if available
  useEffect(() => {
    if (markets.length > 0 && !marketId) setMarketId(markets[0].id);
    if (items.length > 0 && !itemId) {
      setItemId(items[0].id);
      setUnit(items[0].canonical_unit || 'kg');
    }
  }, [markets, items]);

  const selectedItem = items.find((i) => i.id === itemId);

  // Live calculation of canonical price
  let canonicalPriceEstimate: number | null = null;
  let isOutOfPlausibleBounds = false;

  if (price && selectedItem) {
    const p = parseFloat(price);
    if (!isNaN(p) && p > 0) {
      canonicalPriceEstimate = p; // approximation for preview
      if (selectedItem.min_plausible && (p < selectedItem.min_plausible || p > selectedItem.max_plausible)) {
        isOutOfPlausibleBounds = true;
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId || !itemId || !price) {
      toast.error('Please fill all required price fields');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<any>('/prices', {
        method: 'POST',
        body: JSON.stringify({
          market_id: marketId,
          item_id: itemId,
          date,
          price: parseFloat(price),
          unit: unit || selectedItem?.canonical_unit || 'kg',
          notes,
          source: 'manual',
        }),
      });

      if (res.status === 'flagged') {
        toast.warning('Price saved but flagged for Review Desk review (out of bounds)');
      } else {
        toast.success('Price observation recorded successfully!');
      }

      setPrice('');
      setNotes('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record price observation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-tile rounded-tile border border-hairline p-6 shadow-shelf max-w-2xl">
      <div className="border-b border-hairline pb-3 mb-5">
        <h3 className="font-serif text-xl text-ink font-normal">Quick Price Entry</h3>
        <p className="text-xs text-muted font-sans mt-0.5">
          Single observation entry with live canonical unit conversion and plausible bounds checking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
              Market Center *
            </label>
            <select
              required
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-sans rounded-md border border-hairline bg-shelf text-ink focus:bg-tile"
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
              Observation Date *
            </label>
            <input
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf text-ink focus:bg-tile"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
              Basket Item *
            </label>
            <select
              required
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                const found = items.find((i) => i.id === e.target.value);
                if (found) setUnit(found.canonical_unit);
              }}
              className="w-full px-3 py-2 text-xs font-sans rounded-md border border-hairline bg-shelf text-ink focus:bg-tile"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.category_name || 'Goods'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
              Plausible Bounds
            </label>
            <div className="px-3 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf/60 text-muted">
              {selectedItem ? `₹${selectedItem.min_plausible} - ₹${selectedItem.max_plausible}` : 'N/A'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
              Observed Price (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 58.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono font-semibold rounded-md border border-hairline bg-shelf text-ink focus:bg-tile"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
              Entered Unit *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. kg, 500 g, L, dozen"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf text-ink focus:bg-tile"
            />
          </div>
        </div>

        {/* Live validation feedback pill */}
        {canonicalPriceEstimate !== null && (
          <div
            className={cn(
              'p-3 rounded-md border text-xs flex items-center justify-between',
              isOutOfPlausibleBounds
                ? 'bg-[#FEF7EC] text-warn border-[#F8DCB3]'
                : 'bg-[#E7F3EE] text-fall border-[#C3E4D6]'
            )}
          >
            <div className="flex items-center gap-2">
              {isOutOfPlausibleBounds ? <IconAlertTriangle size={16} /> : <IconCheck size={16} />}
              <span>
                {isOutOfPlausibleBounds
                  ? `Notice: Outside item's plausible range [₹${selectedItem?.min_plausible} - ₹${selectedItem?.max_plausible}]. Will be flagged for review.`
                  : 'Valid price within expected historical range.'}
              </span>
            </div>
            <span className="font-mono font-semibold">
              {formatINR(canonicalPriceEstimate)} / {selectedItem?.canonical_unit}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
            Source / Enumerator Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Mandi spot price quote, shopkeeper interview"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-sans rounded-md border border-hairline bg-shelf text-ink focus:bg-tile"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-md bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep transition-colors shadow-shelf disabled:opacity-50"
        >
          {loading ? 'Recording Observation...' : 'Submit Observation'}
        </button>
      </form>
    </div>
  );
};
