import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { StatusPill } from '@/components/ui/StatusPill';
import { cn, formatNumberIN } from '@/lib/utils';
import {
  IconDownload,
  IconUpload,
  IconCheck,
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconArrowRight,
  IconArrowLeft,
  IconFileAlert
} from '@tabler/icons-react';

const STEPS = [
  { id: 'template', label: '1. Template' },
  { id: 'file', label: '2. Upload File' },
  { id: 'map', label: '3. Map Columns' },
  { id: 'preview', label: '4. Preview' },
  { id: 'confirm', label: '5. Confirm' },
  { id: 'result', label: '6. Result' },
];

export const UploadConveyor: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
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
        toast.success(`Parsed ${res.total_rows} rows from ${selectedFile.name}`);
      }
      setCurrentStep(2); // advance to map columns
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse uploaded file');
    } finally {
      setLoading(false);
    }
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
      setCurrentStep(5); // Result step
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-tile rounded-tile border border-hairline p-6 shadow-shelf space-y-6">
      {/* Header */}
      <div className="border-b border-hairline pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl text-ink font-normal">CSV/Excel Bulk Ingestion Wizard</h3>
          <p className="text-xs text-muted font-sans mt-0.5">
            Idempotent batch conveyor with column mapping, validation summaries, and rejected-rows logging (§6.3).
          </p>
        </div>
      </div>

      {/* Horizontal Conveyor Stepper with Big Step Tags (§10.6) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-hairline">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div
              key={step.id}
              onClick={() => {
                if (isDone) setCurrentStep(idx);
              }}
              className={cn(
                'price-tag-shape px-3.5 py-2 text-xs font-sans transition-all duration-150 shrink-0 select-none flex items-center gap-1.5 border',
                isCurrent && 'bg-cocoa text-white font-semibold border-cocoa-deep shadow-sm',
                isDone && 'bg-cocoa-wash/80 text-cocoa border-hairline cursor-pointer hover:bg-cocoa-wash',
                !isDone && !isCurrent && 'bg-shelf text-muted border-hairline opacity-60'
              )}
            >
              <div
                className={cn(
                  'price-tag-hole absolute top-1.5 left-1.5',
                  isCurrent ? 'bg-cocoa-wash/80 border-cocoa-deep' : 'bg-shelf border-hairline'
                )}
              />
              <span className="pl-1.5">{step.label}</span>
              {isDone && <IconCheck size={13} className="text-cocoa stroke-[2.5]" />}
            </div>
          );
        })}
      </div>

      {/* STEP 1: TEMPLATE DOWNLOAD */}
      {currentStep === 0 && (
        <div className="space-y-4 max-w-xl py-2">
          <h4 className="font-serif text-base text-ink font-normal">Step 1: Obtain the Standard Price Template</h4>
          <p className="text-xs text-muted font-sans leading-relaxed">
            Download our standard CSV format. You can also download a dataset pre-filled with illustrative sample data to explore how validation, outlier detection, and duplicate policies operate.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => downloadFile('/uploads/template', 'pricepulse_template.csv')}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-tile border border-hairline hover:bg-cocoa-wash/40 text-xs font-sans text-ink font-medium shadow-shelf transition-colors"
            >
              <IconDownload size={15} className="text-cocoa" />
              <span>Download Blank Template (CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadFile('/uploads/sample', 'pricepulse_sample_data.csv')}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-cocoa-wash hover:bg-cocoa-wash/70 text-xs font-sans text-cocoa font-medium border border-hairline shadow-shelf transition-colors"
            >
              <IconFileSpreadsheet size={15} className="text-cocoa" />
              <span>Download Illustrative Sample Data</span>
            </button>
          </div>
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep"
            >
              <span>Continue to Upload</span>
              <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FILE UPLOAD */}
      {currentStep === 1 && (
        <div className="space-y-4 max-w-xl py-2">
          <h4 className="font-serif text-base text-ink font-normal">Step 2: Select CSV or Excel Spreadsheet</h4>
          <div className="border-2 border-dashed border-hairline rounded-tile p-8 text-center bg-shelf/40 hover:bg-shelf/70 transition-colors">
            <IconUpload size={32} className="text-cocoa mx-auto mb-2" />
            <p className="text-xs text-ink font-medium font-sans mb-1">
              {file ? file.name : 'Drag & drop or choose price file (CSV, XLSX)'}
            </p>
            <p className="text-[11px] text-muted font-sans mb-4">
              Maximum file size: 10 MB. SHA-256 fingerprint checked automatically.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep cursor-pointer shadow-shelf">
              <span>{loading ? 'Uploading & Parsing...' : 'Select File'}</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                disabled={loading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 3: MAP COLUMNS */}
      {currentStep === 2 && previewData && (
        <div className="space-y-4 max-w-2xl py-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif text-base text-ink font-normal">Step 3: Column Mapping</h4>
              <p className="text-xs text-muted font-sans">
                Match columns in your file to PricePulse standard fields.
              </p>
            </div>
            <span className="font-mono text-xs text-muted">
              File: {previewData.filename} ({previewData.total_rows} rows)
            </span>
          </div>

          <div className="bg-tile rounded border border-hairline overflow-hidden shadow-shelf">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-shelf/70 border-b border-hairline text-muted uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Standard Field</th>
                  <th className="py-2.5 px-4">Required</th>
                  <th className="py-2.5 px-4">Mapped Column in File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {[
                  { field: 'market', label: 'Market Center', req: true },
                  { field: 'item', label: 'Basket Item', req: true },
                  { field: 'date', label: 'Observation Date', req: true },
                  { field: 'price', label: 'Price Amount', req: true },
                  { field: 'unit', label: 'Unit of Measure', req: true },
                  { field: 'notes', label: 'Enumerator Notes', req: false },
                ].map((row) => (
                  <tr key={row.field} className="hover:bg-cocoa-wash/20">
                    <td className="py-2.5 px-4 font-medium text-ink">{row.label}</td>
                    <td className="py-2.5 px-4 font-mono text-[10px]">
                      {row.req ? <span className="text-rise font-bold">REQUIRED</span> : <span className="text-muted">OPTIONAL</span>}
                    </td>
                    <td className="py-2 px-4">
                      <select
                        value={columnMapping[row.field] || ''}
                        onChange={(e) =>
                          setColumnMapping({ ...columnMapping, [row.field]: e.target.value })
                        }
                        className="px-2.5 py-1 text-xs font-mono rounded border border-hairline bg-shelf text-ink w-full max-w-xs"
                      >
                        <option value="">-- Choose Column --</option>
                        {previewData.headers?.map((h: string) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline text-xs font-sans text-muted hover:text-ink"
            >
              <IconArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep shadow-shelf"
            >
              <span>Preview Validation</span>
              <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & VALIDATION SUMMARY */}
      {currentStep === 3 && previewData && (
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif text-base text-ink font-normal">Step 4: Preview First 50 Rows</h4>
              <p className="text-xs text-muted font-sans">
                Total rows detected: <span className="font-mono font-semibold text-ink">{previewData.total_rows}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted">
                SHA-256: {previewData.checksum.slice(0, 12)}...
              </span>
            </div>
          </div>

          {/* Preview rows table */}
          <div className="bg-tile rounded-tile border border-hairline overflow-x-auto max-h-80 shadow-shelf">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-shelf/80 border-b border-hairline text-muted uppercase text-[10px] sticky top-0 bg-shelf z-10 font-sans">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Market</th>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Price</th>
                  <th className="py-2 px-3">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-[11px]">
                {previewData.preview_rows?.slice(0, 20).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-cocoa-wash/20">
                    <td className="py-1.5 px-3 text-muted">{i + 1}</td>
                    <td className="py-1.5 px-3 font-sans font-medium text-ink">
                      {row[columnMapping.market] || '—'}
                    </td>
                    <td className="py-1.5 px-3 font-sans font-medium text-ink">
                      {row[columnMapping.item] || '—'}
                    </td>
                    <td className="py-1.5 px-3 text-muted">{row[columnMapping.date] || '—'}</td>
                    <td className="py-1.5 px-3 font-semibold text-ink">
                      ₹{row[columnMapping.price] || '—'}
                    </td>
                    <td className="py-1.5 px-3 text-muted">{row[columnMapping.unit] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline text-xs font-sans text-muted hover:text-ink"
            >
              <IconArrowLeft size={14} />
              <span>Change Mapping</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep shadow-shelf"
            >
              <span>Duplicate Policy & Confirm</span>
              <IconArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: DUPLICATE POLICY & CONFIRM */}
      {currentStep === 4 && (
        <div className="space-y-4 max-w-xl py-2">
          <h4 className="font-serif text-base text-ink font-normal">Step 5: Set Duplicate Policy & Confirm Ingestion</h4>
          <p className="text-xs text-muted font-sans leading-relaxed">
            Choose how to handle records with matching market, item, date and source (§6.3):
          </p>

          <div className="space-y-2.5 pt-1">
            {[
              { id: 'skip', label: 'Skip duplicates (Recommended)', desc: 'Keeps existing verified observation in database and skips uploaded duplicate.' },
              { id: 'replace', label: 'Replace with audit note', desc: 'Overwrites existing price observation with uploaded price and logs audit trail.' },
              { id: 'reject', label: 'Reject duplicate rows', desc: 'Marks duplicate rows as rejected and excludes them from database.' },
            ].map((pol) => (
              <label
                key={pol.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-tile border cursor-pointer transition-colors',
                  duplicatePolicy === pol.id
                    ? 'bg-cocoa-wash/80 border-cocoa'
                    : 'bg-tile border-hairline hover:bg-shelf'
                )}
              >
                <input
                  type="radio"
                  name="duplicate_policy"
                  value={pol.id}
                  checked={duplicatePolicy === pol.id}
                  onChange={() => setDuplicatePolicy(pol.id as any)}
                  className="mt-0.5 text-cocoa focus:ring-cocoa"
                />
                <div>
                  <div className="text-xs font-semibold text-ink font-sans">{pol.label}</div>
                  <div className="text-[11px] text-muted font-sans mt-0.5">{pol.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline text-xs font-sans text-muted hover:text-ink"
            >
              <IconArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmBatch}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep shadow-shelf disabled:opacity-50"
            >
              <IconCheck size={15} />
              <span>{loading ? 'Ingesting Observations...' : 'Confirm & Process Upload'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: RESULT */}
      {currentStep === 5 && resultData && (
        <div className="space-y-4 max-w-xl py-2">
          <div className="p-5 rounded-tile bg-[#E7F3EE] border border-[#C3E4D6] text-fall flex items-start gap-3">
            <IconCheck size={24} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-serif text-lg font-normal text-fall">Batch Ingestion Complete</h4>
              <p className="text-xs mt-1 text-ink/80 font-sans leading-relaxed">
                Processed <span className="font-mono font-bold">{resultData.total_processed}</span> total records from file.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-tile rounded border border-hairline shadow-shelf text-center">
              <span className="text-[10px] uppercase font-mono text-muted block">Saved Clean</span>
              <span className="font-mono text-xl font-bold text-fall">{resultData.saved_count}</span>
            </div>
            <div className="p-3 bg-tile rounded border border-hairline shadow-shelf text-center">
              <span className="text-[10px] uppercase font-mono text-muted block">Flagged for Review</span>
              <span className="font-mono text-xl font-bold text-warn">{resultData.flagged_count}</span>
            </div>
            <div className="p-3 bg-tile rounded border border-hairline shadow-shelf text-center">
              <span className="text-[10px] uppercase font-mono text-muted block">Rejected / Skipped</span>
              <span className="font-mono text-xl font-bold text-rise">{resultData.rejected_count}</span>
            </div>
          </div>

          {resultData.has_errors && resultData.errors_csv_url && (
            <div className="p-4 rounded bg-[#FEF7EC] border border-[#F8DCB3] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-sans text-warn font-medium">
                <IconFileAlert size={18} />
                <span>{resultData.rejected_count} rows were rejected or skipped.</span>
              </div>
              <button
                type="button"
                onClick={() => downloadFile(`/uploads/${resultData.batch_id}/errors.csv`, `rejected_rows_${resultData.batch_id.slice(0, 8)}.csv`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-tile border border-hairline hover:bg-white text-xs font-sans text-ink shadow-shelf"
              >
                <IconDownload size={14} className="text-cocoa" />
                <span>Download Rejected CSV</span>
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(0);
                setFile(null);
                setPreviewData(null);
                setResultData(null);
              }}
              className="px-4 py-2 rounded border border-hairline bg-tile hover:bg-cocoa-wash/40 text-xs font-sans text-ink"
            >
              Start New Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
