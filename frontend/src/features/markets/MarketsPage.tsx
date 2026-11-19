import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import { Skeleton, ErrorState } from '../../components/ui/FeedbackStates';
import { DumbbellChart } from '../../components/charts/DumbbellChart';
import { SmallMultiples } from '../../components/charts/SmallMultiples';
import {
  IconBuildingStore,
  IconChartDots,
  IconTrophy,
  IconArrowsExchange,
  IconFilter,
  IconInfoCircle,
  IconCalendar,
  IconSparkles,
  IconTrendingDown,
  IconTrendingUp,
  IconScale,
} from '@tabler/icons-react';

export const MarketsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['markets-compare', selectedPeriod, selectedDistrict],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append('period', selectedPeriod);
      if (selectedDistrict !== 'all') params.append('district', selectedDistrict);
      return await apiFetch<any>(`/markets/compare?${params.toString()}`);
    },
  });

  const districts = ['all', 'Chennai', 'Madurai', 'Coimbatore'];

  const handleBootstrapDemo = async () => {
    setIsBootstrapping(true);
    try {
      await apiFetch('/master/bootstrap-demo-data', { method: 'POST' });
      toast.success('Seeded 52-week baseline price data successfully!');
      queryClient.invalidateQueries({ queryKey: ['markets-compare'] });
      refetch();
    } catch {
      toast.error('Failed to trigger demo seed.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Derive top-line KPI metrics
  const cheapestMarket = data?.cheapest_ranking?.[0];
  const retailMarkets = (data?.cheapest_ranking || []).filter((m: any) => m.market_type === 'retail');
  const wholesaleMarkets = (data?.cheapest_ranking || []).filter((m: any) => m.market_type === 'wholesale');
  const highestRetailMarket = retailMarkets.length > 0 ? retailMarkets[retailMarkets.length - 1] : null;

  // Wholesale-to-Retail Spread Gap
  const avgWholesaleCost =
    wholesaleMarkets.length > 0
      ? wholesaleMarkets.reduce((acc: number, m: any) => acc + m.basket_cost, 0) / wholesaleMarkets.length
      : 0;
  const avgRetailCost =
    retailMarkets.length > 0
      ? retailMarkets.reduce((acc: number, m: any) => acc + m.basket_cost, 0) / retailMarkets.length
      : 0;
  const wholesaleRetailSpreadPct =
    avgWholesaleCost > 0 ? (((avgRetailCost - avgWholesaleCost) / avgWholesaleCost) * 100).toFixed(1) : '0.0';

  // Top Volatile / Dispersed Good
  const topDispersedItem = data?.item_gaps?.[0];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cocoa">Regional Markets & Price Dispersion</h1>
            <span className="rounded-full bg-shelf-base px-2.5 py-0.5 text-[11px] font-mono text-shelf-muted border border-hairline">
              Illustrative sample data
            </span>
          </div>
          <p className="mt-1 text-xs text-shelf-muted max-w-2xl font-sans">
            Cross-market basket cost comparisons and item price gaps across retail and wholesale hubs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBootstrapDemo}
            disabled={isBootstrapping}
            title="Seed full 52-week historical series for rich regional dispersion curves"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-hairline bg-white hover:bg-shelf text-xs font-serif font-bold text-cocoa shadow-xs transition disabled:opacity-50"
          >
            <IconSparkles size={15} className="text-cocoa" />
            <span>{isBootstrapping ? 'Seeding...' : 'Seed 52-Wk Baseline'}</span>
          </button>
        </div>
      </div>

      {/* Top Regional KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cheapest Market Hub */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Cheapest Market Hub
            </span>
            <div className="rounded-full bg-price-fall/10 p-1 text-price-fall">
              <IconTrendingDown size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa truncate" title={cheapestMarket?.market_name || '—'}>
              {cheapestMarket?.market_name || 'Loading...'}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5 font-mono">
              <span className="text-lg font-bold text-price-fall">
                ₹{cheapestMarket?.basket_cost ? cheapestMarket.basket_cost.toFixed(2) : '—'}
              </span>
              <span className="text-[11px] text-shelf-muted">/ standard basket</span>
            </div>
            <div className="text-[11px] text-shelf-muted capitalize mt-0.5">
              {cheapestMarket ? `${cheapestMarket.district} • ${cheapestMarket.market_type}` : '—'}
            </div>
          </div>
        </div>

        {/* Highest Retail Hub */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Highest Retail Hub
            </span>
            <div className="rounded-full bg-price-rise/10 p-1 text-price-rise">
              <IconTrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa truncate" title={highestRetailMarket?.market_name || '—'}>
              {highestRetailMarket?.market_name || 'Loading...'}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5 font-mono">
              <span className="text-lg font-bold text-cocoa">
                ₹{highestRetailMarket?.basket_cost ? highestRetailMarket.basket_cost.toFixed(2) : '—'}
              </span>
              <span className="text-[11px] text-price-rise font-bold">
                {highestRetailMarket?.diff_from_cheapest_pct ? `+${highestRetailMarket.diff_from_cheapest_pct}%` : ''}
              </span>
            </div>
            <div className="text-[11px] text-shelf-muted capitalize mt-0.5">
              {highestRetailMarket ? `${highestRetailMarket.district} • ${highestRetailMarket.market_type}` : '—'}
            </div>
          </div>
        </div>

        {/* Wholesale-to-Retail Spread Gap */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Wholesale vs Retail Gap
            </span>
            <div className="rounded-full bg-cocoa/10 p-1 text-cocoa">
              <IconScale size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-cocoa">+{wholesaleRetailSpreadPct}%</span>
              <span className="text-xs text-shelf-muted font-sans">retail premium</span>
            </div>
            <p className="mt-1 text-[11px] text-shelf-muted font-sans leading-tight">
              Average surcharge incurred between wholesale terminals and neighborhood retail stores.
            </p>
          </div>
        </div>

        {/* Top Volatile Commodity */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Top Price Dispersion Good
            </span>
            <div className="rounded-full bg-price-rise/10 p-1 text-price-rise">
              <IconArrowsExchange size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa truncate" title={topDispersedItem?.item_name || '—'}>
              {topDispersedItem?.item_name || 'Loading...'}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5 font-mono">
              <span className="text-lg font-bold text-price-rise">
                +{topDispersedItem?.spread_pct ? topDispersedItem.spread_pct.toFixed(1) : '—'}%
              </span>
              <span className="text-xs text-shelf-muted">gap across markets</span>
            </div>
            <div className="text-[11px] text-shelf-muted mt-0.5 font-mono">
              Spread: ₹{topDispersedItem?.spread_abs ? topDispersedItem.spread_abs.toFixed(2) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Period Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-hairline bg-shelf-paper p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <IconFilter size={16} className="text-cocoa" />
          <span className="font-serif text-xs font-bold text-cocoa">District:</span>
          <div className="flex flex-wrap gap-1.5">
            {districts.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDistrict(d)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                  selectedDistrict === d
                    ? 'bg-cocoa text-shelf-paper shadow-xs font-bold'
                    : 'bg-shelf-base text-shelf-muted hover:text-cocoa hover:bg-hairline/60'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector Dropdown */}
        <div className="flex items-center gap-2">
          <IconCalendar size={15} className="text-cocoa" />
          <span className="font-serif text-xs font-bold text-cocoa">Active Period:</span>
          <select
            value={selectedPeriod || data?.period || ''}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border border-hairline bg-white px-2.5 py-1 font-mono text-xs font-bold text-cocoa shadow-xs focus:outline-none focus:border-cocoa cursor-pointer"
          >
            {(data?.available_periods && data.available_periods.length > 0
              ? [...data.available_periods].reverse()
              : [data?.period || '2024-W52']
            ).map((p: string) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load market comparison"
          message="Could not retrieve regional price data. Check backend connectivity."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* Top Row: Cheapest Ranking & Summary Bento */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Cheapest Basket Ranking */}
            <div className="lg:col-span-2 rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between border-b border-hairline/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-price-fall/10 p-2 text-price-fall">
                    <IconTrophy size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-cocoa">Cheapest Basket Ranking</h3>
                    <p className="text-xs text-shelf-muted font-sans">
                      Cost of standard essential goods basket by market center
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-cocoa bg-shelf-base px-2.5 py-1 rounded-lg border border-hairline">
                  Period {data?.period}
                </span>
              </div>

              <div className="space-y-2.5">
                {data?.cheapest_ranking?.length === 0 ? (
                  <div className="py-8 text-center text-xs font-sans text-shelf-muted">
                    No market price data reported for {data?.period}.
                  </div>
                ) : (
                  data?.cheapest_ranking?.map((market: any, idx: number) => {
                    const isFirst = idx === 0;
                    const isSecond = idx === 1;
                    const isThird = idx === 2;

                    return (
                      <div
                        key={market.market_id}
                        className={`flex items-center justify-between rounded-xl border p-3.5 transition ${
                          isFirst
                            ? 'border-price-fall/50 bg-price-fall/5 shadow-xs'
                            : 'border-hairline bg-shelf-paper/40 hover:bg-shelf-base/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold shadow-2xs ${
                              isFirst
                                ? 'bg-price-fall text-white'
                                : isSecond
                                ? 'bg-amber-600 text-white'
                                : isThird
                                ? 'bg-amber-700/80 text-white'
                                : 'bg-shelf-base text-shelf-muted border border-hairline'
                            }`}
                          >
                            #{market.rank}
                          </span>
                          <div>
                            <div className="font-serif text-sm font-bold text-cocoa flex items-center gap-2">
                              <span>{market.market_name}</span>
                              <span
                                className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                                  market.market_type === 'wholesale'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {market.market_type}
                              </span>
                            </div>
                            <div className="text-[11px] text-shelf-muted font-sans mt-0.5">
                              {market.district} • {market.items_reported}/{market.total_items} basket items reported
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-base font-bold text-cocoa">₹{market.basket_cost.toFixed(2)}</div>
                          <div className="text-[11px]">
                            {isFirst ? (
                              <span className="font-bold text-price-fall">★ Lowest Basket</span>
                            ) : (
                              <span className="text-price-rise font-medium">+{market.diff_from_cheapest_pct}% vs #1</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Regional Takeaway Bento */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5 mb-3 border-b border-hairline/80 pb-3">
                  <div className="rounded-xl bg-cocoa/10 p-2 text-cocoa">
                    <IconBuildingStore size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-cocoa">Regional Spread Insight</h3>
                    <p className="text-xs text-shelf-muted font-sans">Wholesale vs Retail dynamics</p>
                  </div>
                </div>

                <div className="mt-4 space-y-4 font-sans text-xs text-shelf-muted leading-relaxed">
                  <p>
                    Wholesale terminal markets (e.g. Koyambedu, Madurai Mandi) consistently exhibit a{' '}
                    <strong className="text-cocoa font-bold">15% to 28%</strong> price advantage on perishable
                    commodities (Tomatoes, Onions) compared to localized suburban retail stores.
                  </p>
                  <p>
                    Packaged essentials (Sugar, Edible Oils, Milk) maintain a tight price corridor across all districts due
                    to maximum retail pricing (MRP) enforcement.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-hairline bg-shelf-base p-3.5 text-[11px] text-shelf-muted flex items-start gap-2.5">
                <IconInfoCircle size={18} className="text-cocoa shrink-0 mt-0.5" />
                <span className="font-sans leading-tight">
                  All baskets standardized to canonical unit multipliers. Weights applied from active basket version
                  (idx-v1).
                </span>
              </div>
            </div>
          </div>

          {/* Dumbbell Chart Section */}
          <div className="rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-hairline/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-cocoa/10 p-2 text-cocoa">
                  <IconArrowsExchange size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-cocoa">Price Dispersion Dumbbell Chart</h3>
                  <p className="text-xs text-shelf-muted font-sans">
                    Spread between cheapest (green point) and highest (red point) reported market price for each good
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-price-fall" />
                  <span className="text-[11px] text-shelf-muted">Lowest Market Price</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-price-rise" />
                  <span className="text-[11px] text-shelf-muted">Highest Market Price</span>
                </div>
              </div>
            </div>

            <DumbbellChart data={data?.item_gaps || []} />
          </div>

          {/* Small Multiples Regional Trajectories */}
          <div className="rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
            <div className="mb-5 flex items-center justify-between border-b border-hairline/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-cocoa/10 p-2 text-cocoa">
                  <IconChartDots size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-cocoa">Regional Market Small Multiples</h3>
                  <p className="text-xs text-shelf-muted font-sans">
                    Basket cost trajectory over consecutive periods for each market hub
                  </p>
                </div>
              </div>
            </div>

            <SmallMultiples markets={data?.small_multiples || []} />
          </div>
        </>
      )}
    </div>
  );
};