import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { HeroNumber } from '@/components/ui/HeroNumber';
import { ChangeBadge } from '@/components/ui/ChangeBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { IndexLineChart } from '@/components/charts/IndexLineChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { Skeleton } from '@/components/ui/FeedbackStates';
import { toast } from 'sonner';
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconClock,
  IconSparkles,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconTrendingUp,
  IconActivity,
  IconShoppingCart,
  IconBuildingStore,
  IconShieldCheck,
  IconFileText,
  IconChevronRight,
  IconScale,
  IconCarrot,
  IconMilk,
  IconDroplet,
  IconReceipt,
} from '@tabler/icons-react';
import { cn, formatINR, formatNumberIN } from '@/lib/utils';

interface CategoryPressure {
  id: string;
  name: string;
  icon: React.ReactNode;
  weightPct: number;
  changePct: number;
  status: 'rise' | 'fall' | 'stable';
  leadItem: string;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [movers, setMovers] = useState<any>(null);
  const [latestRun, setLatestRun] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [openAnomalies, setOpenAnomalies] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [sumRes, movRes, runsRes, anomRes, mktRes] = await Promise.all([
        apiFetch<any>('/dashboard/summary').catch(() => null),
        apiFetch<any>('/dashboard/movers').catch(() => null),
        apiFetch<any[]>('/index/runs?limit=1').catch(() => []),
        apiFetch<any>('/anomalies?status=pending&limit=3').catch(() => null),
        apiFetch<any>('/markets/compare?period=latest').catch(() => null),
      ]);

      setSummary(sumRes);
      setMovers(movRes);
      setMarketData(mktRes);
      const anomList = Array.isArray(anomRes) ? anomRes : ((anomRes as any)?.items || []);
      setOpenAnomalies(anomList);

      if (runsRes && runsRes.length > 0) {
        const run = runsRes[0];
        setLatestRun(run);
        const cRes = await apiFetch<any>(`/index/runs/${run.id}/contributions`).catch(() => null);
        if (cRes && cRes.contributions) {
          setContributions(cRes.contributions);
        }
      } else {
        setLatestRun(null);
        setContributions([]);
      }

      if (isManual) {
        toast.success('Dashboard metrics refreshed');
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleBootstrapData = async () => {
    setBootstrapping(true);
    try {
      const res = await apiFetch<any>('/master/bootstrap-demo-data', { method: 'POST' });
      toast.success(res.message || 'Live series initialized successfully!');
      await fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize live series');
    } finally {
      setBootstrapping(false);
    }
  };

  const hasData = Boolean(latestRun && latestRun.series && latestRun.series.length > 0);
  const yoyVal = summary?.headline_yoy ?? 0.0;
  const momVal = summary?.mom ?? 0.0;
  const coverageVal = summary?.coverage ?? 0.0;
  const basketCost = summary?.basket_cost ?? 0.0;
  const purchasingPower = summary?.purchasing_power_100 ?? 100.0;
  const openCount = summary?.open_flags_count ?? (Array.isArray(openAnomalies) ? openAnomalies.length : 0);
  const daysSince = summary?.data_freshness_days ?? 0;

  // Mini sparkline data points from latest run series
  const sparklineSeries = hasData ? (latestRun?.series || []).slice(-8) : [];
  const maxSpark = sparklineSeries.length > 0 ? Math.max(...sparklineSeries.map((s: any) => s.index)) : 100;
  const minSpark = sparklineSeries.length > 0 ? Math.min(...sparklineSeries.map((s: any) => s.index)) : 100;

  // DYNAMIC CATEGORY INFLATION PRESSURE (Computed entirely from backend contributions)
  const categoryPressures: CategoryPressure[] = useMemo(() => {
    if (!hasData || !contributions || contributions.length === 0) {
      return [];
    }

    const catMap: Record<string, { name: string; weight: number; points: number; items: any[] }> = {};

    contributions.forEach((c: any) => {
      const catName = c.category_name || 'General';
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, weight: 0, points: 0, items: [] };
      }
      catMap[catName].weight += Number(c.weight || 0);
      catMap[catName].points += Number(c.points || 0);

      const relCurr = Number(c.relative_current || 1.0);
      const relPrev = Number(c.relative_prev || 1.0);
      const chgPct = relPrev > 0 ? ((relCurr / relPrev) - 1.0) * 100 : 0;
      catMap[catName].items.push({
        name: c.item_name || c.item_id,
        chgPct,
        points: Number(c.points || 0),
      });
    });

    const iconForCat = (catName: string) => {
      const lower = catName.toLowerCase();
      if (lower.includes('veg')) return <IconCarrot size={18} className="text-[#8F2D17]" />;
      if (lower.includes('pulse')) return <IconScale size={18} className="text-[#B45309]" />;
      if (lower.includes('cereal') || lower.includes('grain')) return <IconReceipt size={18} className="text-[#5B3A29]" />;
      if (lower.includes('milk') || lower.includes('dairy')) return <IconMilk size={18} className="text-[#2563EB]" />;
      if (lower.includes('oil')) return <IconDroplet size={18} className="text-[#D97706]" />;
      return <IconActivity size={18} className="text-[#2D6A4F]" />;
    };

    return Object.entries(catMap).map(([catName, data]) => {
      const sortedItems = [...data.items].sort((a, b) => Math.abs(b.chgPct) - Math.abs(a.chgPct));
      const lead = sortedItems[0];
      const avgChange = data.items.length > 0 ? data.items.reduce((s, it) => s + it.chgPct, 0) / data.items.length : 0;
      const status: 'rise' | 'fall' | 'stable' = avgChange > 0.3 ? 'rise' : avgChange < -0.3 ? 'fall' : 'stable';

      return {
        id: catName,
        name: catName,
        icon: iconForCat(catName),
        weightPct: Number((data.weight * 100).toFixed(1)),
        changePct: Number(avgChange.toFixed(2)),
        status,
        leadItem: lead ? `${lead.name} (${lead.chgPct >= 0 ? '+' : ''}${lead.chgPct.toFixed(1)}%)` : 'Stable',
      };
    });
  }, [hasData, contributions]);

  // DYNAMIC REGIONAL DISTRICT COMPARISON (Computed from live /markets/compare ranking)
  const rankings = marketData?.cheapest_ranking || marketData?.rankings || [];
  const cheapestMarket = rankings.length > 0 ? rankings[0].market_name : null;
  const mostExpensiveMarket = rankings.length > 0 ? rankings[rankings.length - 1].market_name : null;
  const regionalSpreadPct = rankings.length > 0 ? rankings[rankings.length - 1].diff_from_cheapest_pct ?? 0 : 0;

  // Group district basket costs dynamically
  const districtStats = useMemo(() => {
    if (!rankings || rankings.length === 0) return [];
    const distMap: Record<string, { costs: number[] }> = {};
    rankings.forEach((r: any) => {
      const d = r.district || 'Other';
      if (!distMap[d]) distMap[d] = { costs: [] };
      distMap[d].costs.push(Number(r.basket_cost || 0));
    });

    return Object.entries(distMap).map(([district, data]) => {
      const avg = data.costs.reduce((a, b) => a + b, 0) / data.costs.length;
      return {
        district,
        avgCost: avg,
        note: `${data.costs.length} Hubs`,
      };
    });
  }, [rankings]);

  if (loading) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <Skeleton className="col-span-12 md:col-span-5 h-80 rounded-2xl" />
          <Skeleton className="col-span-12 md:col-span-4 h-80 rounded-2xl" />
          <Skeleton className="col-span-12 md:col-span-3 h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-fade-in pb-10">
      {/* 1-Click Bootstrap Banner when DB is empty */}
      {!hasData && (
        <div className="overflow-hidden rounded-2xl border-2 border-hairline bg-shelf-paper p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cocoa text-white font-mono text-xs font-bold shadow-xs">
                  ⚡
                </span>
                <h3 className="font-serif text-base font-bold text-cocoa">
                  Clean Database State: No Calculated Price Series Yet
                </h3>
              </div>
              <p className="font-sans text-xs text-shelf-muted leading-relaxed">
                Initialize the official 15-item essential goods basket, 6 regional markets across 3 districts, and 52 weeks of synthetic price series to activate all real-time Laspeyres charts instantly.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBootstrapData}
              disabled={bootstrapping}
              className="flex items-center justify-center gap-2 rounded-xl bg-cocoa px-5 py-3 font-serif text-xs font-bold text-white shadow-sm hover:bg-cocoa/90 transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <IconSparkles size={16} />
              <span>{bootstrapping ? 'Generating Live Data & Series...' : 'Initialize Live Basket & Series'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TOP EXECUTIVE KPI STRIP (Pure Dynamic Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* KPI 1: Headline YoY */}
        <div className="rounded-2xl border border-hairline bg-tile p-4 shadow-xs hover:border-cocoa/40 transition">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-bold">
              Headline Inflation (YoY)
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cocoa/10 text-cocoa">
              <IconTrendingUp size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-cocoa tabular-nums">
              {hasData ? (yoyVal >= 0 ? `+${yoyVal.toFixed(1)}%` : `${yoyVal.toFixed(1)}%`) : '—'}
            </span>
            <span className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
              hasData ? "bg-[#E7F3EE] text-[#2D6A4F]" : "bg-shelf text-muted"
            )}>
              {hasData ? 'Corridor 4%–6%' : 'Awaiting Series'}
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">
            {hasData ? 'Laspeyres fixed-weight index · Baseline 2024' : 'Run index calculation to generate headline inflation'}
          </p>
        </div>

        {/* KPI 2: MoM Velocity */}
        <div className="rounded-2xl border border-hairline bg-tile p-4 shadow-xs hover:border-cocoa/40 transition">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-bold">
              MoM Price Velocity
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cocoa/10 text-cocoa">
              <IconActivity size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-cocoa tabular-nums">
              {hasData ? (momVal >= 0 ? `+${momVal.toFixed(2)}%` : `${momVal.toFixed(2)}%`) : '—'}
            </span>
            <span className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
              !hasData ? "bg-shelf text-muted" :
              momVal <= 0 ? "bg-[#E7F3EE] text-[#2D6A4F]" : "bg-[#FDF3F0] text-[#8F2D17]"
            )}>
              {!hasData ? "Awaiting Data" : momVal <= 0 ? "Softening" : "Accelerating"}
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">
            Month-over-month aggregate trajectory
          </p>
        </div>

        {/* KPI 3: Household Basket Cost */}
        <div className="rounded-2xl border border-hairline bg-tile p-4 shadow-xs hover:border-cocoa/40 transition">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-bold">
              Standard Basket Cost
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cocoa/10 text-cocoa">
              <IconShoppingCart size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-cocoa tabular-nums">
              {hasData ? formatINR(basketCost) : '₹0.00'}
            </span>
            <span className="rounded bg-shelf px-1.5 py-0.5 font-mono text-[10px] font-bold text-cocoa">
              15 Goods
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">
            {hasData ? `Purchasing power: ₹${purchasingPower.toFixed(2)} / ₹100` : 'Awaiting price collection records'}
          </p>
        </div>

        {/* KPI 4: Market Surveillance */}
        <div className="rounded-2xl border border-hairline bg-tile p-4 shadow-xs hover:border-cocoa/40 transition">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-bold">
              Market Surveillance
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cocoa/10 text-cocoa">
              <IconShieldCheck size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-cocoa tabular-nums">
              {coverageVal.toFixed(0)}%
            </span>
            <span className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
              !hasData ? "bg-shelf text-muted" :
              openCount > 0 ? "bg-[#FEF7EC] text-[#D97706]" : "bg-[#E7F3EE] text-[#2D6A4F]"
            )}>
              {!hasData ? "0 Observations" : openCount > 0 ? `${openCount} Outlier Pending` : "Desk Clear"}
            </span>
          </div>
          <p className="mt-1 font-sans text-[11px] text-muted">
            6 retail & wholesale hubs across 3 districts
          </p>
        </div>
      </div>

      {/* QUICK OPERATIONAL ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-tile px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-sans text-muted">
          <span className="font-bold text-cocoa font-serif">Quick Actions:</span>
          <span>Access high-frequency tools directly from the executive deck</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 font-sans text-xs font-semibold text-cocoa hover:bg-shelf transition cursor-pointer"
          >
            <IconRefresh size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>

          <Link
            to="/review"
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 font-sans text-xs font-semibold text-cocoa hover:bg-shelf transition"
          >
            <IconShieldCheck size={14} className="text-warn" />
            <span>Review Desk ({openCount})</span>
          </Link>

          <Link
            to="/bulletins"
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 font-sans text-xs font-semibold text-cocoa hover:bg-shelf transition"
          >
            <IconFileText size={14} className="text-cocoa" />
            <span>Official Bulletins (PDF)</span>
          </Link>

          <Link
            to="/markets"
            className="flex items-center gap-1.5 rounded-lg bg-cocoa px-3.5 py-1.5 font-sans text-xs font-bold text-white hover:bg-cocoa/90 transition shadow-xs"
          >
            <IconBuildingStore size={14} />
            <span>Regional Price Gaps</span>
          </Link>
        </div>
      </div>

      {/* 12-COLUMN FLUID BENTO GRID */}
      <BentoGrid>
        {/* TILE 1: HERO INFLATION NUMBER (Span 5) */}
        <BentoTile
          title="Headline Inflation Rate"
          subtitle={`Current Period: ${summary?.period || (hasData ? '2024-W52' : 'No Active Period')} · Formula: idx-v1`}
          colSpan="col-span-12 md:col-span-6 lg:col-span-5"
          action={
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-cocoa text-white px-2.5 py-0.5 rounded-full font-bold">
                {summary?.basket_version_name || (hasData ? 'Official Basket' : 'Awaiting Basket')}
              </span>
            </div>
          }
        >
          <div className="py-2">
            <HeroNumber
              value={hasData ? yoyVal : 0.0}
              prefix={hasData ? (yoyVal >= 0 ? '▲ +' : '▼ ') : '—'}
              suffix={hasData ? '%' : ''}
              subtext={hasData ? `MoM Change: ${momVal >= 0 ? '+' : ''}${momVal}% · Coverage: ${coverageVal}% of basket weight` : 'No calculated index run in database yet'}
            />

            {/* Visual SVG Sparkline of Recent Periods */}
            {hasData && sparklineSeries.length > 2 && (
              <div className="mt-4 pt-3 border-t border-hairline/60">
                <div className="flex items-center justify-between text-[11px] font-mono text-shelf-muted mb-1.5">
                  <span>8-Week Index Trajectory</span>
                  <span className="font-bold text-cocoa">{sparklineSeries[sparklineSeries.length - 1].period}</span>
                </div>
                <div className="h-10 w-full flex items-end gap-1.5 pt-1">
                  {sparklineSeries.map((pt: any, idx: number) => {
                    const range = maxSpark - minSpark || 1;
                    const heightPct = Math.max(15, Math.min(100, ((pt.index - minSpark) / range) * 85 + 15));
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center group relative cursor-pointer"
                        title={`${pt.period}: ${pt.index.toFixed(2)}`}
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full rounded-t bg-cocoa/30 hover:bg-cocoa transition-all"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-hairline/60 flex items-center justify-between text-xs font-sans text-muted">
            <span>Laspeyres fixed-weight index</span>
            <Link to="/index" className="text-cocoa font-medium hover:underline flex items-center gap-1">
              <span>View Calculations</span>
              <IconArrowUpRight size={14} />
            </Link>
          </div>
        </BentoTile>

        {/* TILE 2: BASKET COST & PURCHASING POWER (Span 4) */}
        <BentoTile
          title="Essential Basket Cost & Power"
          subtitle="Fixed consumption bundle in ₹ vs base period anchor"
          colSpan="col-span-12 md:col-span-6 lg:col-span-4"
        >
          <div className="space-y-3 py-1">
            <div className="bg-shelf/60 p-3 rounded-lg border border-hairline">
              <span className="text-[10px] uppercase font-mono text-muted block mb-0.5 font-bold">
                Monthly Basket Cost
              </span>
              <div className="font-serif text-3xl text-cocoa font-bold tabular-nums">
                {hasData ? formatINR(basketCost) : '₹0.00'}
              </div>
              <span className="text-[11px] text-muted font-sans mt-0.5 block">
                {hasData ? 'Aggregated median of 15 essential goods' : 'Awaiting recorded price observations'}
              </span>
            </div>

            <div className="bg-shelf/60 p-3 rounded-lg border border-hairline">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-[10px] uppercase font-mono text-muted block font-bold">
                    Purchasing Power of ₹100
                  </span>
                  <span className="text-[10px] text-muted font-sans">
                    Formula: 10,000 / I_t
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-cocoa tabular-nums">
                  ₹{hasData ? purchasingPower.toFixed(2) : '100.00'}
                </div>
              </div>

              {/* Visual Purchasing Power Bar */}
              <div className="w-full bg-hairline h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${hasData ? Math.min(100, Math.max(0, purchasingPower)) : 0}%` }}
                  className="bg-cocoa h-full rounded-full transition-all"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-shelf-muted mt-1">
                <span>Erosion: {hasData ? (100 - purchasingPower).toFixed(1) : '0.0'}%</span>
                <span>Base Anchor: ₹100.00</span>
              </div>
            </div>
          </div>
        </BentoTile>

        {/* TILE 3: OPEN REVIEW FLAGS (Span 3) */}
        <BentoTile
          title="Review Desk Queue"
          subtitle="Suspicious price jumps requiring verification"
          colSpan="col-span-12 md:col-span-6 lg:col-span-3"
          action={
            <span
              className={cn(
                'text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold',
                openCount > 0 ? 'bg-warn text-white' : 'bg-fall text-white'
              )}
            >
              {openCount} Open
            </span>
          }
        >
          <div className="space-y-2 py-1">
            {!Array.isArray(openAnomalies) || openAnomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fall/10 text-fall mb-2">
                  <IconCheck size={20} />
                </div>
                <span className="text-xs font-serif font-bold text-cocoa">Queue Clear</span>
                <span className="text-[11px] text-shelf-muted font-sans mt-0.5">
                  No pending outlier flags in current period.
                </span>
              </div>
            ) : (
              openAnomalies.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-lg bg-shelf/50 border border-hairline text-xs font-sans space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-cocoa truncate max-w-[140px]">
                      {a.item_name || a.item_id}
                    </span>
                    <span className="rounded bg-warn/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-warn">
                      Verify
                    </span>
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    {Array.isArray(a.reasons) ? a.reasons[0] : (a.reason || 'Flagged price outlier')}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-hairline/60">
            <Link
              to="/review"
              className="text-xs font-sans text-cocoa font-bold hover:underline flex items-center justify-between"
            >
              <span>Open Review Desk Queue</span>
              <IconArrowUpRight size={14} />
            </Link>
          </div>
        </BentoTile>

        {/* TILE: CATEGORY INFLATION PRESSURE MATRIX (100% Dynamic from Backend) */}
        <BentoTile
          title="Category Inflation Pressure Matrix"
          subtitle="Real-time commodity sector price momentum across core basket groupings"
          colSpan="col-span-12"
          action={
            categoryPressures.length > 0 ? (
              <div className="flex items-center gap-3 text-xs font-sans">
                <span className="flex items-center gap-1 font-mono text-[10px] text-[#8F2D17] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-[#8F2D17]" /> Riser Pressure
                </span>
                <span className="flex items-center gap-1 font-mono text-[10px] text-[#2D6A4F] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-[#2D6A4F]" /> Easing / Deflating
                </span>
              </div>
            ) : undefined
          }
        >
          {categoryPressures.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted font-sans border border-dashed border-hairline rounded-xl bg-shelf/30">
              <IconAlertCircle size={22} className="mx-auto mb-1.5 text-cocoa/40" />
              <span className="font-serif font-bold text-cocoa block text-sm">No Category Price Dynamics Available</span>
              <span className="text-[11px] text-shelf-muted mt-0.5 block max-w-md mx-auto">
                Category price momentum will compute dynamically from recorded price observations once an index run is calculated.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {categoryPressures.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-xl border border-hairline bg-shelf/40 p-3 flex flex-col justify-between hover:bg-white hover:shadow-xs transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-hairline shadow-2xs">
                        {cat.icon}
                      </span>
                      <span className={cn(
                        "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded",
                        cat.status === 'rise' ? 'bg-[#FDF3F0] text-[#8F2D17]' :
                        cat.status === 'fall' ? 'bg-[#E7F3EE] text-[#2D6A4F]' :
                        'bg-shelf text-cocoa'
                      )}>
                        {cat.changePct >= 0 ? `+${cat.changePct.toFixed(1)}%` : `${cat.changePct.toFixed(1)}%`}
                      </span>
                    </div>
                    <h4 className="font-serif text-xs font-bold text-cocoa truncate">
                      {cat.name}
                    </h4>
                    <div className="text-[10px] font-mono text-muted mt-0.5">
                      Weight: {cat.weightPct}% of basket
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-hairline/60">
                    <div className="text-[10px] font-sans text-muted truncate">
                      Lead: <span className="font-medium text-cocoa">{cat.leadItem}</span>
                    </div>
                    {/* Visual micro bar */}
                    <div className="mt-1.5 h-1 w-full bg-hairline rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(15, Math.abs(cat.changePct) * 12))}%` }}
                        className={cn(
                          "h-full rounded-full",
                          cat.status === 'rise' ? 'bg-[#8F2D17]' :
                          cat.status === 'fall' ? 'bg-[#2D6A4F]' : 'bg-cocoa'
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BentoTile>

        {/* TILE 4: WIDE INDEX LINE CHART WITH BRUSH (Span 8) */}
        <BentoTile
          title="Retail Price Index Trend Series"
          subtitle="Fixed-weight Laspeyres series over time with period brush scrubber (§10.6)"
          colSpan="col-span-12 lg:col-span-8"
        >
          <div className="pt-2">
            <IndexLineChart
              data={latestRun?.series || []}
              height={280}
              showBrush={true}
            />
          </div>
        </BentoTile>

        {/* TILE 5: TOP MOVERS TILE WITH PROPORTIONAL BARS (Span 4) */}
        <BentoTile
          title="Top Price Movers"
          subtitle="Largest percentage changes in latest period"
          colSpan="col-span-12 lg:col-span-4"
        >
          <div className="space-y-2 py-1">
            {(!movers?.top_risers || movers.top_risers.length === 0) &&
            (!movers?.top_fallers || movers.top_fallers.length === 0) ? (
              <div className="text-center py-10 text-xs text-muted font-sans">
                No significant movers in selected period.
              </div>
            ) : (
              <>
                {movers?.top_risers?.slice(0, 3).map((m: any) => {
                  const barWidth = Math.min(100, Math.max(10, Math.abs(m.change_pct) * 6));
                  return (
                    <div
                      key={m.item_id}
                      className="p-2 rounded-lg bg-shelf/40 border border-hairline text-xs font-sans space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <IconArrowUpRight size={14} className="text-rise shrink-0" />
                          <span className="font-serif font-bold text-cocoa truncate">{m.item_name}</span>
                        </div>
                        <ChangeBadge value={m.change_pct} size="sm" />
                      </div>
                      <div className="w-full bg-shelf h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className="bg-rise h-full rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-shelf-muted">
                        <span>Price: ₹{m.current_price?.toFixed(2)} / {m.canonical_unit}</span>
                        <span>Contr: +{m.points_contribution?.toFixed(2)} pts</span>
                      </div>
                    </div>
                  );
                })}

                {movers?.top_fallers?.slice(0, 3).map((m: any) => {
                  const barWidth = Math.min(100, Math.max(10, Math.abs(m.change_pct) * 6));
                  return (
                    <div
                      key={m.item_id}
                      className="p-2 rounded-lg bg-shelf/40 border border-hairline text-xs font-sans space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <IconArrowDownRight size={14} className="text-fall shrink-0" />
                          <span className="font-serif font-bold text-cocoa truncate">{m.item_name}</span>
                        </div>
                        <ChangeBadge value={m.change_pct} size="sm" />
                      </div>
                      <div className="w-full bg-shelf h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${barWidth}%` }}
                          className="bg-fall h-full rounded-full"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-shelf-muted">
                        <span>Price: ₹{m.current_price?.toFixed(2)} / {m.canonical_unit}</span>
                        <span>Contr: {m.points_contribution?.toFixed(2)} pts</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </BentoTile>

        {/* TILE 6: CATEGORY CONTRIBUTION WATERFALL (Span 7) */}
        <BentoTile
          title="Category & Item Inflation Drivers (Waterfall)"
          subtitle="Points contribution C_it = 100 · w_i · (R_it - R_i,t-1) summing to headline change"
          colSpan="col-span-12 lg:col-span-7"
        >
          <div className="pt-1">
            <WaterfallChart items={contributions} maxDisplay={6} />
          </div>
        </BentoTile>

        {/* TILE 7: REGIONAL DISTRICT SNAPSHOT & SPREAD INSIGHTS (Pure Dynamic from Backend) */}
        <BentoTile
          title="Regional District Snapshot & Spreads"
          subtitle="Cross-market basket cost comparisons and arbitrage opportunities"
          colSpan="col-span-12 lg:col-span-5"
          action={
            <Link
              to="/markets"
              className="text-xs font-sans text-cocoa font-bold hover:underline flex items-center gap-1"
            >
              <span>Explore Markets</span>
              <IconChevronRight size={14} />
            </Link>
          }
        >
          {rankings.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted font-sans border border-dashed border-hairline rounded-xl bg-shelf/30">
              <IconBuildingStore size={22} className="mx-auto mb-1.5 text-cocoa/40" />
              <span className="font-serif font-bold text-cocoa block text-sm">No Regional Market Quotes Recorded</span>
              <span className="text-[11px] text-shelf-muted mt-0.5 block max-w-xs mx-auto">
                Cross-market price comparisons and district spreads will display once observations are logged across regional hubs.
              </span>
            </div>
          ) : (
            <div className="space-y-3 py-1 text-xs font-sans">
              {/* Cheapest vs Expensive Highlight Box */}
              <div className="rounded-xl border border-hairline bg-shelf/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-muted">
                    Cheapest Identified Hub
                  </span>
                  <span className="rounded bg-[#E7F3EE] px-2 py-0.5 font-mono text-[10px] font-bold text-[#2D6A4F]">
                    Save {regionalSpreadPct}% vs Retail
                  </span>
                </div>
                <div className="font-serif text-sm font-bold text-cocoa">
                  {cheapestMarket}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-hairline/60">
                  <span>Costliest: <strong className="text-cocoa font-medium">{mostExpensiveMarket}</strong></span>
                  <span className="font-mono text-cocoa font-bold">Spread: {regionalSpreadPct}%</span>
                </div>
              </div>

              {/* Dynamic District Basket Overview Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {districtStats.map((d) => (
                  <div key={d.district} className="rounded-lg border border-hairline bg-tile p-2.5 text-center">
                    <div className="font-mono text-[10px] uppercase text-muted font-bold truncate">{d.district}</div>
                    <div className="font-serif text-sm font-bold text-cocoa mt-0.5">₹{d.avgCost.toFixed(2)}</div>
                    <div className="font-mono text-[9px] text-muted mt-0.5">{d.note}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-hairline/60 flex items-center justify-between text-muted text-[11px]">
                <span>{rankings.length} monitoring centers live</span>
                <Link to="/markets" className="text-cocoa font-bold hover:underline flex items-center gap-1">
                  <span>View Full Dumbbell Gaps</span>
                  <IconArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </BentoTile>

        {/* TILE 8: DATA FRESHNESS & AUDIT INTEGRITY (Full Span 12) */}
        <BentoTile
          title="Data Freshness, Surveillance & Governance Log"
          subtitle="Reproducible audit trail and collection freshness monitoring"
          colSpan="col-span-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-1 text-xs font-sans">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-shelf/60 border border-hairline">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cocoa/10 text-cocoa">
                <IconClock size={20} />
              </div>
              <div>
                <div className="font-serif font-bold text-cocoa">Latest Ingestion Date</div>
                <div className="text-[11px] text-muted font-mono">{summary?.latest_observation_date || (hasData ? '2024-12-29' : 'No records yet')}</div>
                <div className="text-[10px] font-mono text-[#2D6A4F] font-bold mt-0.5">
                  {daysSince > 0 && hasData ? `Fresh (${daysSince} days ago)` : hasData ? 'Fresh' : 'Awaiting Data'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-shelf/60 border border-hairline">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cocoa/10 text-cocoa">
                <IconScale size={20} />
              </div>
              <div>
                <div className="font-serif font-bold text-cocoa">Laspeyres Engine idx-v1</div>
                <div className="text-[11px] text-muted">Fixed-weight formulation with chained linking</div>
                <div className="text-[10px] font-mono text-cocoa font-bold mt-0.5">
                  Active Weights: 15 / 15 Items
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-shelf/60 border border-hairline">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cocoa/10 text-cocoa">
                <IconShieldCheck size={20} />
              </div>
              <div>
                <div className="font-serif font-bold text-cocoa">Surveillance Governance</div>
                <div className="text-[11px] text-muted">Dual MAD z-score & absolute bounds engine</div>
                <div className="text-[10px] font-mono text-warn font-bold mt-0.5">
                  {openCount > 0 ? `${openCount} observation awaiting supervisor review` : 'Queue Clear (0 Pending)'}
                </div>
              </div>
            </div>
          </div>
        </BentoTile>
      </BentoGrid>
    </div>
  );
};
