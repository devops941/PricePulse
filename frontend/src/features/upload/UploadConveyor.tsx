import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { cn, formatNumberIN } from '@/lib/utils';
import {
  IconDownload,
  IconUpload,
  IconCheck,
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconArrowRight,
  IconArrowLeft,
  IconFileAlert,
  IconSparkles,
  IconDatabaseImport,
  IconScale,
  IconBuildingStore,
  IconTrendingUp,
  IconShieldCheck,
  IconTable,
  IconEye,
  IconRefresh,
  IconFileTypeCsv,
  IconChartBar,
} from '@tabler/icons-react';

const STEPS = [
  { id: 'file', num: '1', title: 'Upload File', desc: 'Select or drop sheet' },
  { id: 'map', num: '2', title: 'Map Columns', desc: 'Verify field schema' },
  { id: 'preview', num: '3', title: 'Preview Rows', desc: 'Inspect parsed entries' },
  { id: 'confirm', num: '4', title: 'Confirm & Policy', desc: 'Review ingestion rules' },
  { id: 'result', num: '5', title: 'Ingest Summary', desc: 'Validation report' },
];

const PREMADE_SAMPLES = [
  {
    id: 'chennai_retail',
    filename: '1_chennai_weekly_retail.csv',
    title: 'Chennai Weekly Retail',
    badge: '15 Essentials · 100% Clean',
    tagColor: 'bg-fall/10 text-fall border-fall/20',
    desc: 'Anna Nagar & T. Nagar quotes for all core 15 essentials (Tomato, Onion, Rice, Atta, Dal, Oil, Milk, Sugar, Curd, Garlic).',
    icon: IconBuildingStore,
    accentBorder: 'border-cocoa/30 hover:border-cocoa hover:shadow-md bg-white',
    metrics: '15 Quotes · Retail Baseline',
    content: `market,item,date,price,unit,source,notes
Anna Nagar Retail Supermarket,Tomato Local,2026-10-20,32.00,kg,collector_app,Fresh harvest stock
Anna Nagar Retail Supermarket,Onion Sambhar,2026-10-20,38.00,kg,collector_app,Grade A bellary onion
Anna Nagar Retail Supermarket,Potato Jyoti,2026-10-20,28.00,kg,collector_app,Standard retail
Anna Nagar Retail Supermarket,Rice (Sona Masoori),2026-10-20,54.00,kg,collector_app,Branded pack
Anna Nagar Retail Supermarket,Atta (Whole Wheat),2026-10-20,42.00,kg,collector_app,Chakki fresh
Anna Nagar Retail Supermarket,Tur Dal (Arhar),2026-10-20,152.00,kg,collector_app,Unpolished dal
Anna Nagar Retail Supermarket,Sunflower Oil,2026-10-20,140.00,L,collector_app,Refined pouch
Anna Nagar Retail Supermarket,Milk (Pasteurized Toned),2026-10-20,56.00,L,collector_app,Aavin blue packet
T. Nagar Local Bazaar,Tomato Local,2026-10-20,30.00,kg,manual_quote,Evening bazaar quote
T. Nagar Local Bazaar,Onion Sambhar,2026-10-20,36.00,kg,manual_quote,Small onion basket
T. Nagar Local Bazaar,Green Chilli,2026-10-20,65.00,kg,manual_quote,Fresh local green chilli
T. Nagar Local Bazaar,Moong Dal,2026-10-20,125.00,kg,manual_quote,Retail grocery quote
T. Nagar Local Bazaar,Sugar (Refined),2026-10-20,44.00,kg,manual_quote,Standard crystal sugar
T. Nagar Local Bazaar,Garlic,2026-10-20,195.00,kg,manual_quote,Local garlic quote
T. Nagar Local Bazaar,Curd (Dahi),2026-10-20,64.00,kg,manual_quote,Fresh packaged curd`
  },
  {
    id: 'mandi_shock',
    filename: '2_wholesale_mandi_shock.csv',
    title: 'Wholesale Mandi Shock',
    badge: '10 Quotes · Outlier Alert',
    tagColor: 'bg-amber-50 text-warn border-amber-200',
    desc: 'Koyambedu & Madurai wholesale mandis with Onion jump (₹110/kg) & Mustard Oil rally for price shock testing.',
    icon: IconTrendingUp,
    accentBorder: 'border-warn/40 hover:border-warn hover:shadow-md bg-white',
    metrics: '10 Quotes · Triggers Review Desk',
    content: `market,item,date,price,unit,source,notes
Koyambedu Wholesale Mandi,Tomato Local,2026-10-22,24.00,kg,mandi_board,Wholesale crate arrival
Koyambedu Wholesale Mandi,Onion Sambhar,2026-10-22,110.00,kg,mandi_board,Heavy supply shortage post-monsoon shock
Koyambedu Wholesale Mandi,Potato Jyoti,2026-10-22,20.00,kg,mandi_board,North India bulk truckload
Koyambedu Wholesale Mandi,Green Chilli,2026-10-22,50.00,kg,mandi_board,Gunny bag wholesale auction
Koyambedu Wholesale Mandi,Mustard Oil,2026-10-22,210.00,L,mandi_board,Pre-festival edible oil rally
Madurai Central Terminal Mandi,Tomato Local,2026-10-22,22.00,kg,mandi_board,Dindigul district arrival
Madurai Central Terminal Mandi,Onion Sambhar,2026-10-22,105.00,kg,mandi_board,Shallot shock in South Mandis
Madurai Central Terminal Mandi,Rice (Sona Masoori),2026-10-22,48.00,kg,mandi_board,Mill gate wholesale price
Madurai Central Terminal Mandi,Sunflower Oil,2026-10-22,130.00,L,mandi_board,Bulk tin price converted
Madurai Central Terminal Mandi,Dry Ginger,2026-10-22,195.00,kg,mandi_board,Southern mandi dry ginger quote`
  },
  {
    id: 'unit_conversion',
    filename: '3_multi_district_unit_conversion.csv',
    title: 'Unit Auto-Conversion',
    badge: '10 Quotes · 500g & 250ml',
    tagColor: 'bg-cocoa-wash text-cocoa border-cocoa/20',
    desc: 'Mattuthavani & Coimbatore bazaar with street units (500 g, 250 g, 500 ml) normalized automatically to ₹/kg and ₹/L.',
    icon: IconScale,
    accentBorder: 'border-cocoa/30 hover:border-cocoa hover:shadow-md bg-white',
    metrics: '10 Quotes · Street Units to Standard',
    content: `market,item,date,price,unit,source,notes
Mattuthavani Vegetable Market,Tomato Local,2026-10-24,15.00,500 g,spot_survey,500g half kilo bundle quote
Mattuthavani Vegetable Market,Onion Sambhar,2026-10-24,20.00,500 g,spot_survey,500g retail basket
Mattuthavani Vegetable Market,Green Chilli,2026-10-24,18.00,250 g,spot_survey,250g small household pouch
Mattuthavani Vegetable Market,Tur Dal (Arhar),2026-10-24,76.00,500 g,spot_survey,500g unpolished bag
Mattuthavani Vegetable Market,Milk (Pasteurized Toned),2026-10-24,28.00,500 ml,spot_survey,Half liter retail pouch
Coimbatore Saibaba Colony Bazaar,Tomato Local,2026-10-24,16.50,500 g,field_survey,500g packet quote
Coimbatore Saibaba Colony Bazaar,Potato Jyoti,2026-10-24,14.00,500 g,field_survey,500g washed potato pack
Coimbatore Saibaba Colony Bazaar,Atta (Whole Wheat),2026-10-24,22.00,500 g,field_survey,500g pouch
Coimbatore Saibaba Colony Bazaar,Sunflower Oil,2026-10-24,72.00,500 ml,field_survey,500ml mini bottle
Coimbatore Saibaba Colony Bazaar,Sugar (Refined),2026-10-24,23.00,500 g,field_survey,500g pack`
  }
];

export const UploadConveyor: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [samplePreviewModal, setSamplePreviewModal] = useState<typeof PREMADE_SAMPLES[0] | null>(null);

  // Preview data
  const [previewData, setPreviewData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    market: 'market',
    item: 'item',
    date: 'date',
    price: 'price',
    unit: 'unit',
    notes: 'notes',
  });
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'replace' | 'reject'>('skip');

  // Result data
  const [resultData, setResultData] = useState<any>(null);

  const downloadFile = (endpoint: string, filename: string) => {
    const url = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}${endpoint}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadFileObject = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await apiFetch<any>('/uploads/preview', {
        method: 'POST',
        body: formData,
      });

      setPreviewData(res);
      if (res.suggested_mapping) {
        setColumnMapping((prev) => ({ ...prev, ...res.suggested_mapping }));
      }

      if (res.already_confirmed) {
        toast.info('File with this identical checksum was already confirmed.');
      } else {
        toast.success(`Successfully parsed ${res.total_rows} rows from ${selectedFile.name}`);
      }
      setCurrentStep(1); // advance to Map Columns step
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse uploaded file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await uploadFileObject(selectedFile);
  };

  const handleLoadSample = async (sample: typeof PREMADE_SAMPLES[0]) => {
    const blob = new Blob([sample.content], { type: 'text/csv' });
    const sampleFile = new File([blob], sample.filename, { type: 'text/csv' });
    toast.info(`Loading sample: ${sample.title}...`);
    await uploadFileObject(sampleFile);
  };

  const handleConfirmBatch = async () => {
    if (!previewData?.batch_id) return;
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/uploads/${previewData.batch_id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          mapping: columnMapping,
          duplicate_policy: duplicatePolicy,
        }),
      });

      setResultData(res);
      toast.success(`Batch processed: ${res.saved_count} saved, ${res.flagged_count} flagged.`);

      // Immediately invalidate all query caches across all dashboard modules
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-movers'] });
      queryClient.invalidateQueries({ queryKey: ['index-series'] });
      queryClient.invalidateQueries({ queryKey: ['pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['markets-compare'] });
      queryClient.invalidateQueries({ queryKey: ['prices'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });

      setCurrentStep(4); // Result step
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-hairline bg-shelf-paper shadow-sm">
      {/* Conveyor Header */}
      <div className="border-b border-hairline bg-white/70 px-6 py-5 backdrop-blur-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cocoa text-white shadow-xs">
              <IconFileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-cocoa">
                CSV & Excel Ingestion Conveyor
              </h2>
              <p className="font-sans text-xs text-shelf-muted mt-0.5">
                Idempotent batch upload pipeline with schema mapping, unit normalization, and outlier detection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-shelf-base px-3 py-1 font-mono text-[11px] font-bold text-cocoa">
              <IconShieldCheck size={14} className="text-fall stroke-[2.5]" />
              <span>SHA-256 Deduplication</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-shelf-base px-3 py-1 font-mono text-[11px] font-bold text-shelf-muted">
              <span>Catalog: 15 Commodities</span>
            </span>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="border-b border-hairline bg-shelf-base/60 px-6 py-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  disabled={!isDone && !isCurrent}
                  onClick={() => {
                    if (isDone) setCurrentStep(idx);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-left transition shrink-0',
                    isCurrent && 'bg-cocoa text-white shadow-xs',
                    isDone && 'bg-white border border-hairline text-cocoa hover:bg-shelf cursor-pointer',
                    !isDone && !isCurrent && 'text-shelf-muted opacity-50 cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono font-bold',
                      isCurrent && 'bg-white text-cocoa',
                      isDone && 'bg-fall/15 text-fall',
                      !isDone && !isCurrent && 'bg-shelf-muted/20 text-shelf-muted'
                    )}
                  >
                    {isDone ? <IconCheck size={12} className="stroke-[3]" /> : step.num}
                  </span>
                  <div className="leading-tight">
                    <span className="block font-serif text-xs font-bold">{step.title}</span>
                    <span className={cn('block font-sans text-[10px]', isCurrent ? 'text-white/80' : 'text-shelf-muted')}>
                      {step.desc}
                    </span>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="h-0.5 w-6 shrink-0 bg-hairline rounded-full hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* STEP 0: FILE SELECTION & DROPZONE + 1-CLICK SAMPLES */}
        {currentStep === 0 && (
          <div className="space-y-8">
            {/* Center Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) uploadFileObject(droppedFile);
              }}
              className={cn(
                'relative overflow-hidden rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer shadow-xs',
                isDragging
                  ? 'border-cocoa bg-cocoa-wash/50 ring-4 ring-cocoa/15 scale-[1.005]'
                  : 'border-cocoa/30 bg-white/70 hover:border-cocoa hover:bg-white hover:shadow-md'
              )}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                disabled={loading}
                onChange={handleFileInput}
                className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center justify-center space-y-3.5 pointer-events-none">
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-200 shadow-xs',
                    isDragging
                      ? 'bg-cocoa text-white scale-110'
                      : 'bg-cocoa/10 text-cocoa'
                  )}
                >
                  <IconUpload size={32} className="stroke-[1.8]" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-bold text-cocoa">
                    {file ? file.name : 'Drop your price spreadsheet here'}
                  </h3>
                  <p className="font-sans text-xs text-shelf-muted max-w-md mx-auto leading-relaxed">
                    Drag and drop your weekly market quotes file, or click anywhere inside this box to browse from your device.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-shelf-muted">
                  <span className="rounded bg-shelf-base border border-hairline px-2 py-0.5 font-bold text-cocoa">.CSV</span>
                  <span className="rounded bg-shelf-base border border-hairline px-2 py-0.5 font-bold text-cocoa">.XLSX</span>
                  <span className="rounded bg-shelf-base border border-hairline px-2 py-0.5 font-bold text-cocoa">.XLS</span>
                  <span className="text-hairline font-bold">·</span>
                  <span>Max 10 MB per batch</span>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-cocoa px-6 py-2.5 font-serif text-xs font-bold text-white shadow-sm pointer-events-auto hover:bg-cocoa/90 transition">
                    <IconFileTypeCsv size={16} />
                    <span>{loading ? 'Uploading & Parsing...' : 'Browse Local Files'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Template Download Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs bg-shelf-base/80 p-3 rounded-xl border border-hairline">
              <span className="font-serif text-cocoa font-bold flex items-center gap-1.5">
                <IconTable size={15} />
                <span>Need a formatted file?</span>
              </span>
              <button
                type="button"
                onClick={() => downloadFile('/uploads/template', 'pricepulse_template.csv')}
                className="flex items-center gap-1.5 font-serif font-bold text-cocoa hover:underline bg-white px-3 py-1 rounded-lg border border-hairline shadow-xs"
              >
                <IconDownload size={14} />
                <span>Download Blank CSV Template</span>
              </button>
              <button
                type="button"
                onClick={() => downloadFile('/uploads/sample', 'pricepulse_sample_data.csv')}
                className="flex items-center gap-1.5 font-sans font-medium text-shelf-muted hover:text-cocoa bg-white px-3 py-1 rounded-lg border border-hairline shadow-xs"
              >
                <IconFileSpreadsheet size={14} />
                <span>Download Sample Sheet</span>
              </button>
            </div>

            {/* ⚡ Instant Demo Datasets (1-Click Load) */}
            <div className="border-t border-hairline/80 pt-6">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-serif text-base font-bold text-cocoa flex items-center gap-2">
                    <IconSparkles size={18} className="text-cocoa" />
                    <span>⚡ Instant Demo Datasets — 1-Click Ingestion</span>
                  </h4>
                  <p className="font-sans text-xs text-shelf-muted mt-0.5">
                    Click any verified dataset card below to parse and preview immediately without searching your local disk.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PREMADE_SAMPLES.map((sample) => {
                  const Icon = sample.icon;
                  return (
                    <div
                      key={sample.id}
                      className={cn(
                        'flex flex-col justify-between rounded-2xl border-2 p-5 transition shadow-xs',
                        sample.accentBorder
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cocoa/10 text-cocoa">
                            <Icon size={20} />
                          </span>
                          <span className={cn('rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold', sample.tagColor)}>
                            {sample.badge}
                          </span>
                        </div>

                        <div>
                          <h5 className="font-serif text-base font-bold text-cocoa">{sample.title}</h5>
                          <p className="font-mono text-[11px] text-shelf-muted font-semibold mt-0.5">{sample.filename}</p>
                          <p className="font-sans text-xs text-shelf-muted mt-2 leading-relaxed">
                            {sample.desc}
                          </p>
                        </div>

                        <div className="pt-1">
                          <span className="inline-block rounded-md bg-shelf-base px-2 py-1 font-mono text-[10px] text-cocoa font-bold">
                            {sample.metrics}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleLoadSample(sample)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cocoa py-2.5 font-serif text-xs font-bold text-white transition hover:bg-cocoa/90 disabled:opacity-50 shadow-xs"
                        >
                          <IconDatabaseImport size={15} />
                          <span>1-Click Load & Ingest</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSamplePreviewModal(sample)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-hairline bg-shelf-base/60 py-1.5 font-sans text-[11px] font-semibold text-shelf-muted hover:text-cocoa hover:bg-white transition"
                        >
                          <IconEye size={13} />
                          <span>Peek Data Snippet</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: MAP COLUMNS */}
        {currentStep === 1 && previewData && (
          <div className="space-y-6 max-w-3xl mx-auto py-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline/80 pb-4">
              <div>
                <h4 className="font-serif text-lg font-bold text-cocoa">Step 2: Map File Columns</h4>
                <p className="text-xs text-shelf-muted font-sans mt-0.5">
                  Confirm how headers in <code className="font-mono font-bold text-cocoa">{previewData.filename}</code> correspond to required observation attributes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-shelf-base border border-hairline px-3 py-1 font-mono text-[11px] font-bold text-cocoa">
                  {previewData.total_rows} rows parsed
                </span>
                <span className="rounded-full bg-shelf-base border border-hairline px-3 py-1 font-mono text-[11px] font-bold text-shelf-muted">
                  SHA-256: {previewData.checksum?.slice(0, 10)}...
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-xs">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-shelf border-b border-hairline text-shelf-muted uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Standard Field</th>
                    <th className="py-3 px-4">Requirement</th>
                    <th className="py-3 px-4">Mapped Column in Spreadsheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {[
                    { field: 'market', label: 'Market Center', desc: 'e.g. Anna Nagar Retail, Koyambedu', req: true },
                    { field: 'item', label: 'Basket Commodity', desc: 'e.g. Tomato Local, Onion Sambhar', req: true },
                    { field: 'date', label: 'Observation Date', desc: 'ISO format: YYYY-MM-DD', req: true },
                    { field: 'price', label: 'Price Value', desc: 'Numeric retail or mandi price', req: true },
                    { field: 'unit', label: 'Unit of Measure', desc: 'kg, L, 500 g, 250 g, 500 ml', req: true },
                    { field: 'notes', label: 'Enumerator Notes', desc: 'Survey notes or grade remarks', req: false },
                  ].map((row) => (
                    <tr key={row.field} className="hover:bg-shelf/40">
                      <td className="py-3.5 px-4">
                        <div className="font-serif font-bold text-cocoa">{row.label}</div>
                        <div className="font-mono text-[10px] text-shelf-muted">{row.desc}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px]">
                        {row.req ? (
                          <span className="rounded bg-rose-50 px-2 py-0.5 font-bold text-rise border border-rose-200">
                            REQUIRED
                          </span>
                        ) : (
                          <span className="rounded bg-shelf-base px-2 py-0.5 font-bold text-shelf-muted">
                            OPTIONAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={columnMapping[row.field] || ''}
                            onChange={(e) =>
                              setColumnMapping({ ...columnMapping, [row.field]: e.target.value })
                            }
                            className="w-full max-w-xs rounded-xl border border-hairline bg-shelf-base px-3 py-2 font-mono text-xs text-cocoa focus:border-cocoa focus:bg-white focus:outline-none transition shadow-xs"
                          >
                            <option value="">-- Choose Column --</option>
                            {previewData.headers?.map((h: string) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                          {columnMapping[row.field] && (
                            <span className="text-fall text-[11px] font-bold font-mono">✓</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-4 py-2.5 font-serif text-xs font-bold text-cocoa hover:bg-shelf transition"
              >
                <IconArrowLeft size={15} />
                <span>Choose Different File</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 rounded-xl bg-cocoa px-6 py-2.5 font-serif text-xs font-bold text-white shadow-sm hover:bg-cocoa/90 transition"
              >
                <span>Continue to Preview Rows</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW ROWS */}
        {currentStep === 2 && previewData && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline/80 pb-4">
              <div>
                <h4 className="font-serif text-lg font-bold text-cocoa">Step 3: Preview Data Rows</h4>
                <p className="text-xs text-shelf-muted font-sans mt-0.5">
                  Showing first 15 records from <code className="font-mono font-bold text-cocoa">{previewData.filename}</code> ({previewData.total_rows} total rows).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3.5 py-2 font-serif text-xs font-bold text-cocoa hover:bg-shelf transition shadow-xs"
                >
                  <IconArrowLeft size={14} />
                  <span>Adjust Mapping</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-1.5 rounded-xl bg-cocoa px-5 py-2 font-serif text-xs font-bold text-white shadow-sm hover:bg-cocoa/90 transition"
                >
                  <span>Proceed to Confirm</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Table Preview */}
            <div className="overflow-x-auto rounded-xl border border-hairline bg-white shadow-xs max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-shelf border-b border-hairline text-shelf-muted uppercase text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 font-mono">#</th>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Commodity Item</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {previewData.preview_rows?.slice(0, 15).map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-shelf/40">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-shelf-muted">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-serif font-bold text-cocoa">{r[columnMapping.market] || '—'}</td>
                      <td className="py-2.5 px-4 font-medium text-ink">{r[columnMapping.item] || '—'}</td>
                      <td className="py-2.5 px-4 font-mono text-shelf-muted">{r[columnMapping.date] || '—'}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-cocoa">
                        ₹{r[columnMapping.price] ? formatNumberIN(Number(r[columnMapping.price])) : '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-shelf-muted">
                        <span className="rounded bg-shelf-base px-1.5 py-0.5 border border-hairline">
                          {r[columnMapping.unit] || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-shelf-muted truncate max-w-xs">{r[columnMapping.notes] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-4 py-2.5 font-serif text-xs font-bold text-cocoa hover:bg-shelf transition"
              >
                <IconArrowLeft size={15} />
                <span>Back to Mapping</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 rounded-xl bg-cocoa px-6 py-2.5 font-serif text-xs font-bold text-white shadow-sm hover:bg-cocoa/90 transition"
              >
                <span>Proceed to Confirmation</span>
                <IconArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRMATION & DUPLICATE POLICY */}
        {currentStep === 3 && previewData && (
          <div className="space-y-6 max-w-xl mx-auto py-4">
            <div className="text-center space-y-1">
              <h4 className="font-serif text-2xl font-bold text-cocoa">Step 4: Confirm Data Ingestion</h4>
              <p className="text-xs text-shelf-muted font-sans">
                Review your policy settings before committing <span className="font-mono font-bold text-cocoa">{previewData.total_rows} observations</span> to the database.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-hairline bg-white p-6 space-y-5 shadow-xs">
              <div>
                <label className="block font-serif text-xs font-bold text-cocoa mb-2">
                  Duplicate Observation Policy
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'skip', label: 'Skip Existing', desc: 'Keep original price if identical key exists' },
                    { id: 'replace', label: 'Overwrite', desc: 'Replace old quote with this new quote' },
                    { id: 'reject', label: 'Reject Batch', desc: 'Abort entire batch on any conflict' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDuplicatePolicy(p.id as any)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3.5 rounded-xl border-2 text-center transition',
                        duplicatePolicy === p.id
                          ? 'border-cocoa bg-cocoa-wash/40 shadow-xs font-bold text-cocoa'
                          : 'border-hairline bg-shelf-base/40 text-shelf-muted hover:bg-white'
                      )}
                    >
                      <span className="font-serif text-xs font-bold">{p.label}</span>
                      <span className="font-sans text-[10px] mt-1 leading-tight opacity-75">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-shelf-base p-4 border border-hairline font-mono text-xs text-shelf-muted space-y-2">
                <div className="flex justify-between items-center">
                  <span>Target Ingestion Rows:</span>
                  <span className="font-bold text-cocoa text-sm">{previewData.total_rows} records</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>File Checksum:</span>
                  <span className="font-bold text-cocoa">{previewData.checksum?.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Target Pipeline:</span>
                  <span className="font-bold text-fall">idx-v1 (Laspeyres Engine)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-4 py-2.5 font-serif text-xs font-bold text-cocoa hover:bg-shelf transition"
              >
                <IconArrowLeft size={15} />
                <span>Back to Preview</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmBatch}
                className="flex items-center gap-2 rounded-xl bg-cocoa px-6 py-2.5 font-serif text-xs font-bold text-white shadow-sm hover:bg-cocoa/90 transition disabled:opacity-50"
              >
                <span>{loading ? 'Ingesting Observations...' : 'Confirm & Ingest Observations'}</span>
                <IconCheck size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {currentStep === 4 && resultData && (
          <div className="space-y-6 max-w-lg mx-auto py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fall/15 text-fall mx-auto shadow-xs">
              <IconCheck size={32} className="stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h4 className="font-serif text-2xl font-bold text-cocoa">Ingestion Completed!</h4>
              <p className="text-xs text-shelf-muted font-sans max-w-md mx-auto">
                Observations have been ingested into the PricePulse database and validated against catalog boundaries.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border-2 border-hairline bg-white p-4 text-center shadow-xs">
                <div className="font-mono text-2xl font-bold text-fall">{resultData.saved_count}</div>
                <div className="font-serif text-xs font-bold text-cocoa mt-0.5">Saved & Approved</div>
              </div>
              <div className="rounded-2xl border-2 border-hairline bg-white p-4 text-center shadow-xs">
                <div className="font-mono text-2xl font-bold text-warn">{resultData.flagged_count}</div>
                <div className="font-serif text-xs font-bold text-cocoa mt-0.5">Flagged Outliers</div>
              </div>
              <div className="rounded-2xl border-2 border-hairline bg-white p-4 text-center shadow-xs">
                <div className="font-mono text-2xl font-bold text-price-rise">{resultData.rejected_count}</div>
                <div className="font-serif text-xs font-bold text-cocoa mt-0.5">Rejected</div>
              </div>
            </div>

            {resultData.has_errors && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-left">
                <div className="flex items-center gap-2 text-rose-800 font-serif text-xs font-bold mb-1">
                  <IconFileAlert size={16} />
                  <span>Rejected Rows Detected ({resultData.rejected_count})</span>
                </div>
                <p className="text-xs text-rose-700 font-sans mb-3 leading-relaxed">
                  Some rows failed schema constraints or unknown commodity names. Download the error CSV to inspect and correct.
                </p>
                <button
                  type="button"
                  onClick={() => downloadFile(`/uploads/${resultData.batch_id}/errors.csv`, 'rejected_rows.csv')}
                  className="rounded-xl bg-rose-700 px-4 py-2 font-serif text-xs font-bold text-white shadow-xs hover:bg-rose-800 transition"
                >
                  Download Rejected Rows CSV
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewData(null);
                  setResultData(null);
                  setCurrentStep(0);
                }}
                className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-5 py-2.5 font-serif text-xs font-bold text-cocoa hover:bg-shelf transition shadow-xs w-full sm:w-auto justify-center"
              >
                <IconRefresh size={15} />
                <span>Upload Another Spreadsheet</span>
              </button>

              {resultData.flagged_count > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/review')}
                  className="flex items-center gap-2 rounded-xl border border-warn bg-amber-50 px-5 py-2.5 font-serif text-xs font-bold text-warn shadow-xs hover:bg-amber-100 transition w-full sm:w-auto justify-center"
                >
                  <IconAlertTriangle size={15} />
                  <span>Review {resultData.flagged_count} Flagged Outliers →</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 rounded-xl bg-cocoa px-6 py-2.5 font-serif text-xs font-bold text-white shadow-sm hover:bg-cocoa/90 transition w-full sm:w-auto justify-center"
              >
                <IconChartBar size={16} />
                <span>View on Index Dashboard →</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mini Snippet Modal */}
      {samplePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border-2 border-hairline bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h4 className="font-serif text-base font-bold text-cocoa">{samplePreviewModal.title}</h4>
                <p className="font-mono text-xs text-shelf-muted">{samplePreviewModal.filename}</p>
              </div>
              <button
                type="button"
                onClick={() => setSamplePreviewModal(null)}
                className="rounded-lg p-1 text-shelf-muted hover:bg-shelf-base hover:text-cocoa font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="my-4 overflow-x-auto rounded-xl border border-hairline bg-shelf-base p-3">
              <pre className="font-mono text-[11px] leading-relaxed text-cocoa whitespace-pre">
                {samplePreviewModal.content.split('\n').slice(0, 6).join('\n')}
                {'\n... (and more rows)'}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSamplePreviewModal(null)}
                className="rounded-xl border border-hairline bg-white px-4 py-2 font-serif text-xs font-bold text-shelf-muted hover:text-cocoa hover:bg-shelf"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = samplePreviewModal;
                  setSamplePreviewModal(null);
                  handleLoadSample(s);
                }}
                className="rounded-xl bg-cocoa px-5 py-2 font-serif text-xs font-bold text-white hover:bg-cocoa/90 shadow-xs"
              >
                Load This Sample File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
