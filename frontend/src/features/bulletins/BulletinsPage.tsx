import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import { Skeleton } from '../../components/ui/FeedbackStates';
import {
  IconFileText,
  IconDownload,
  IconWorldUpload,
  IconCheck,
  IconCalendarEvent,
  IconTable,
  IconBuildingStore,
  IconListCheck,
  IconSparkles,
  IconEye,
  IconX,
  IconArrowRight,
  IconPrinter,
  IconCpu,
  IconCalendar,
} from '@tabler/icons-react';

export const BulletinsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  // Fetch available periods
  const { data: periodsData } = useQuery({
    queryKey: ['report-periods'],
    queryFn: () => apiFetch<any>('/reports/periods'),
  });

  const availablePeriods: string[] = periodsData?.periods || ['2024-W52'];
  const activePeriod = selectedPeriod || periodsData?.latest || '2024-W52';

  // Fetch reports list
  const {
    data: reportsList,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['reports-list'],
    queryFn: () => apiFetch<any[]>('/reports'),
  });

  // Generate bulletin mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiFetch<any>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          template: selectedTemplate,
          period: activePeriod,
          title: customTitle || undefined,
        }),
      });
    },
    onSuccess: (newDoc) => {
      toast.success(`Generated official ${selectedTemplate.toUpperCase()} release!`);
      setCustomTitle('');
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      // Automatically prompt to preview the newly built PDF
      if (newDoc?.id) {
        setPreviewReportId(newDoc.id);
      }
    },
    onError: () => {
      toast.error('Failed to build PDF release.');
    },
  });

  // Publish to public landing hero mutation
  const publishMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await apiFetch<any>(`/reports/${reportId}/publish`, { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Bulletin published to public landing page hero!');
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      queryClient.invalidateQueries({ queryKey: ['published-landing'] });
    },
    onError: () => {
      toast.error('Failed to publish release.');
    },
  });

  const templates = [
    {
      id: 'monthly',
      title: 'Monthly Inflation Bulletin',
      desc: 'Official monthly release with Laspeyres headline YoY%, MoM%, and top contributors.',
      icon: <IconCalendarEvent size={20} />,
      tag: 'Macro Release',
    },
    {
      id: 'weekly',
      title: 'Weekly Retail Watchlist',
      desc: 'High-frequency weekly price tracker highlighting perishable spikes and supply shocks.',
      icon: <IconListCheck size={20} />,
      tag: 'Spike Monitor',
    },
    {
      id: 'items',
      title: 'Essential Basket Price Sheet',
      desc: 'Itemized price ledger across all 15 core basket items with historical base comparison.',
      icon: <IconTable size={20} />,
      tag: '15 Goods Ledger',
    },
    {
      id: 'regional',
      title: 'Regional Markets & Gap Note',
      desc: 'Cross-district price dispersion and wholesale vs retail spread analysis.',
      icon: <IconBuildingStore size={20} />,
      tag: 'Cross-Market Spread',
    },
  ];

  const handleDownload = (reportId: string, filename: string) => {
    const url = `/api/v1/reports/${reportId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = (reportId: string, periodStr: string) => {
    const url = `/api/v1/reports/${reportId}/export-csv`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `PricePulse_Data_${periodStr}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Find currently published report
  const publishedReport = (reportsList || []).find((r: any) => r.is_published);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cocoa">Official Publications & Bulletins</h1>
            <span className="rounded-full bg-shelf-base px-2.5 py-0.5 text-[11px] font-mono text-shelf-muted border border-hairline">
              PDF & Data Exports
            </span>
          </div>
          <p className="mt-1 text-xs text-shelf-muted max-w-2xl font-sans">
            Generate print-ready official PDF bulletins, export tabular series, and publish certified releases to the public landing hero.
          </p>
        </div>

        {publishedReport && (
          <Link
            to="/landing"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-shelf-base border border-hairline text-cocoa hover:bg-shelf text-xs font-serif font-bold transition shadow-xs"
          >
            <span>View Public Landing Page</span>
            <IconArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Top Executive Publications KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Official Releases */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Total Official Releases
            </span>
            <div className="rounded-full bg-cocoa/10 p-1 text-cocoa">
              <IconFileText size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-2xl font-bold text-cocoa">{reportsList?.length || 0}</span>
              <span className="text-xs text-shelf-muted font-sans">documents archived</span>
            </div>
            <div className="text-[11px] text-shelf-muted font-sans mt-0.5">
              Certified release binaries
            </div>
          </div>
        </div>

        {/* Live on Landing Hero */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Live on Landing Hero
            </span>
            <div className="rounded-full bg-price-fall/10 p-1 text-price-fall">
              <IconWorldUpload size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa truncate" title={publishedReport?.title || 'None'}>
              {publishedReport ? publishedReport.title : 'No Release Published'}
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
              <span className="text-price-fall font-bold">
                {publishedReport ? `Period ${publishedReport.period}` : 'Draft Mode'}
              </span>
              {publishedReport && (
                <span className="text-[10px] bg-price-fall/10 text-price-fall px-1.5 py-0.2 rounded font-mono font-bold">
                  ACTIVE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Latest Certified Period */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              Latest Indexed Period
            </span>
            <div className="rounded-full bg-cocoa/10 p-1 text-cocoa">
              <IconCalendar size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono text-2xl font-bold text-cocoa">{activePeriod}</div>
            <div className="text-[11px] text-shelf-muted font-sans mt-0.5">
              Available for instant report generation
            </div>
          </div>
        </div>

        {/* PDF Engine Health */}
        <div className="rounded-2xl border-2 border-hairline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[11px] font-bold text-shelf-muted uppercase tracking-wider">
              PDF Engine Status
            </span>
            <div className="rounded-full bg-price-fall/10 p-1 text-price-fall">
              <IconCpu size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-serif text-base font-bold text-cocoa">ReportLab Vector Online</div>
            <div className="text-[11px] text-shelf-muted font-sans mt-0.5">
              Calibrated to 300 DPI Shelf Tag aesthetic
            </div>
          </div>
        </div>
      </div>

      {/* Generator Stepper Box */}
      <div className="rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-cocoa">1. Select Publication Template</h3>
            <span className="text-xs text-shelf-muted font-sans">Choose format tailored to release objective</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-3">
            {templates.map((tpl) => {
              const isSelected = selectedTemplate === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                    isSelected
                      ? 'border-cocoa bg-shelf-base shadow-xs'
                      : 'border-hairline bg-white hover:bg-shelf-base/50 hover:border-cocoa/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`inline-flex rounded-lg p-2 ${
                        isSelected ? 'bg-cocoa text-white' : 'bg-shelf-base text-cocoa'
                      }`}
                    >
                      {tpl.icon}
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-white border border-hairline px-2 py-0.5 rounded font-bold text-shelf-muted">
                      {tpl.tag}
                    </span>
                  </div>
                  <h4 className="font-serif text-sm font-bold text-cocoa">{tpl.title}</h4>
                  <p className="mt-1 text-[11px] text-shelf-muted leading-relaxed font-sans">{tpl.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Period Selection and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-hairline/80 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="font-serif text-xs font-bold text-cocoa">Target Period:</label>
              <select
                value={activePeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-xl border border-hairline bg-white px-3 py-1.5 font-mono text-xs font-bold text-cocoa shadow-xs focus:outline-none focus:border-cocoa cursor-pointer"
              >
                {availablePeriods.map((p) => (
                  <option key={p} value={p}>
                    {p} {p === periodsData?.latest ? '(Latest)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-serif text-xs font-bold text-cocoa">Custom Title (optional):</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Special Deepavali Retail Bulletin"
                className="rounded-xl border border-hairline bg-white px-3 py-1.5 font-sans text-xs text-cocoa focus:border-cocoa focus:outline-none shadow-xs w-64"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-cocoa px-5 py-2 font-serif text-xs font-bold text-white transition hover:bg-cocoa/90 disabled:opacity-50 shadow-xs"
          >
            <IconSparkles size={16} />
            <span>{generateMutation.isPending ? 'Building ReportLab PDF...' : 'Generate Official Bulletin'}</span>
          </button>
        </div>
      </div>

      {/* Generated Bulletins Archive */}
      <div className="rounded-2xl border-2 border-hairline bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-hairline/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-cocoa/10 p-2 text-cocoa">
              <IconFileText size={20} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-cocoa">Publication Archive & Certified Releases</h3>
              <p className="text-xs text-shelf-muted font-sans">
                Permanent document archive of verified PDF bulletins and data exports
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-shelf-muted bg-shelf-base px-2.5 py-1 rounded-lg border border-hairline">
            {reportsList?.length || 0} Releases Available
          </span>
        </div>

        {reportsLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : !reportsList || reportsList.length === 0 ? (
          <div className="py-12 text-center text-sm font-sans text-shelf-muted">
            No bulletins generated yet. Select a template above to produce a release.
          </div>
        ) : (
          <div className="space-y-3">
            {reportsList.map((rep) => (
              <div
                key={rep.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition ${
                  rep.is_published
                    ? 'border-price-fall/40 bg-price-fall/5 shadow-xs'
                    : 'border-hairline bg-white hover:bg-shelf-base/40 hover:border-cocoa/50 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`rounded-xl p-2.5 ${
                      rep.is_published ? 'bg-price-fall text-white' : 'bg-cocoa/10 text-cocoa'
                    }`}
                  >
                    <IconFileText size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-sm font-bold text-cocoa">{rep.title}</h4>
                      {rep.is_published && (
                        <span className="rounded-full bg-price-fall/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-price-fall border border-price-fall/30">
                          Live on Landing Hero
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-shelf-muted font-mono">
                      <span>Period: {rep.period}</span>
                      <span>•</span>
                      <span>Template: {rep.template || 'monthly'}</span>
                      <span>•</span>
                      <span>Size: {(rep.pdf_size_bytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>Created: {new Date(rep.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Preview In-Browser Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewReportId(rep.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 font-sans text-xs font-semibold text-cocoa hover:bg-shelf transition shadow-xs"
                  >
                    <IconEye size={15} />
                    <span>Preview PDF</span>
                  </button>

                  {/* Download PDF Button */}
                  <button
                    type="button"
                    onClick={() => handleDownload(rep.id, `PricePulse_${rep.template}_${rep.period}.pdf`)}
                    className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 font-sans text-xs font-semibold text-cocoa hover:bg-shelf transition shadow-xs"
                  >
                    <IconDownload size={15} />
                    <span>Download PDF</span>
                  </button>

                  {/* Export Tabular CSV Button */}
                  <button
                    type="button"
                    onClick={() => handleExportCSV(rep.id, rep.period)}
                    className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 font-sans text-xs font-semibold text-cocoa hover:bg-shelf transition shadow-xs"
                    title="Export underlying tabular dataset as CSV"
                  >
                    <IconTable size={15} />
                    <span>Export CSV</span>
                  </button>

                  {/* Publish / Active Toggle Button */}
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate(rep.id)}
                    disabled={rep.is_published || publishMutation.isPending}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-serif text-xs font-bold transition shadow-xs ${
                      rep.is_published
                        ? 'bg-price-fall text-white cursor-default'
                        : 'bg-cocoa text-white hover:bg-cocoa/90'
                    }`}
                  >
                    <IconWorldUpload size={15} />
                    <span>{rep.is_published ? 'Published' : 'Publish to Hero'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-Browser PDF Preview Modal */}
      {previewReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative flex flex-col w-full max-w-4xl h-[85vh] rounded-2xl bg-white shadow-2xl border-2 border-hairline overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-hairline bg-shelf-base">
              <div className="flex items-center gap-2">
                <IconFileText size={20} className="text-cocoa" />
                <span className="font-serif text-sm font-bold text-cocoa">Official Bulletin Document Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewReportId, `PricePulse_Preview.pdf`)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-serif font-bold text-cocoa bg-white border border-hairline rounded-lg hover:bg-shelf transition"
                >
                  <IconDownload size={14} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewReportId(null)}
                  className="p-1 rounded-lg text-shelf-muted hover:text-cocoa hover:bg-shelf transition"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>

            {/* Modal Embedded PDF Body */}
            <div className="flex-1 w-full bg-shelf-muted/10 p-2">
              <iframe
                src={`/api/v1/reports/${previewReportId}/preview`}
                title="Official Bulletin PDF Preview"
                className="w-full h-full rounded-xl border border-hairline bg-white shadow-inner"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
