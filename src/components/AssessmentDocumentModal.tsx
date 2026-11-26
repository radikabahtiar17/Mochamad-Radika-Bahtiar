import { Download, FileSpreadsheet, Printer, X } from 'lucide-react';
import {
  PILLARS,
  getComplianceTier,
  type AreaChecklistSummary,
  type AssessmentSubmission,
} from '../utils/hse5s';
import { SpilBrandLogo } from './SpilBrandLogo';

interface AssessmentDocumentModalProps {
  open: boolean;
  summary: AreaChecklistSummary | null;
  focusedSubmission?: AssessmentSubmission | null;
  onClose: () => void;
  onDownloadHtml: () => void;
  onDownloadCsv: () => void;
}

export function AssessmentDocumentModal({
  open,
  summary,
  focusedSubmission,
  onClose,
  onDownloadHtml,
  onDownloadCsv,
}: AssessmentDocumentModalProps) {
  if (!open || !summary) return null;

  const tier = getComplianceTier(
    summary.evaluatedItemsCount > 0 ? summary.evaluatedScorePct : null,
  );
  const auditDate = summary.lastAuditDate
    ? summary.lastAuditDate.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-preview-title"
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Action Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="doc-preview-title" className="font-display text-base font-bold text-slate-900">
              Pratinjau Dokumen Hasil Asesmen 5R / 5S
            </h2>
            <p className="text-xs text-slate-500">
              {summary.picName} · {summary.area}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Unduh Formulir (.HTML)
            </button>
            <button
              type="button"
              onClick={onDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              Unduh Excel (.CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              Cetak / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau dokumen"
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Official Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#B91C1C] pb-4">
              <div className="flex items-center gap-3.5">
                <SpilBrandLogo size="md" decorative />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B91C1C] block">
                    PT Salam Pacific Indonesia Lines · Dokumen Resmi HSE
                  </span>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Formulir Hasil Asesmen HSE 5R / 5S
                  </h3>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <span className="block font-medium text-slate-700">Tanggal Audit</span>
                <span className="font-mono tabular-nums">{auditDate}</span>
              </div>
            </div>

            {/* Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="text-slate-500 block">Yang Dinilai (PIC)</span>
                <span className="font-semibold text-[#B91C1C] text-sm mt-0.5 block">
                  {summary.picName}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="text-slate-500 block">Tempat / Area</span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                  {summary.area}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="text-slate-500 block">Auditor HSE / Penilai</span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                  {summary.lastAuditor}
                </span>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <span className="text-red-700 block">Skor & Status Kepatuhan</span>
                <span className="font-display font-bold text-[#B91C1C] text-sm tabular-nums mt-0.5 block">
                  {summary.evaluatedScorePct.toFixed(1)}% · {tier}
                </span>
              </div>
            </div>

            {/* Focused Submission Highlight */}
            {focusedSubmission && (
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-4 space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#991B1B]">
                    Ringkasan Penilaian Item: {focusedSubmission.itemCode} —{' '}
                    {focusedSubmission.itemTitle}
                  </span>
                  <span className="font-mono font-bold text-[#B91C1C] bg-white border border-red-200 px-2.5 py-0.5 rounded tabular-nums">
                    Exist: {focusedSubmission.exist ?? '-'} · Skor: {focusedSubmission.rating ?? '-'}/4
                  </span>
                </div>
                <p className="text-slate-700">
                  <strong>Catatan PIC:</strong> {focusedSubmission.assesseeNotes}
                </p>
                <p className="text-slate-900">
                  <strong>Feedback Penilai:</strong> {focusedSubmission.evaluatorFeedback || '-'}
                </p>
              </div>
            )}

            {/* Matrix Summary Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#B91C1C] text-white">
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3 w-20">Kode</th>
                    <th className="py-2 px-3">Checklist Item & Kriteria</th>
                    <th className="py-2 px-3 w-16 text-center">Exist?</th>
                    <th className="py-2 px-3 w-16 text-center">Rating</th>
                    <th className="py-2 px-3">Komentar Penilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {PILLARS.map((pillar) => {
                    const rows = summary.rows.filter((r) => r.item.pillar === pillar.code);
                    if (rows.length === 0) return null;
                    return (
                      <FragmentGroup key={pillar.code} header={`${pillar.code} · ${pillar.englishName} – ${pillar.japaneseName} (${pillar.indonesianName})`} rows={rows} />
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 font-semibold text-[#991B1B]">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      Total Poin ({summary.evaluatedItemsCount} dari {summary.totalChecklistItems} item dinilai)
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                      {summary.totalPoints}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      Skor Item Dinilai: {summary.evaluatedScorePct.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-center">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-slate-600">Diperiksa & Dinilai Oleh (Auditor HSE SPIL)</p>
                <div className="h-14 border-b border-dashed border-slate-300 mx-8 my-3" />
                <p className="font-semibold text-slate-900">{summary.lastAuditor}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-slate-600">Diterima & Ditindaklanjuti Oleh (PIC Area)</p>
                <div className="h-14 border-b border-dashed border-slate-300 mx-8 my-3" />
                <p className="font-semibold text-slate-900">{summary.picName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentGroup({
  header,
  rows,
}: {
  header: string;
  rows: AreaChecklistSummary['rows'];
}) {
  return (
    <>
      <tr className="bg-slate-100">
        <td colSpan={6} className="py-2 px-3 font-semibold text-[#991B1B]">
          {header}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.item.id}>
          <td className="py-2 px-3 text-center text-slate-500 tabular-nums">{row.item.number}</td>
          <td className="py-2 px-3 font-mono font-semibold text-[#B91C1C]">{row.item.code}</td>
          <td className="py-2 px-3">
            <span className="font-semibold text-slate-900 block">{row.item.title}</span>
            <span className="text-[11px] text-slate-500 block">{row.item.criteria}</span>
          </td>
          <td className="py-2 px-3 text-center font-mono">{row.exist}</td>
          <td className="py-2 px-3 text-center font-mono font-semibold tabular-nums">
            {row.rating !== null ? row.rating : '-'}
          </td>
          <td className="py-2 px-3 text-slate-700">{row.comments || '-'}</td>
        </tr>
      ))}
    </>
  );
}
