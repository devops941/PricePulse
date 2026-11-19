import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { QuickPriceForm } from './QuickPriceForm';
import { WeeklyPriceGrid } from './WeeklyPriceGrid';
import { PriceRecordsTable } from './PriceRecordsTable';
import { UploadConveyor } from '../upload/UploadConveyor';
import { Skeleton } from '@/components/ui/FeedbackStates';
import {
  IconFileSpreadsheet,
  IconReceipt2,
  IconUpload,
  IconTable
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const PricesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quick' | 'grid' | 'upload' | 'records'>('grid');
  const [markets, setMarkets] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMasterData = async () => {
    try {
      const [mkts, itms, recs] = await Promise.all([
        apiFetch<any[]>('/markets?active_only=true').catch(() => []),
        apiFetch<any[]>('/items?active_only=true').catch(() => []),
        apiFetch<any[]>('/prices?limit=200').catch(() => []),
      ]);
      setMarkets(mkts);
      setItems(itms);
      setRecords(recs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Bar with Segmented Switch (§10.6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="font-serif text-3xl text-ink font-normal">Price Observations</h1>
          <p className="text-xs text-muted font-sans mt-0.5">
            Collect, validate, and inspect market prices across essential retail goods.
          </p>
        </div>

        {/* Top Segmented Switch (§10.6) */}
        <div className="flex items-center gap-1 bg-shelf p-1 rounded-lg border border-hairline overflow-x-auto">
          {[
            { id: 'quick', label: 'Quick Form', icon: IconReceipt2 },
            { id: 'grid', label: 'Weekly Grid', icon: IconFileSpreadsheet },
            { id: 'upload', label: 'Upload Wizard', icon: IconUpload },
            { id: 'records', label: 'Price Records', icon: IconTable },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-colors shrink-0',
                  isActive
                    ? 'bg-cocoa text-white font-medium shadow-shelf'
                    : 'text-muted hover:text-ink hover:bg-tile'
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          {activeTab === 'quick' && (
            <div className="flex justify-center pt-2">
              <QuickPriceForm
                markets={markets}
                items={items}
                onSuccess={() => {
                  fetchMasterData();
                  setActiveTab('records');
                }}
              />
            </div>
          )}

          {activeTab === 'grid' && (
            <WeeklyPriceGrid
              markets={markets}
              items={items}
              onBatchSaved={() => {
                fetchMasterData();
                setActiveTab('records');
              }}
            />
          )}

          {activeTab === 'upload' && (
            <UploadConveyor
              onComplete={() => {
                fetchMasterData();
              }}
            />
          )}

          {activeTab === 'records' && (
            <PriceRecordsTable
              records={records}
              markets={markets}
              items={items}
              onRefresh={fetchMasterData}
            />
          )}
        </>
      )}
    </div>
  );
};
