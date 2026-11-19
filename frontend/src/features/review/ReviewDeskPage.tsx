import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import { Skeleton } from '../../components/ui/FeedbackStates';
import {
  IconCheck,
  IconEdit,
  IconX,
  IconAlertTriangle,
  IconShieldCheck,
  IconHistory,
  IconArrowRight,
  IconKeyboard,
  IconBuildingStore,
  IconSparkles,
  IconScan,
  IconDownload,
  IconFilter,
  IconScale,
  IconTrendingUp,
} from '@tabler/icons-react';

export const ReviewDeskPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [correctMode, setCorrectMode] = useState<boolean>(false);
  const [correctedPrice, setCorrectedPrice] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [lastAction, setLastAction] = useState<any | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Fetch pending anomalies
  const {
    data: queueData,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['anomalies-pending'],
    queryFn: () => apiFetch<any>('/anomalies?status=pending&limit=50'),
  });

  // Fetch history anomalies
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['anomalies-history'],
    queryFn: () => apiFetch<any>('/anomalies?status=all&limit=100'),
    enabled: activeTab === 'history',
  });

  const pendingList = queueData?.items || [];
  const summary = queueData?.summary || {
    pending: pendingList.length,
    approved: 0,
    corrected: 0,
    rejected: 0,
    total_decisions: 0,
  };
  const currentCard = pendingList.length > 0 ? pendingList[0] : null;

  // Review mutation (approve / correct / reject)
  const reviewMutation = useMutation({
    mutationFn: async ({
      anomalyId,
      action,
      newPrice,
      commentText,
    }: {
      anomalyId: string;
      action: 'approve' | 'correct' | 'reject';
      newPrice?: number;
      commentText?: string;
    }) => {
      return await apiFetch<any>(`/anomalies/${anomalyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          corrected_price: newPrice,
          comment: commentText,
        }),
      });
    },
    onSuccess: (res, vars) => {
      toast.success(
        `Anomaly ${vars.action.toUpperCase()}D successfully! Official index synchronized.`
      );
      setLastAction({
        anomalyId: vars.anomalyId,
        action: vars.action,
        item: currentCard,
      });
      setCorrectMode(false);
      setCorrectedPrice('');
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['anomalies-pending'] });
      queryClient.invalidateQueries({ queryKey: ['anomalies-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error('Failed to process review decision.');
    },
  });

  // Seed demo anomaly handler
  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await apiFetch<any>('/anomalies/seed-demo', { method: 'POST' });
      toast.success(res.message || 'Seeded demonstration anomalies.');
      refetchQueue();
      queryClient.invalidateQueries({ queryKey: ['anomalies-pending'] });
    } catch {
      toast.error('Failed to seed demo anomalies.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Run anomaly scan handler
  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const res = await apiFetch<any>('/anomalies/scan', { method: 'POST' });
      toast.success(`Scanned records. Found ${res.new_anomalies_flagged} new outliers.`);
      refetchQueue();
      queryClient.invalidateQueries({ queryKey: ['anomalies-pending'] });
    } catch {
      toast.error('Scan completed.');
    } finally {
      setIsScanning(false);
    }
  };

  // Export audit history to CSV
  const handleExportCSV = () => {
    const list = historyData?.items || [];
    if (list.length === 0) return;

    const headers = ['Status', 'Item', 'Market', 'Period', 'Reported Price', 'Corrected Price', 'Reviewer', 'Notes'];
    const rows = list.map((item: any) => [
      item.status,
      `"${item.item_name}"`,
      `"${item.market_name}"`,
      item.period,
      item.observed_price,
      item.corrected_price || '',
      item.reviewed_by || 'System',
      `"${item.review_comment || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pricepulse_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard shortcuts handler: A / C / R
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (!currentCard || reviewMutation.isPending) return;

      const key = e.key.toUpperCase();
      if (key === 'A') {
        e.preventDefault();
        reviewMutation.mutate({
          anomalyId: currentCard.id,
          action: 'approve',
          commentText: 'Keyboard Approved via [A]',
        });
      } else if (key === 'C') {
        e.preventDefault();
        setCorrectMode(true);
        if (currentCard.suggested_price) {
          setCorrectedPrice(String(currentCard.suggested_price));
        }
      } else if (key === 'R') {
        e.preventDefault();
        reviewMutation.mutate({
          anomalyId: currentCard.id,
          action: 'reject',
          commentText: 'Keyboard Rejected via [R]',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, reviewMutation]);

  // Filtered audit list
  const filteredAuditList = (historyData?.items || []).filter((item: any) => {
    const matchesFilter = auditFilter === 'all' || item.status === auditFilter;
    const matchesSearch =
      !auditSearch ||
      item.item_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      item.market_name?.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cocoa">Data Review & Validation Desk</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold border ${
                pendingList.length > 0
                  ? 'bg-price-rise/10 text-price-rise border-price-rise/30 animate-pulse'
                  : 'bg-price-fall/10 text-price-fall border-price-fall/30'
              }`}
            >
              {pendingList.length} Flagged Observations
            </span>
          </div>
          <p className="mt-1 text-xs text-shelf-muted max-w-2xl font-sans">
            Single-card queue for statistical outlier approval, value correction, or rejection with full audit logging.
          </p>
        </div>

        {/* Right Action Buttons & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSeedDemo}
            disabled={isSeeding}
            title="Seed demo outliers (Tomato & Onion shock) for testing review workflows"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-white hover:bg-shelf text-xs font-serif font-bold text-cocoa shadow-xs transition disabled:opacity-50"
          >
            <IconSparkles size={14} className="text-cocoa" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Demo Outliers'}</span>
          </button>

          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            title="Scan database observations with robust MAD z-score"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-white hover:bg-shelf text-xs font-serif font-bold text-cocoa shadow-xs transition disabled:opacity-50"
          >
            <IconScan size={14} className="text-cocoa" />
            <span>{isScanning ? 'Scanning...' : 'Run Anomaly Scan'}</span>
          </button>

          {/* Queue vs Audit Tab Switch */}
          <div className="flex rounded-xl border border-hairline bg-shelf-base p-1 font-sans text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`rounded-lg px-3 py-1 font-serif font-bold transition ${
                activeTab === 'queue' ? 'bg-cocoa text-white shadow-xs' : 'text-shelf-muted hover:text-cocoa'
              }`}
            >
              Review Queue ({pendingList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`rounded-lg px-3 py-1 font-serif font-bold transition ${
                activeTab === 'history' ? 'bg-cocoa text-white shadow-xs' : 'text-shelf-muted hover:text-cocoa'
              }`}
            >
              Audit History
            </button>
          </div>
        </div>
      </div>

      {/* Top Executive KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pending Queue Count */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Pending Queue Items
            </span>
            <div
              className={`rounded-full p-1 ${
                pendingList.length > 0 ? 'bg-price-rise/10 text-price-rise' : 'bg-price-fall/10 text-price-fall'
              }`}
            >
              <IconAlertTriangle size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-2xl font-bold text-cocoa">{pendingList.length}</span>
              <span className="text-xs text-shelf-muted font-sans">
                {pendingList.length === 1 ? 'anomaly awaiting decision' : 'anomalies awaiting decision'}
              </span>
            </div>
            <div className="text-[11px] text-shelf-muted font-sans mt-0.5">
              {pendingList.length > 0 ? 'Requires reviewer action' : 'All clear'}
            </div>
          </div>
        </div>

        {/* Highest Risk Outlier */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Highest Risk Outlier
            </span>
            <div className="rounded-full bg-price-rise/10 p-1 text-price-rise">
              <IconTrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa truncate" title={currentCard?.item_name || 'None'}>
              {currentCard?.item_name || 'Queue Empty'}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5 font-mono">
              <span className="text-lg font-bold text-price-rise">
                {currentCard?.zscore ? `${currentCard.zscore}σ MAD` : '0.0σ'}
              </span>
              <span className="text-[11px] uppercase text-shelf-muted font-mono font-bold">
                {currentCard?.severity || 'Normal'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Audited Decisions */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Total Audited Decisions
            </span>
            <div className="rounded-full bg-price-fall/10 p-1 text-price-fall">
              <IconShieldCheck size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-2xl font-bold text-cocoa">{summary.total_decisions || 0}</span>
              <span className="text-xs text-shelf-muted font-sans">logged in audit ledger</span>
            </div>
            <div className="text-[11px] text-shelf-muted font-mono mt-0.5">
              {summary.approved} apprv · {summary.corrected} corr · {summary.rejected} rej
            </div>
          </div>
        </div>

        {/* Validation Engine Health */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Validation Engine Health
            </span>
            <div className="rounded-full bg-cocoa/10 p-1 text-cocoa">
              <IconScale size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa">Online & Active</div>
            <div className="text-[11px] text-shelf-muted font-sans mt-0.5 leading-tight">
              Plausible boundary check + Robust MAD ($Z &gt; 3.0\sigma$) enabled
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <div className="max-w-3xl mx-auto space-y-4">
          {queueLoading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : !currentCard ? (
            <div className="rounded-2xl border-2 border-hairline bg-white p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-price-fall/10 text-price-fall mb-3">
                <IconShieldCheck size={32} />
              </div>
              <h3 className="font-serif text-xl font-bold text-cocoa">Review Queue Clear</h3>
              <p className="mt-1 text-xs text-shelf-muted max-w-sm mx-auto font-sans">
                All price observations for current reporting periods have been verified. No pending anomalies require audit.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSeedDemo}
                  disabled={isSeeding}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cocoa text-white font-serif text-xs font-bold hover:bg-cocoa/90 transition shadow-xs"
                >
                  <IconSparkles size={14} />
                  <span>Seed Demo Outliers</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-hairline bg-white text-cocoa font-serif text-xs font-bold hover:bg-shelf transition shadow-xs"
                >
                  <IconScan size={14} />
                  <span>Scan Database</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-cocoa/30 bg-white p-6 shadow-sm transition">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-hairline pb-4 mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-price-rise/10 p-2.5 text-price-rise">
                    <IconAlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-shelf-base px-2 py-0.5 font-mono text-[10px] text-shelf-muted border border-hairline uppercase font-bold">
                        Period: {currentCard.period}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${
                          currentCard.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : currentCard.severity === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-shelf-base text-shelf-muted'
                        }`}
                      >
                        {currentCard.severity} outlier
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-cocoa mt-1">
                      {currentCard.item_name}
                    </h3>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs text-shelf-muted block">Queue Position</span>
                  <span className="text-base font-bold text-cocoa">
                    1 of {pendingList.length}
                  </span>
                </div>
              </div>

              {/* Observation Details Bento */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-hairline bg-shelf-base/40 p-4 mb-4">
                <div>
                  <span className="text-[11px] text-shelf-muted font-sans block">Market Location</span>
                  <div className="font-serif text-sm font-bold text-cocoa mt-0.5">{currentCard.market_name}</div>
                  <div className="text-[11px] text-shelf-muted font-sans">{currentCard.district} District</div>
                </div>

                <div>
                  <span className="text-[11px] text-shelf-muted font-sans block">Reported Price</span>
                  <div className="font-mono text-xl font-bold text-price-rise mt-0.5">
                    ₹{currentCard.observed_price?.toFixed(2)}
                    <span className="text-xs font-normal text-shelf-muted font-sans"> / {currentCard.canonical_unit}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-shelf-muted font-sans block">Plausible Boundary Range</span>
                  <div className="font-mono text-xs font-bold text-cocoa mt-0.5">
                    ₹{currentCard.plausible_min ?? 8} — ₹{currentCard.plausible_max ?? 180} / {currentCard.canonical_unit}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-shelf-muted font-sans block">Robust Z-Score (MAD)</span>
                  <div className="font-mono text-xs font-bold text-price-rise mt-0.5 flex items-center gap-1.5">
                    <span>{currentCard.zscore > 0 ? `${currentCard.zscore}σ` : 'Boundary Violation'}</span>
                    <span className="text-[10px] text-shelf-muted font-normal">(&gt;3.0σ limit)</span>
                  </div>
                </div>
              </div>

              {/* Contemporaneous Peer Market Evidence Strip */}
              {currentCard.peer_prices && currentCard.peer_prices.length > 0 && (
                <div className="rounded-xl border border-hairline bg-white p-3.5 mb-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif text-xs font-bold text-cocoa flex items-center gap-1.5">
                      <IconBuildingStore size={14} className="text-cocoa" />
                      <span>Peer Market Contemporaneous Quotes ({currentCard.period}):</span>
                    </span>
                    <span className="text-[11px] text-shelf-muted font-mono">
                      Suggested Median: <strong className="text-cocoa">₹{currentCard.suggested_price?.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    {currentCard.peer_prices.map((p: any) => (
                      <div
                        key={p.market_id}
                        className="rounded-lg border border-hairline bg-shelf-base/60 p-2 flex items-center justify-between"
                      >
                        <span className="text-[11px] text-cocoa font-sans truncate mr-1" title={p.market_name}>
                          {p.market_name.replace('Retail Supermarket', '').replace('Vegetable Market', '').trim()}
                        </span>
                        <span className="font-bold text-cocoa shrink-0">₹{p.price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasons Alert Box */}
              <div className="rounded-xl border border-price-rise/30 bg-price-rise/5 p-3.5 mb-5">
                <span className="block font-serif text-xs font-bold text-price-rise mb-1">
                  Validation Engine Flags:
                </span>
                <ul className="list-inside list-disc space-y-1 font-mono text-[11px] text-cocoa">
                  {currentCard.reasons?.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Correct Mode Form */}
              {correctMode ? (
                <div className="rounded-xl border-2 border-cocoa/40 bg-shelf-base/60 p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-xs font-bold text-cocoa">Enter Correct Price Value</h4>
                    {currentCard.suggested_price && (
                      <button
                        type="button"
                        onClick={() => setCorrectedPrice(String(currentCard.suggested_price))}
                        className="text-[11px] font-mono text-price-fall hover:underline font-bold"
                      >
                        ⚡ Use Suggested Median (₹{currentCard.suggested_price.toFixed(2)})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-shelf-muted font-sans block mb-1">
                        Corrected Price (₹/{currentCard.canonical_unit})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        value={correctedPrice}
                        onChange={(e) => setCorrectedPrice(e.target.value)}
                        placeholder={`e.g. ${currentCard.suggested_price || 32.0}`}
                        className="w-full rounded-xl border border-hairline bg-white px-3 py-2 font-mono text-sm text-cocoa focus:border-cocoa focus:outline-none shadow-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-shelf-muted font-sans block mb-1">
                        Review Note / Rationale
                      </label>
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="e.g. Keyed 10x typo; corrected to market median"
                        className="w-full rounded-xl border border-hairline bg-white px-3 py-2 font-sans text-xs text-cocoa focus:border-cocoa focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCorrectMode(false)}
                      className="rounded-xl px-3 py-1.5 text-xs font-serif font-bold text-shelf-muted hover:text-cocoa"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pVal = parseFloat(correctedPrice);
                        if (!isNaN(pVal) && pVal > 0) {
                          reviewMutation.mutate({
                            anomalyId: currentCard.id,
                            action: 'correct',
                            newPrice: pVal,
                            commentText: comment || 'Corrected via review desk',
                          });
                        }
                      }}
                      disabled={!correctedPrice || reviewMutation.isPending}
                      className="rounded-xl bg-cocoa px-4 py-1.5 font-serif text-xs font-bold text-white hover:bg-cocoa/90 disabled:opacity-50 shadow-xs"
                    >
                      {reviewMutation.isPending ? 'Saving...' : 'Save Correction & Recalculate'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Three Big Action Buttons */
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      reviewMutation.mutate({
                        anomalyId: currentCard.id,
                        action: 'approve',
                        commentText: 'Audited and Approved',
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="flex flex-col items-center justify-center rounded-xl border border-price-fall/40 bg-price-fall/10 py-3.5 text-price-fall transition hover:bg-price-fall hover:text-white shadow-xs"
                  >
                    <IconCheck size={22} />
                    <span className="font-serif text-xs font-bold mt-1">Approve</span>
                    <span className="font-mono text-[10px] opacity-75">Shortcut [A]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCorrectMode(true);
                      if (currentCard.suggested_price) {
                        setCorrectedPrice(String(currentCard.suggested_price));
                      }
                    }}
                    disabled={reviewMutation.isPending}
                    className="flex flex-col items-center justify-center rounded-xl border border-cocoa/40 bg-cocoa/10 py-3.5 text-cocoa transition hover:bg-cocoa hover:text-white shadow-xs"
                  >
                    <IconEdit size={22} />
                    <span className="font-serif text-xs font-bold mt-1">Correct</span>
                    <span className="font-mono text-[10px] opacity-75">Shortcut [C]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      reviewMutation.mutate({
                        anomalyId: currentCard.id,
                        action: 'reject',
                        commentText: 'Rejected as invalid observation',
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="flex flex-col items-center justify-center rounded-xl border border-price-rise/40 bg-price-rise/10 py-3.5 text-price-rise transition hover:bg-price-rise hover:text-white shadow-xs"
                  >
                    <IconX size={22} />
                    <span className="font-serif text-xs font-bold mt-1">Reject</span>
                    <span className="font-mono text-[10px] opacity-75">Shortcut [R]</span>
                  </button>
                </div>
              )}

              {/* Keyboard helper footer */}
              <div className="mt-4 flex flex-wrap items-center justify-between border-t border-hairline pt-3 text-[11px] text-shelf-muted">
                <div className="flex items-center gap-1.5">
                  <IconKeyboard size={15} className="text-cocoa" />
                  <span>
                    Press keys <strong>A</strong> to Approve, <strong>C</strong> to Correct, <strong>R</strong> to Reject
                  </span>
                </div>
                {lastAction && (
                  <span className="font-mono font-bold text-price-fall">
                    ✓ Last action: {lastAction.action.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline/80 pb-3">
            <div className="flex items-center gap-2">
              <IconHistory size={20} className="text-cocoa" />
              <div>
                <h3 className="font-serif text-base font-bold text-cocoa">Review Decision Audit Log</h3>
                <p className="text-xs text-shelf-muted font-sans">
                  Immutable ledger of all reviewer interventions and system classifications
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredAuditList.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-white hover:bg-shelf text-xs font-serif font-bold text-cocoa shadow-xs transition disabled:opacity-50"
              >
                <IconDownload size={14} className="text-cocoa" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-shelf-paper p-3 text-xs">
            <div className="flex items-center gap-2">
              <IconFilter size={15} className="text-cocoa" />
              <span className="font-serif font-bold text-cocoa">Filter Action:</span>
              <div className="flex gap-1">
                {['all', 'approved', 'corrected', 'rejected'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setAuditFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-serif font-medium capitalize transition ${
                      auditFilter === f
                        ? 'bg-cocoa text-white font-bold shadow-2xs'
                        : 'bg-shelf-base text-shelf-muted hover:text-cocoa'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search item or market..."
              className="rounded-lg border border-hairline bg-white px-2.5 py-1 font-sans text-xs text-cocoa focus:outline-none focus:border-cocoa"
            />
          </div>

          {historyLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : filteredAuditList.length === 0 ? (
            <div className="py-12 text-center text-xs font-sans text-shelf-muted">
              No audit log entries found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-hairline">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-hairline bg-shelf-base font-serif text-[11px] text-cocoa font-bold">
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Market</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 font-mono">Reported</th>
                    <th className="py-2.5 px-3 font-mono">Corrected</th>
                    <th className="py-2.5 px-3">Reviewer Note</th>
                    <th className="py-2.5 px-3">Auditor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filteredAuditList.map((item: any) => (
                    <tr key={item.id} className="hover:bg-shelf-base/40">
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            item.status === 'approved'
                              ? 'bg-price-fall/10 text-price-fall'
                              : item.status === 'corrected'
                              ? 'bg-cocoa/10 text-cocoa'
                              : item.status === 'rejected'
                              ? 'bg-price-rise/10 text-price-rise'
                              : 'bg-shelf-base text-shelf-muted'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-serif font-bold text-cocoa">{item.item_name}</td>
                      <td className="py-2.5 px-3 text-shelf-muted font-sans">{item.market_name}</td>
                      <td className="py-2.5 px-3 font-mono text-shelf-muted">{item.period}</td>
                      <td className="py-2.5 px-3 font-mono font-medium">₹{item.observed_price?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cocoa">
                        {item.corrected_price ? `₹${item.corrected_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-shelf-muted text-[11px] max-w-xs truncate">
                        {item.review_comment || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-shelf-muted text-[11px] font-mono">
                        {item.reviewed_by || 'Auto/System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
