import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { IndexLineChart } from '@/components/charts/IndexLineChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { BentoTile } from '@/components/bento/BentoTile';
import { ChangeBadge } from '@/components/ui/ChangeBadge';
import { Skeleton } from '@/components/ui/FeedbackStates';
import {
  IconPlayerPlay,
  IconHistory,
  IconDownload,
  IconSparkles,
  IconCoins,
  IconScale,
  IconPercentage,
  IconCalendarEvent,
  IconTrendingUp,
} from '@tabler/icons-react';
import { cn, formatINR, formatNumberIN } from '@/lib/utils';

export const IndexPage: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Run index parameter popover state
  const [showRunPopover, setShowRunPopover] = useState(false);
  const [runParams, setRunParams] = useState({
    frequency: 'weekly',
    aggregation_method: 'median', // mean, median, geometric (Jevons)
  });
  const [isCalculating, setIsCalculating] = useState(false);

  const fetchRuns = async () => {
    try {
      const allRuns = await apiFetch<any[]>('/index/runs?limit=30');
      setRuns(allRuns);
      if (allRuns.length > 0) {
        const firstId = allRuns[0].id;
        setSelectedRunId(firstId);
        setCurrentRun(allRuns[0]);
        loadRunDetails(firstId);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadRunDetails = async (runId: string, specificPeriod?: string) => {
    try {
      const run = await apiFetch<any>(`/index/runs/${runId}`);
      setCurrentRun(run);
      // Fetch contributions
      const queryParam = specificPeriod ? `?period=${specificPeriod}` : '';
      const cRes = await apiFetch<any>(`/index/runs/${runId}/contributions${queryParam}`);
      if (cRes && cRes.contributions) {
        setContributions(cRes.contributions);
        setSelectedPeriod(cRes.period);
      }
    } catch (err: any) {
      toast.error('Failed to load run details');
    }
  };

  const handleSelectPeriod = async (period: string) => {
    setSelectedPeriod(period);
    if (!selectedRunId) return;
    try {
      const cRes = await apiFetch<any>(`/index/runs/${selectedRunId}/contributions?period=${period}`);
      if (cRes && cRes.contributions) {
        setContributions(cRes.contributions);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunIndex = async () => {
    setIsCalculating(true);
    try {
      const created = await apiFetch<any>('/index/runs', {
        method: 'POST',
        body: JSON.stringify(runParams),
      });
      toast.success(`Index run completed (${created.series.length} periods calculated)`);
      setShowRunPopover(false);
      await fetchRuns();
    } catch (err: any) {
      toast.error(err.message || 'Index run calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleBootstrapDemo = async () => {
    setLoading(true);
    try {
      toast.info('Initializing 52-week baseline series...');
      await apiFetch<any>('/master/bootstrap-demo-data', { method: 'POST' });
      toast.success('Successfully initialized 52-week price series!');
      await fetchRuns();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize baseline');
    } finally {
      setLoading(false);
    }
  };

  const exportSeriesCSV = () => {
    if (!currentRun?.series?.length) return;
    const headers = ['Period', 'Index', 'MoM %', 'YoY %', 'Coverage %', 'Basket Cost (INR)', 'Purchasing Power (INR 100)'];
    const rows = currentRun.series.map((s: any) => [
      s.period,
      s.index,
      s.mom,
      s.yoy !== null ? s.yoy : '',
      s.coverage,
      s.basket_cost,
      s.purchasing_power_100,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `index_series_${currentRun.id.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const latestPt = currentRun?.series?.length ? currentRun.series[currentRun.series.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl text-cocoa font-bold">Index Engine & Calculations</h1>
            <span className="text-xs font-mono uppercase bg-cocoa text-white px-2.5 py-0.5 rounded-full font-bold">
              idx-v1
            </span>
          </div>
          <p className="text-xs text-shelf-muted font-sans mt-0.5">
            Laspeyres fixed-weight index, chain-linking, MoM/YoY inflation, and mathematical contribution decomposition (§5).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Baseline Button */}
          <button
            type="button"
            onClick={handleBootstrapDemo}
            title="Seed full 52-week historical series for rich trend curves and YoY comparison"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-white hover:bg-shelf text-xs font-serif font-bold text-cocoa shadow-xs transition"
          >
            <IconSparkles size={14} className="text-cocoa" />
            <span>Seed 52-Wk Baseline</span>
          </button>

          {/* Run History Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-hairline rounded-xl px-2.5 py-1 text-xs font-mono shadow-xs">
            <IconHistory size={15} className="text-cocoa" />
            <select
              value={selectedRunId}
              onChange={(e) => {
                setSelectedRunId(e.target.value);
                loadRunDetails(e.target.value);
              }}
              className="bg-transparent text-cocoa font-sans font-medium focus:outline-none cursor-pointer"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.frequency} · {r.aggregation_method} · {r.created_at?.slice(0, 16).replace('T', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={exportSeriesCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-white hover:bg-shelf text-xs font-serif font-bold text-cocoa shadow-xs transition"
          >
            <IconDownload size={14} className="text-cocoa" />
            <span>Export Series</span>
          </button>

          {/* "Run index" Button with Parameter Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRunPopover(!showRunPopover)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cocoa text-white text-xs font-serif font-bold hover:bg-cocoa/90 transition shadow-xs"
            >
              <IconPlayerPlay size={14} />
              <span>Run Index</span>
            </button>

            {showRunPopover && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRunPopover(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white border-2 border-hairline rounded-2xl shadow-xl p-5 z-50 space-y-4">
                  <div className="border-b border-hairline pb-2">
                    <h4 className="font-serif text-base text-cocoa font-bold">Index Calculation Parameters</h4>
                    <p className="text-[11px] text-shelf-muted font-sans mt-0.5">
                      Configure elementary aggregation and frequency.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold text-cocoa mb-1.5">
                      Elementary Aggregation Method
                    </label>
                    <select
                      value={runParams.aggregation_method}
                      onChange={(e) => setRunParams({ ...runParams, aggregation_method: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-sans rounded-xl border border-hairline bg-shelf-base focus:bg-white focus:outline-none"
                    >
                      <option value="median">Median (Outlier Resilient — Recommended)</option>
                      <option value="mean">Arithmetic Mean (Standard)</option>
                      <option value="geometric">Geometric Mean (Jevons Index)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-serif font-bold text-cocoa mb-1.5">
                      Frequency Series
                    </label>
                    <select
                      value={runParams.frequency}
                      onChange={(e) => setRunParams({ ...runParams, frequency: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-sans rounded-xl border border-hairline bg-shelf-base focus:bg-white focus:outline-none"
                    >
                      <option value="weekly">Weekly Series (52 Weeks)</option>
                      <option value="monthly">Monthly Series (12 Months)</option>
                    </select>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-hairline">
                    <button
                      type="button"
                      onClick={() => setShowRunPopover(false)}
                      className="px-3 py-1.5 rounded-xl border border-hairline text-xs font-serif font-bold text-shelf-muted hover:text-cocoa"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isCalculating}
                      onClick={handleRunIndex}
                      className="px-4 py-1.5 rounded-xl bg-cocoa text-white text-xs font-serif font-bold hover:bg-cocoa/90 shadow-xs disabled:opacity-50"
                    >
                      {isCalculating ? 'Computing Index...' : 'Execute Calculation'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Metrics Strip */}
          {latestPt && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-2xl border-2 border-hairline bg-white p-3.5 shadow-xs">
                <span className="flex items-center gap-1 font-serif text-[11px] font-bold text-shelf-muted">
                  <IconTrendingUp size={13} className="text-cocoa" />
                  <span>Current Index</span>
                </span>
                <div className="font-serif text-xl font-bold text-cocoa mt-1">
                  {formatNumberIN(latestPt.index, 2)}
                </div>
                <div className="font-mono text-[10px] text-shelf-muted mt-0.5">
                  Period: {latestPt.period}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-hairline bg-white p-3.5 shadow-xs">
                <span className="flex items-center gap-1 font-serif text-[11px] font-bold text-shelf-muted">
                  <IconPercentage size={13} className="text-cocoa" />
                  <span>Period MoM</span>
                </span>
                <div className="mt-1">
                  <ChangeBadge value={latestPt.mom} size="md" />
                </div>
                <div className="font-mono text-[10px] text-shelf-muted mt-1">
                  vs previous period
                </div>
              </div>

              <div className="rounded-2xl border-2 border-hairline bg-white p-3.5 shadow-xs">
                <span className="flex items-center gap-1 font-serif text-[11px] font-bold text-shelf-muted">
                  <IconPercentage size={13} className="text-cocoa" />
                  <span>Annual YoY</span>
                </span>
                <div className="mt-1">
                  {latestPt.yoy !== null ? (
                    <ChangeBadge value={latestPt.yoy} size="md" />
                  ) : (
                    <span className="font-mono text-sm text-shelf-muted">Base period</span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-shelf-muted mt-1">
                  52-week lag
                </div>
              </div>

              <div className="rounded-2xl border-2 border-hairline bg-white p-3.5 shadow-xs">
                <span className="flex items-center gap-1 font-serif text-[11px] font-bold text-shelf-muted">
                  <IconCoins size={13} className="text-cocoa" />
                  <span>Basket Cost</span>
                </span>
                <div className="font-serif text-xl font-bold text-cocoa mt-1">
                  {formatINR(latestPt.basket_cost)}
                </div>
                <div className="font-mono text-[10px] text-shelf-muted mt-0.5">
                  15 goods consumption
                </div>
              </div>

              <div className="rounded-2xl border-2 border-hairline bg-white p-3.5 shadow-xs">
                <span className="flex items-center gap-1 font-serif text-[11px] font-bold text-shelf-muted">
                  <IconScale size={13} className="text-cocoa" />
                  <span>Power of ₹100</span>
                </span>
                <div className="font-serif text-xl font-bold text-cocoa mt-1">
                  ₹{latestPt.purchasing_power_100.toFixed(2)}
                </div>
                <div className="font-mono text-[10px] text-shelf-muted mt-0.5">
                  Real purchasing power
                </div>
              </div>

              <div className="rounded-2xl border-2 border-hairline bg-white p-3.5 shadow-xs">
                <span className="flex items-center gap-1 font-serif text-[11px] font-bold text-shelf-muted">
                  <IconCalendarEvent size={13} className="text-cocoa" />
                  <span>Basket Coverage</span>
                </span>
                <div className="font-serif text-xl font-bold text-fall mt-1">
                  {latestPt.coverage}%
                </div>
                <div className="font-mono text-[10px] text-shelf-muted mt-0.5">
                  Active weight quota
                </div>
              </div>
            </div>
          )}

          {/* Bento row: Big Chart + Contributions Waterfall */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Big Index Chart (Span 8) */}
            <BentoTile
              title="Price Index Series Over Time"
              subtitle={`Basket Version: ${currentRun?.basket_name || 'Active Basket'} · Method: ${currentRun?.aggregation_method || 'median'}`}
              colSpan="col-span-12 lg:col-span-8"
              action={
                <span className="font-mono text-xs text-shelf-muted">
                  Base 100 = {currentRun?.base_period || '2024-W01'}
                </span>
              }
            >
              <div className="pt-2">
                <IndexLineChart
                  data={currentRun?.series || []}
                  height={320}
                  showBrush={true}
                />
              </div>
            </BentoTile>

            {/* Contributions Waterfall for Selected Period (Span 4) */}
            <BentoTile
              title="Points Contribution Breakdown"
              subtitle={`Week: ${selectedPeriod || 'Latest'} · Sum equals headline inflation movement`}
              colSpan="col-span-12 lg:col-span-4"
            >
              <div className="pt-1">
                <WaterfallChart items={contributions} maxDisplay={7} />
              </div>
            </BentoTile>
          </div>

          {/* Period Results Table */}
          <div className="bg-white rounded-2xl border-2 border-hairline shadow-xs overflow-hidden">
            <div className="p-4 border-b border-hairline bg-shelf-base/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif text-lg text-cocoa font-bold">Period-by-Period Index Ledger</h3>
                <p className="font-sans text-xs text-shelf-muted mt-0.5">
                  Click any week below to inspect its individual item contributions in the waterfall breakdown above.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-cocoa bg-white border border-hairline px-3 py-1 rounded-xl shadow-xs self-start sm:self-auto">
                {currentRun?.series?.length || 0} periods computed
              </span>
            </div>

            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-shelf border-b border-hairline text-shelf-muted uppercase text-[10px] font-sans font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4 text-right">Index Value</th>
                    <th className="py-3 px-4 text-right">MoM %</th>
                    <th className="py-3 px-4 text-right">YoY %</th>
                    <th className="py-3 px-4 text-right">Coverage (%)</th>
                    <th className="py-3 px-4 text-right">Basket Cost (₹)</th>
                    <th className="py-3 px-4 text-right">Power of ₹100</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-[11px]">
                  {currentRun?.series?.map((pt: any) => {
                    const isSelected = selectedPeriod === pt.period;
                    return (
                      <tr
                        key={pt.period}
                        onClick={() => handleSelectPeriod(pt.period)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-cocoa-wash/50 font-bold border-l-4 border-cocoa'
                            : 'hover:bg-shelf/60'
                        )}
                      >
                        <td className="py-2.5 px-4 font-sans font-semibold text-cocoa">
                          <span className="flex items-center gap-1.5">
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cocoa" />}
                            <span>{pt.period}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-cocoa">
                          {formatNumberIN(pt.index, 2)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <ChangeBadge value={pt.mom} size="sm" />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {pt.yoy !== null ? <ChangeBadge value={pt.yoy} size="sm" /> : <span className="text-shelf-muted">—</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right text-shelf-muted">{pt.coverage}%</td>
                        <td className="py-2.5 px-4 text-right text-ink font-semibold">
                          {formatINR(pt.basket_cost)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-cocoa">
                          ₹{pt.purchasing_power_100.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
