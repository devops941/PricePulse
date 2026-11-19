import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import { FanChart } from '../../components/charts/FanChart';
import { Skeleton, ErrorState } from '../../components/ui/FeedbackStates';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconCpu,
  IconAlertTriangle,
  IconAdjustments,
  IconChartArcs,
  IconFlame,
  IconShieldCheck,
  IconCalendar,
  IconScale,
  IconSparkles,
} from '@tabler/icons-react';

export const ForecastPage: React.FC = () => {
  const [targetType, setTargetType] = useState<'overall' | 'item'>('overall');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [horizon, setHorizon] = useState<number>(4);
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // Fetch active commodities for single item forecast
  const { data: itemsData } = useQuery({
    queryKey: ['items-active'],
    queryFn: () => apiFetch<any[]>('/items'),
  });

  // Fetch exploratory volatility clusters
  const { data: clustersData, isLoading: clustersLoading } = useQuery({
    queryKey: ['forecast-clusters'],
    queryFn: () => apiFetch<any[]>('/forecasts/clusters'),
  });

  // Mutation to execute econometric forecast
  const forecastMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        target_type: targetType,
        horizon,
        model: selectedModel,
      };
      if (targetType === 'item' && selectedItemId) {
        payload.target_id = selectedItemId;
      }
      return await apiFetch<any>('/forecasts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onError: (err: any) => {
      // Quietly handle empty data states
      if (err?.code !== 'INSUFFICIENT_INDEX_DATA' && err?.code !== 'INSUFFICIENT_ITEM_DATA') {
        toast.error('Failed to calculate projection.');
      }
    },
  });

  // Automatically trigger projection when parameters change
  useEffect(() => {
    forecastMutation.mutate();
  }, [targetType, selectedItemId, horizon, selectedModel]);

  const forecastData = forecastMutation.data;

  // Extract winning model details
  const winningModel = forecastData?.models_evaluated?.find(
    (m: any) => m.name === forecastData?.model_used
  ) || forecastData?.models_evaluated?.[0];

  return (
    <div className="space-y-6">
      {/* Shelf Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cocoa">Inflation & Price Forecast Engine</h1>
            <span className="rounded-full bg-shelf-base px-2.5 py-0.5 text-[11px] font-mono text-shelf-muted border border-hairline">
              Time-Series Projections
            </span>
          </div>
          <p className="mt-1 text-xs text-shelf-muted max-w-2xl font-sans">
            Short-horizon econometric projections (ETS, ARIMA, Naive) with rolling-origin cross-validation and 80%/95% confidence intervals.
          </p>
        </div>

        {/* Caveat Tag */}
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-shelf-base px-3.5 py-2 text-xs text-shelf-muted font-sans">
          <IconAlertTriangle size={16} className="text-cocoa shrink-0" />
          <span>Indicative baseline projection; not official statistics.</span>
        </div>
      </div>

      {/* Top Executive KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Baseline Level T0 */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Current Baseline (T₀)
            </span>
            <div className="rounded-full bg-cocoa/10 p-1 text-cocoa">
              <IconCalendar size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-cocoa">
                {forecastData?.baseline_value !== undefined ? forecastData.baseline_value.toFixed(2) : '—'}
              </span>
              <span className="text-xs text-shelf-muted font-sans">
                {targetType === 'overall' ? 'index pts' : forecastData?.unit ? `₹/${forecastData.unit}` : ''}
              </span>
            </div>
            <div className="text-[11px] text-shelf-muted font-mono mt-0.5">
              Anchor Period: <strong className="text-cocoa">{forecastData?.baseline_period || '2024-W52'}</strong>
            </div>
          </div>
        </div>

        {/* Next Period Forecast H+1 */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Next Period Projection (H+1)
            </span>
            <div className="rounded-full bg-price-rise/10 p-1 text-price-rise">
              <IconTrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-2xl font-bold text-price-rise">
                {forecastData?.next_period_forecast !== undefined ? forecastData.next_period_forecast.toFixed(2) : '—'}
              </span>
              <span
                className={`text-xs font-bold ${
                  (forecastData?.next_period_change_pct || 0) >= 0 ? 'text-price-rise' : 'text-price-fall'
                }`}
              >
                {(forecastData?.next_period_change_pct || 0) >= 0 ? '+' : ''}
                {forecastData?.next_period_change_pct !== undefined ? `${forecastData.next_period_change_pct}%` : ''}
              </span>
            </div>
            <div className="text-[11px] text-shelf-muted font-sans mt-0.5">
              Projected 1-week horizon estimate
            </div>
          </div>
        </div>

        {/* Horizon Corridor (95% CI) */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              H+{horizon} Confidence Corridor
            </span>
            <div className="rounded-full bg-cocoa/10 p-1 text-cocoa">
              <IconScale size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono text-base font-bold text-cocoa">
              {forecastData?.horizon_end_95_ci ? (
                <>
                  [{forecastData.horizon_end_95_ci[0]?.toFixed(1)} – {forecastData.horizon_end_95_ci[1]?.toFixed(1)}]
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="text-[11px] text-shelf-muted font-sans mt-0.5">
              95% statistical boundary at end of horizon
            </div>
          </div>
        </div>

        {/* Optimal Econometric Model */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Optimal Model (Lowest Error)
            </span>
            <div className="rounded-full bg-price-fall/10 p-1 text-price-fall">
              <IconCpu size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa truncate" title={forecastData?.model_used || 'ARIMA'}>
              {forecastData?.model_used || 'Evaluating'}
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
              <span className="text-price-fall font-bold">
                MAPE {winningModel?.mape !== undefined ? `${winningModel.mape}%` : '—'}
              </span>
              <span className="text-shelf-muted">| MAE {winningModel?.mae || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs sm:grid-cols-2 lg:grid-cols-4">
        {/* Target Switcher */}
        <div>
          <label className="mb-1.5 block font-serif text-xs font-bold text-cocoa">Forecast Target</label>
          <div className="flex rounded-xl border border-hairline bg-shelf-base p-1">
            <button
              type="button"
              onClick={() => setTargetType('overall')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-serif font-bold transition ${
                targetType === 'overall' ? 'bg-cocoa text-white shadow-xs' : 'text-shelf-muted hover:text-cocoa'
              }`}
            >
              Overall Index
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetType('item');
                if (!selectedItemId && itemsData && itemsData.length > 0) {
                  setSelectedItemId(itemsData[0].id);
                }
              }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-serif font-bold transition ${
                targetType === 'item' ? 'bg-cocoa text-white shadow-xs' : 'text-shelf-muted hover:text-cocoa'
              }`}
            >
              Single Item
            </button>
          </div>

          {targetType === 'item' && (
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-hairline bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-cocoa focus:border-cocoa focus:outline-none shadow-xs cursor-pointer"
            >
              {itemsData?.map((it: any) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.canonical_unit})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Horizon Slider */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-serif text-xs font-bold text-cocoa">Horizon Periods</label>
            <span className="font-mono text-xs font-bold text-cocoa bg-shelf-base px-2 py-0.5 rounded border border-hairline">
              {horizon} Periods ahead
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value))}
            className="w-full accent-cocoa cursor-pointer"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-shelf-muted">
            <span>H+1</span>
            <span>H+4</span>
            <span>H+8</span>
          </div>
        </div>

        {/* Econometric Algorithm Selector */}
        <div>
          <label className="mb-1.5 block font-serif text-xs font-bold text-cocoa">Econometric Algorithm</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-xl border border-hairline bg-white px-2.5 py-2 font-sans text-xs font-medium text-cocoa focus:border-cocoa focus:outline-none shadow-xs cursor-pointer"
          >
            <option value="auto">Auto Selection (Lowest MAPE)</option>
            <option value="arima">ARIMA(1,1,0)</option>
            <option value="ets">Holt-Winters / ETS</option>
            <option value="naive">Naive Trend Baseline</option>
          </select>
          <p className="mt-1 text-[11px] text-shelf-muted font-sans">
            Ranked via rolling-origin backtest on recent periods
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => forecastMutation.mutate()}
            disabled={forecastMutation.isPending}
            className="w-full rounded-xl bg-cocoa py-2 font-serif text-xs font-bold text-white transition hover:bg-cocoa/90 disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
          >
            <IconSparkles size={14} />
            <span>{forecastMutation.isPending ? 'Calculating...' : 'Run Projection'}</span>
          </button>
        </div>
      </div>

      {/* Main Forecast Fan Chart Card */}
      <div className="rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-hairline/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-base sm:text-lg font-bold text-cocoa">
                {forecastData?.target_name || 'Projection Trajectory'}
              </span>
              <span className="rounded-lg bg-cocoa/10 px-2.5 py-0.5 font-mono text-xs font-bold text-cocoa">
                Selected: {forecastData?.model_used || 'Evaluating'}
              </span>
            </div>
            <p className="text-xs text-shelf-muted font-sans mt-0.5">
              Actual history with projected trajectory and 80% (inner band) & 95% (outer band) confidence ribbons
            </p>
          </div>

          {/* Model Performance Comparison Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {forecastData?.models_evaluated?.map((m: any) => {
              const isWinner = m.name === forecastData?.model_used;
              return (
                <div
                  key={m.name}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ${
                    isWinner
                      ? 'border-cocoa bg-shelf-base font-bold shadow-2xs'
                      : 'border-hairline bg-white text-shelf-muted'
                  }`}
                >
                  <span className={isWinner ? 'text-cocoa font-bold' : 'text-shelf-muted'}>
                    {m.name}:
                  </span>
                  <span className="text-price-fall font-bold">MAPE {m.mape}%</span>
                  <span className="text-shelf-muted">| MAE {m.mae}</span>
                  {isWinner && (
                    <span className="ml-1 text-[10px] bg-price-fall text-white px-1 rounded font-mono font-bold">
                      BEST
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {forecastMutation.isPending ? (
          <Skeleton className="h-88 w-full rounded-xl" />
        ) : (!forecastData?.forecast_points || forecastData.forecast_points.length === 0 || forecastMutation.isError) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-hairline rounded-xl bg-shelf/30">
            <IconChartArcs size={32} className="text-cocoa/40 mb-2" />
            <h4 className="font-serif text-sm font-bold text-cocoa">No Historical Series Available for Projection</h4>
            <p className="mt-1 text-xs text-shelf-muted max-w-sm font-sans">
              Projections require at least 3 historical calculation periods. Enter price records or run the index engine to generate projections.
            </p>
          </div>
        ) : (
          <FanChart
            historicalData={forecastData?.historical_series || []}
            forecastData={forecastData?.forecast_points || []}
            metricLabel={targetType === 'overall' ? 'Index' : 'Price'}
            unit={targetType === 'overall' ? 'pts' : forecastData?.unit ? `₹/${forecastData.unit}` : '₹'}
          />
        )}
      </div>

      {/* Exploratory Volatility Clusters Section */}
      <div className="rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between border-b border-hairline/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-cocoa/10 p-2 text-cocoa">
              <IconChartArcs size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-cocoa">K-Means Basket Volatility Clusters</h3>
                <span className="rounded-full bg-shelf-base px-2.5 py-0.5 font-mono text-[10px] text-shelf-muted border border-hairline">
                  Exploratory
                </span>
              </div>
              <p className="text-xs text-shelf-muted font-sans mt-0.5">
                Unsupervised clustering grouping basket items by Coefficient of Variation (CV%) and trajectory across 52 weeks
              </p>
            </div>
          </div>
        </div>

        {clustersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (!clustersData || clustersData.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-hairline bg-shelf/30 text-center">
            <IconAlertTriangle size={24} className="text-cocoa/40 mb-2" />
            <span className="font-serif text-sm font-bold text-cocoa">Awaiting Time-Series Observations</span>
            <p className="mt-1 text-xs text-shelf-muted font-sans max-w-sm">
              K-Means volatility clusters require at least 3 historical reporting periods across commodities to compute standard deviation and Coefficient of Variation (CV%).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {clustersData?.map((cluster: any, idx: number) => {
              const isLow = idx === 0;
              const isMed = idx === 1;
              const isHigh = idx === 2;

              return (
                <div
                  key={cluster.cluster_id}
                  className={`rounded-xl border p-4 transition ${
                    isLow
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isMed
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-hairline/60 pb-2">
                    <div>
                      <span className="font-serif text-sm font-bold text-cocoa block">{cluster.label}</span>
                      <span className="text-[11px] text-shelf-muted font-mono">
                        Avg CV: {cluster.avg_cv ? `${cluster.avg_cv}%` : '—'}
                      </span>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-cocoa border border-hairline shadow-2xs">
                      {cluster.items?.length || 0} items
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    {cluster.items?.map((it: any) => (
                      <div
                        key={it.item_name}
                        className="flex items-center justify-between rounded-lg bg-white p-2 font-mono text-xs border border-hairline shadow-2xs"
                      >
                        <span className="font-medium text-cocoa font-sans">{it.item_name}</span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-shelf-muted">CV {it.volatility_cv}%</span>
                          <span
                            className={`font-bold ${
                              it.trend_pct > 0 ? 'text-price-rise' : 'text-price-fall'
                            }`}
                          >
                            {it.trend_pct > 0 ? `+${it.trend_pct}%` : `${it.trend_pct}%`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
