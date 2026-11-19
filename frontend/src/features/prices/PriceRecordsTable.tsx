import React, { useState } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { cn, formatINR } from '@/lib/utils';
import { IconChevronDown, IconChevronRight, IconDownload, IconFilter } from '@tabler/icons-react';

interface PriceRecordsTableProps {
  records: any[];
  markets: any[];
  items: any[];
  onRefresh?: () => void;
}

export const PriceRecordsTable: React.FC<PriceRecordsTableProps> = ({
  records,
  markets,
  items,
  onRefresh,
}) => {
  const [filterMarket, setFilterMarket] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const filteredRecords = records.filter((r) => {
    if (filterMarket && r.market_id !== filterMarket) return false;
    if (filterItem && r.item_id !== filterItem) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ['Date', 'Market', 'Item', 'Observed Price', 'Unit', 'Canonical Price', 'Canonical Unit', 'Status', 'Notes'];
    const rows = filteredRecords.map((r) => [
      r.date,
      r.market_name || r.market_id,
      r.item_name || r.item_id,
      r.price,
      r.unit,
      r.price_per_canonical_unit,
      r.canonical_unit,
      r.status,
      `"${r.notes || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `price_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-tile rounded-tile border border-hairline p-4 shadow-shelf flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted font-sans">
            <IconFilter size={15} />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Filters:</span>
          </div>

          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="px-2.5 py-1 text-xs font-sans rounded border border-hairline bg-shelf"
          >
            <option value="">All Markets</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={filterItem}
            onChange={(e) => setFilterItem(e.target.value)}
            className="px-2.5 py-1 text-xs font-sans rounded border border-hairline bg-shelf"
          >
            <option value="">All Basket Items</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 text-xs font-sans rounded border border-hairline bg-shelf"
          >
            <option value="">All Statuses</option>
            <option value="valid">Valid Only</option>
            <option value="flagged">Flagged Only</option>
            <option value="rejected">Rejected Only</option>
            <option value="imputed">Imputed Only</option>
          </select>

          {(filterMarket || filterItem || filterStatus) && (
            <button
              onClick={() => {
                setFilterMarket('');
                setFilterItem('');
                setFilterStatus('');
              }}
              className="text-xs text-cocoa hover:text-cocoa-deep underline font-sans ml-1"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">
            {filteredRecords.length} records shown
          </span>
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline bg-tile hover:bg-cocoa-wash/40 text-xs font-sans text-ink transition-colors shadow-shelf"
          >
            <IconDownload size={14} className="text-cocoa" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TanStack-style Records Table */}
      <div className="bg-tile rounded-tile border border-hairline shadow-shelf overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-shelf/80 border-b border-hairline text-muted uppercase text-[10px] font-semibold">
            <tr>
              <th className="py-2.5 px-3 w-8"></th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Market Center</th>
              <th className="py-2.5 px-3">Basket Item</th>
              <th className="py-2.5 px-3 text-right">Raw Observed</th>
              <th className="py-2.5 px-3 text-right">Price per Canonical Unit</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline font-mono text-[11px]">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted font-sans">
                  No price observations match the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const isExpanded = expandedRowId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      onClick={() => toggleRow(r.id)}
                      className={cn(
                        'hover:bg-cocoa-wash/30 cursor-pointer transition-colors',
                        isExpanded && 'bg-cocoa-wash/40'
                      )}
                    >
                      <td className="py-2 px-3 text-muted">
                        {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      </td>
                      <td className="py-2 px-3 text-muted">{r.date}</td>
                      <td className="py-2 px-3 font-sans font-medium text-ink">
                        {r.market_name || r.market_id}
                      </td>
                      <td className="py-2 px-3 font-sans font-medium text-ink">
                        {r.item_name || r.item_id}
                      </td>
                      <td className="py-2 px-3 text-right text-muted">
                        ₹{r.price.toFixed(2)} / {r.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-ink">
                        {formatINR(r.price_per_canonical_unit)} / {r.canonical_unit}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusPill status={r.status} size="sm" />
                      </td>
                    </tr>

                    {/* Inline Row Expansion Details (§10.6) */}
                    {isExpanded && (
                      <tr className="bg-shelf/40 border-b border-hairline/80">
                        <td colSpan={7} className="p-4 font-sans text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-tile p-3 rounded border border-hairline">
                            <div>
                              <span className="text-[10px] uppercase font-mono text-muted block mb-1">
                                Observation Identifier & Source
                              </span>
                              <div className="font-mono text-[11px] text-ink">{r.id}</div>
                              <div className="text-[11px] text-muted mt-0.5">
                                Source: {r.source} · Entered by: {r.entered_by || 'System'}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-mono text-muted block mb-1">
                                Period & Batch Metadata
                              </span>
                              <div className="font-mono text-[11px] text-ink">
                                Period: {r.period_key}
                              </div>
                              <div className="text-[11px] text-muted mt-0.5 truncate max-w-xs">
                                Batch ID: {r.batch_id || 'Direct Single Entry'}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-mono text-muted block mb-1">
                                Validation Notes & Review State
                              </span>
                              <div className="text-[11px] text-ink">
                                {r.flag_reason || r.notes || 'Clean observation passed validation catalog.'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
