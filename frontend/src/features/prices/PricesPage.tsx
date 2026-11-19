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
  const [activeTab, setActiveTab] = useState<'quick' | 'grid' | 'upload' | 'records'>('upload');
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
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="font-serif text-3xl text-cocoa font-bold">Price Observations</h1>
          <p className="text-xs text-shelf-muted font-sans mt-0.5">
            Collect, validate, and inspect market prices across essential retail goods.
          </p>
        </div>

        {/* Top Segmented Tabs with prominent Upload Wizard */}
        <div className="flex items-center gap-1.5 bg-shelf-paper p-1.5 rounded-xl border border-hairline shadow-xs overflow-x-auto">
          {[
            { id: 'upload', label: 'Upload Wizard (CSV / Excel)', icon: IconUpload },
            { id: 'grid', label: 'Weekly Grid', icon: IconFileSpreadsheet },
            { id: 'quick', label: 'Quick Form', icon: IconReceipt2 },
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
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-serif font-bold transition-all shrink-0',
                  isActive
                    ? 'bg-cocoa text-white shadow-xs'
                    : 'text-shelf-muted hover:text-cocoa hover:bg-shelf-base'
                )}
              >
                <Icon size={15} />
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
