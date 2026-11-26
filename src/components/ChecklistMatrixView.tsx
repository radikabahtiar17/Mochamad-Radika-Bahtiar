import { useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import {
  PILLARS,
  calculateAreaChecklistSummary,
  type AppraisalProfile,
  type AssessmentSubmission,
  type MeasurementItem,
  type PillarCode,
} from '../utils/hse5s';

interface ChecklistMatrixViewProps {
  areas: string[];
  profiles: AppraisalProfile[];
  items: MeasurementItem[];
  submissions: AssessmentSubmission[];
  selectedArea: string;
  selectedPic: string;
  onSelectArea: (area: string) => void;
  onSelectPic: (picName: string) => void;
  onExportCsv: (area: string, picName: string) => void;
  onDownloadDocument: (area: string, picName: string) => void;
  onPreviewDocument: (area: string, picName: string) => void;
  onOpenSubmissionInQueue: (submissionId: string) => void;
  onStartUploadForItem: (itemId: string, area: string, picName?: string) => void;
}

export function ChecklistMatrixView({
  areas,
  profiles,
  items,
  submissions,
  selectedArea,
  selectedPic,
  onSelectArea,
  onSelectPic,
  onExportCsv,
  onDownloadDocument,
  onPreviewDocument,
  onOpenSubmissionInQueue,
  onStartUploadForItem,
}: ChecklistMatrixViewProps) {
  const [pillarFilter, setPillarFilter] = useState<'ALL' | PillarCode>('ALL');
  const [searchText, setSearchText] = useState('');

  const areaPics = useMemo(() => {
    const names = new Set<string>();
    for (const p of profiles) {
      if (p.area === selectedArea) names.add(p.picName);
    }
    for (const s of submissions) {
      if (s.area === selectedArea) names.add(s.picName);
    }
    return Array.from(names);
  }, [profiles, submissions, selectedArea]);

  const summary = useMemo(
    () => calculateAreaChecklistSummary(items, submissions, selectedArea, selectedPic),
    [items, submissions, selectedArea, selectedPic],
  );

  const visiblePillars = PILLARS.filter(
    (p) => pillarFilter === 'ALL' || p.code === pillarFilter,
  );

  const matchesSearch = (title: string, criteria: string, code: string) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      title.toLowerCase().includes(q) ||
      criteria.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q)
    );
  };

  return (
    <section aria-labelledby="checklist-heading" className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Rekap Standar 5S Checklist · Referensi Format Excel HSE
          </p>
          <h1
            id="checklist-heading"
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1"
          >
            Matriks Checklist 5R / 5S per Area
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Ringkasan item measurement S1–S5 lengkap dengan status Exist? (Y/N), Rating (0–4),
            komentar penilai, dan total persentase kepatuhan area.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Pilih area untuk matriks checklist"
            value={selectedArea}
            onChange={(e) => {
              onSelectArea(e.target.value);
              onSelectPic('ALL');
            }}
            className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
          >
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            aria-label="Pilih nama Yang Dinilai (PIC) untuk memisahkan appraisal"
            value={selectedPic}
            onChange={(e) => onSelectPic(e.target.value)}
            className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
          >
            <option value="ALL">Semua PIC di Area Ini</option>
            {areaPics.map((pic) => (
              <option key={pic} value={pic}>
                PIC: {pic}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onPreviewDocument(selectedArea, selectedPic)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            Pratinjau Dokumen
          </button>

          <button
            type="button"
            onClick={() => onDownloadDocument(selectedArea, selectedPic)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Unduh Formulir Hasil
          </button>

          <button
            type="button"
            onClick={() => onExportCsv(selectedArea, selectedPic)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Header Summary Strip matching Excel Sheet */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div className="col-span-2 lg:col-span-1">
          <span className="text-xs text-slate-500 block">Area</span>
          <span className="text-sm font-semibold text-slate-900 block truncate mt-0.5">
            {summary.area}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">Yang Dinilai (PIC)</span>
          <span className="text-sm font-semibold text-[#B91C1C] block truncate mt-0.5">
            {summary.picName}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">Auditor Terakhir</span>
          <span className="text-sm font-semibold text-slate-900 block truncate mt-0.5">
            {summary.lastAuditor}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">Item Terverifikasi</span>
          <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums block mt-0.5">
            {summary.evaluatedItemsCount} / {summary.totalChecklistItems} item
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">Total Poin</span>
          <span className="font-mono text-lg font-bold text-[#B91C1C] tabular-nums block">
            {summary.totalPoints}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">Score (Dinilai / Penuh)</span>
          <span className="font-mono text-lg font-bold text-emerald-700 tabular-nums block">
            {summary.evaluatedScorePct.toFixed(1)}%
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              ({summary.fullChecklistScorePct.toFixed(1)}%)
            </span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setPillarFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
              pillarFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Pilar
          </button>
          {PILLARS.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => setPillarFilter(p.code)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                pillarFilter === p.code
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.code} · {p.indonesianName}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Cari item atau kriteria checklist"
            placeholder="Cari item atau kriteria..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
          />
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <th className="py-3 px-4 w-14">No</th>
                <th className="py-3 px-4 min-w-[180px]">Checklist Item</th>
                <th className="py-3 px-4 min-w-[280px]">Criteria</th>
                <th className="py-3 px-3 text-center w-20">Exist?</th>
                <th className="py-3 px-3 text-center w-24">Rating</th>
                <th className="py-3 px-4 min-w-[220px]">Comments</th>
                <th className="py-3 px-4 text-right w-28">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visiblePillars.map((pillar) => {
                const pillarRows = summary.rows.filter(
                  (r) =>
                    r.item.pillar === pillar.code &&
                    matchesSearch(r.item.title, r.item.criteria, r.item.code),
                );
                if (pillarRows.length === 0) return null;

                return (
                  <FragmentGroup
                    key={pillar.code}
                    pillarHeader={`${pillar.code} · ${pillar.englishName} – ${pillar.japaneseName} (${pillar.indonesianName})`}
                    rows={pillarRows}
                    selectedArea={selectedArea}
                    selectedPic={selectedPic}
                    onOpenSubmissionInQueue={onOpenSubmissionInQueue}
                    onStartUploadForItem={onStartUploadForItem}
                  />
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-sm">
                <td colSpan={4} className="py-3.5 px-4 text-right text-slate-700">
                  Total Points & Compliance Score
                </td>
                <td className="py-3.5 px-3 text-center font-mono tabular-nums text-[#B91C1C] text-base">
                  {summary.totalPoints}
                </td>
                <td colSpan={2} className="py-3.5 px-4 font-mono tabular-nums text-emerald-700">
                  Score: {summary.evaluatedScorePct.toFixed(1)}% (Evaluated) ·{' '}
                  {summary.fullChecklistScorePct.toFixed(1)}% (All {summary.totalChecklistItems}{' '}
                  Items)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

interface FragmentGroupProps {
  pillarHeader: string;
  rows: ReturnType<typeof calculateAreaChecklistSummary>['rows'];
  selectedArea: string;
  selectedPic: string;
  onOpenSubmissionInQueue: (submissionId: string) => void;
  onStartUploadForItem: (itemId: string, area: string, picName?: string) => void;
}

function FragmentGroup({
  pillarHeader,
  rows,
  selectedArea,
  selectedPic,
  onOpenSubmissionInQueue,
  onStartUploadForItem,
}: FragmentGroupProps) {
  return (
    <>
      <tr className="bg-slate-50 border-y border-slate-200">
        <td colSpan={7} className="py-2.5 px-4 font-display text-xs font-bold text-[#B91C1C]">
          {pillarHeader}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.item.id} className="border-b border-slate-100 hover:bg-slate-50/70">
          <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
            {row.item.number}
          </td>
          <td className="py-3 px-4 font-medium text-slate-900">
            <span className="font-mono text-[11px] text-slate-500 mr-1.5">{row.item.code}</span>
            {row.item.title}
          </td>
          <td className="py-3 px-4 text-xs text-slate-600">{row.item.criteria}</td>
          <td className="py-3 px-3 text-center font-mono text-xs font-semibold">
            {row.exist === 'Y' ? (
              <span className="text-emerald-700">Y</span>
            ) : row.exist === 'N' ? (
              <span className="text-red-700">N</span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </td>
          <td className="py-3 px-3 text-center font-mono text-sm font-semibold tabular-nums">
            {row.rating !== null ? (
              <span
                className={
                  row.rating >= 3
                    ? 'text-emerald-700'
                    : row.rating === 2
                      ? 'text-amber-700'
                      : 'text-red-700'
                }
              >
                {row.rating}
              </span>
            ) : (
              <span className="text-slate-400 font-normal text-xs">
                {row.status === 'pending' ? 'Pending' : '—'}
              </span>
            )}
          </td>
          <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">
            {row.comments || <span className="text-slate-400">Belum ada catatan</span>}
          </td>
          <td className="py-3 px-4 text-right whitespace-nowrap">
            {row.latestSubmission ? (
              <button
                type="button"
                onClick={() => onOpenSubmissionInQueue(row.latestSubmission!.id)}
                className="text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
              >
                {row.latestSubmission.status === 'pending' ? 'Nilai Foto' : 'Lihat Bukti'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onStartUploadForItem(
                    row.item.id,
                    selectedArea,
                    selectedPic !== 'ALL' ? selectedPic : undefined,
                  )
                }
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
              >
                Unggah Bukti
              </button>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
