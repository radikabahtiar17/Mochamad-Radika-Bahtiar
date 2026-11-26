import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Search,
  ZoomIn,
  X,
} from 'lucide-react';
import {
  RATING_RUBRIC,
  getAppraisalKey,
  getSubmissionPhotos,
  type AppraisalProfile,
  type AssessmentSubmission,
  type ExistValue,
  type RatingValue,
  validateEvaluationInput,
} from '../utils/hse5s';
import { ResilientImage } from './ResilientImage';

interface AssessorQueueViewProps {
  profiles: AppraisalProfile[];
  submissions: AssessmentSubmission[];
  initialSelectedId?: string;
  initialAppraisalFilter?: string;
  defaultEvaluatorName?: string | null;
  onEvaluateSubmission: (
    id: string,
    payload: {
      evaluatorName: string;
      exist: ExistValue;
      rating: RatingValue;
      evaluatorFeedback: string;
    },
  ) => Promise<void>;
  onDownloadReport: (submission: AssessmentSubmission) => void;
  onPreviewReport: (submission: AssessmentSubmission) => void;
}

export function AssessorQueueView({
  profiles,
  submissions,
  initialSelectedId,
  initialAppraisalFilter,
  defaultEvaluatorName,
  onEvaluateSubmission,
  onDownloadReport,
  onPreviewReport,
}: AssessorQueueViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [appraisalFilter, setAppraisalFilter] = useState<string>(initialAppraisalFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedId ||
      submissions.find((s) => s.status === 'pending')?.id ||
      submissions[0]?.id ||
      '',
  );

  const [evaluatorName, setEvaluatorName] = useState(
    defaultEvaluatorName || 'Hendra Wijaya (HSE)',
  );
  const [exist, setExist] = useState<ExistValue>('Y');
  const [rating, setRating] = useState<RatingValue>(3);
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalSuccess, setEvalSuccess] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
    }
  }, [initialSelectedId]);

  useEffect(() => {
    if (initialAppraisalFilter !== undefined) {
      setAppraisalFilter(initialAppraisalFilter || 'all');
    }
  }, [initialAppraisalFilter]);

  const filteredQueue = submissions.filter((sub) => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (
      appraisalFilter !== 'all' &&
      getAppraisalKey(sub.picName, sub.area) !== appraisalFilter
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${sub.itemCode} ${sub.itemTitle} ${sub.area} ${sub.picName} ${sub.assesseeNotes}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeSubmission =
    submissions.find((s) => s.id === selectedId) || filteredQueue[0] || null;

  const activePhotos = activeSubmission ? getSubmissionPhotos(activeSubmission) : [];
  const safePhotoIndex =
    activePhotos.length > 0 ? Math.min(activePhotoIndex, activePhotos.length - 1) : 0;
  const currentPhoto = activePhotos[safePhotoIndex] || activeSubmission?.photoDataUrl || '';

  useEffect(() => {
    setActivePhotoIndex(0);
    if (!activeSubmission) return;
    setExist(activeSubmission.exist ?? activeSubmission.assesseeExistClaim ?? 'Y');
    setRating(activeSubmission.rating ?? 3);
    setFeedback(activeSubmission.evaluatorFeedback ?? '');
    if (activeSubmission.evaluatorName) {
      setEvaluatorName(activeSubmission.evaluatorName);
    }
    setEvalError(null);
    setEvalSuccess(null);
  }, [activeSubmission?.id]);

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;
    setEvalError(null);
    setEvalSuccess(null);

    const validation = validateEvaluationInput({
      evaluatorName,
      exist,
      rating,
      evaluatorFeedback: feedback,
    });
    if (!validation.valid) {
      setEvalError(validation.error || 'Lengkapi form penilaian terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    try {
      await onEvaluateSubmission(activeSubmission.id, {
        evaluatorName: evaluatorName.trim(),
        exist,
        rating,
        evaluatorFeedback: feedback.trim(),
      });
      setEvalSuccess(
        `Penilaian untuk ${activeSubmission.itemCode} (${activeSubmission.itemTitle}) berhasil disimpan dengan skor ${rating}/4.`,
      );
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Gagal menyimpan penilaian.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Queue Panel */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Antrean Foto Masuk
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {filteredQueue.length} item
            </span>
          </div>

          <div className="inline-flex w-full p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'pending', label: 'Menunggu' },
                { id: 'reviewed', label: 'Sudah Dinilai' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari foto kiriman berdasarkan item, PIC, atau catatan"
                placeholder="Cari item, PIC, atau catatan..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
              />
            </div>

            <select
              aria-label="Filter antrean berdasarkan appraisal nama dan tempat"
              value={appraisalFilter}
              onChange={(e) => setAppraisalFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">Semua Appraisal (Nama & Tempat)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.picName} — {p.area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            Tidak ada kiriman foto yang sesuai filter.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filteredQueue.map((sub) => {
              const isSelected = activeSubmission?.id === sub.id;
              const subPhotos = getSubmissionPhotos(sub);
              return (
                <li key={sub.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(sub.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex gap-3 items-start cursor-pointer ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <ResilientImage
                      src={subPhotos[0] || sub.photoDataUrl}
                      alt={`Thumbnail ${sub.itemCode}`}
                      className="w-16 h-12 rounded-md object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono font-semibold text-[#B91C1C]">
                          {sub.itemCode}
                        </span>
                        {sub.status === 'reviewed' ? (
                          <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                            Skor {sub.rating}/4
                          </span>
                        ) : (
                          <span className="font-medium text-amber-700">Menunggu</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {sub.itemTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {sub.area} · {sub.picName}
                        {subPhotos.length > 1 ? ` · ${subPhotos.length} foto` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Right Inspection & Grading Panel */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
        {!activeSubmission ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Pilih salah satu kiriman foto di sebelah kiri untuk mulai menilai.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-[#B91C1C]">
                    {activeSubmission.itemCode}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSubmission.area}</span>
                  <span aria-hidden="true">·</span>
                  <span>PIC: {activeSubmission.picName}</span>
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
                  {activeSubmission.itemTitle}
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Kriteria Checklist: {activeSubmission.criteria}
                </p>
              </div>

              <div className="text-right text-xs">
                {activeSubmission.status === 'reviewed' ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Sudah Dinilai ({activeSubmission.rating}/4)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    Menunggu Penilaian
                  </span>
                )}
                <p className="font-mono text-slate-500 tabular-nums mt-0.5">
                  Dikirim:{' '}
                  {new Date(activeSubmission.submittedAt).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Photo Preview + Assessee Notes */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-7 space-y-2.5">
                <div className="relative rounded-lg border border-slate-200 bg-slate-950/5 overflow-hidden">
                  <ResilientImage
                    src={currentPhoto}
                    alt={`Bukti foto ${safePhotoIndex + 1} ${activeSubmission.itemCode} oleh ${activeSubmission.picName}`}
                    className="w-full h-72 object-cover"
                  />
                  {activePhotos.length > 0 && (
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-mono font-medium text-white bg-slate-900/80 rounded-lg tabular-nums">
                      Foto {safePhotoIndex + 1} dari {activePhotos.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setZoomOpen(true)}
                    aria-label="Perbesar foto bukti"
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900/80 rounded-lg hover:bg-slate-900 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                    Perbesar Foto
                  </button>
                </div>

                {activePhotos.length > 1 && (
                  <div
                    className="grid grid-cols-4 sm:grid-cols-5 gap-2"
                    aria-label="Galeri foto bukti kiriman"
                  >
                    {activePhotos.map((src, idx) => {
                      const active = idx === safePhotoIndex;
                      return (
                        <button
                          key={`${activeSubmission.id}-thumb-${idx}`}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          aria-label={`Pilih foto ${idx + 1} dari ${activePhotos.length}`}
                          aria-pressed={active}
                          className={`relative rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                            active
                              ? 'border-[#B91C1C] ring-1 ring-[#B91C1C]'
                              : 'border-slate-200 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <ResilientImage
                            src={src}
                            alt={`Thumbnail foto ${idx + 1}`}
                            className="w-full h-14 object-cover"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white bg-slate-900/75 rounded tabular-nums">
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="md:col-span-5 space-y-3">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Catatan Yang Dinilai (PIC Lapangan)
                  </span>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {activeSubmission.assesseeNotes}
                  </p>
                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                    <span>Klaim Kondisi Awal (Exist?)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {activeSubmission.assesseeExistClaim === 'Y' ? 'Ya (Y)' : 'Tidak (N)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Assessor Scoring & Feedback Form */}
            <form
              onSubmit={handleSaveEvaluation}
              className="border-t border-slate-200 pt-5 space-y-5"
              noValidate
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="evaluator-name"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Nama Penilai / Auditor HSE
                  </label>
                  <input
                    id="evaluator-name"
                    type="text"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    placeholder="Nama Auditor HSE"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium text-slate-800 mb-1.5">
                    Exist? (Ketersediaan / Penerapan Standar)
                  </span>
                  <div className="inline-flex w-full p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setExist('Y')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        exist === 'Y'
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Y — Ya (Ada & Sesuai)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExist('N')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        exist === 'N'
                          ? 'bg-white text-red-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      N — Tidak Ada
                    </button>
                  </div>
                </div>
              </div>

              {/* Rating 0-4 Rubric */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-800">
                  Skor Penilaian (Rating 0 – 4)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {RATING_RUBRIC.map((item) => {
                    const selected = rating === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setRating(item.value)}
                        aria-pressed={selected}
                        className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-mono text-sm font-semibold tabular-nums">
                          {item.label}
                        </div>
                        <div
                          className={`text-[11px] mt-1 leading-snug ${
                            selected ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {item.detail}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Evaluator Feedback */}
              <div className="space-y-1.5">
                <label
                  htmlFor="evaluator-feedback"
                  className="block text-sm font-medium text-slate-800"
                >
                  Feedback & Rekomendasi Penilai
                </label>
                <textarea
                  id="evaluator-feedback"
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tuliskan apresiasi, temuan ketidaksesuaian, atau instruksi tindak lanjut untuk PIC area..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                />
              </div>

              {evalError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {evalError}
                </div>
              )}

              {evalSuccess && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex flex-wrap items-center justify-between gap-3"
                >
                  <span>{evalSuccess}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewReport(activeSubmission)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100/60 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      Pratinjau Dokumen
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownloadReport(activeSubmission)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      Unduh Formulir Hasil
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                {activeSubmission.status === 'reviewed' && activeSubmission.reviewedAt ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      Terakhir dinilai oleh {activeSubmission.evaluatorName} ·{' '}
                      {new Date(activeSubmission.reviewedAt).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPreviewReport(activeSubmission)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 underline cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      Pratinjau
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownloadReport(activeSubmission)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#B91C1C] bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      Unduh Formulir Hasil
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isSaving ? 'Menyimpan Penilaian...' : 'Simpan Skor & Feedback'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Lightbox Zoom Modal */}
      {zoomOpen && activeSubmission && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto ukuran penuh"
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-900">
                {activeSubmission.itemCode} — {activeSubmission.itemTitle} ({activeSubmission.area})
                {activePhotos.length > 1
                  ? ` · Foto ${safePhotoIndex + 1}/${activePhotos.length}`
                  : ''}
              </span>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                aria-label="Tutup pratinjau foto"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-slate-950 flex items-center justify-center max-h-[80vh]">
              <ResilientImage
                src={currentPhoto}
                alt={`Foto besar ${safePhotoIndex + 1} ${activeSubmission.itemTitle}`}
                className="max-h-[80vh] w-auto object-contain"
              />
              {activePhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex(
                        (prev) => (prev - 1 + activePhotos.length) % activePhotos.length,
                      )
                    }
                    aria-label="Foto sebelumnya"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-slate-900 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex((prev) => (prev + 1) % activePhotos.length)
                    }
                    aria-label="Foto berikutnya"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-slate-900 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
