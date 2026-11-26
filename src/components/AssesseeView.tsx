import { useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Images,
  Plus,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  PILLARS,
  filterSubmissionsByAppraisal,
  getAppraisalKey,
  getSubmissionPhotos,
  type AppraisalProfile,
  type AssessmentSubmission,
  type ExistValue,
  type MeasurementItem,
  validateSubmissionInput,
} from '../utils/hse5s';
import { compressImageFile } from '../utils/imageCompress';
import { CameraModal } from './CameraModal';
import { ResilientImage } from './ResilientImage';
import { SpilBrandLogo } from './SpilBrandLogo';

const MAX_PHOTOS_PER_SUBMISSION = 10;

interface AssesseeViewProps {
  areas: string[];
  profiles: AppraisalProfile[];
  activeProfileKey: string;
  items: MeasurementItem[];
  submissions: AssessmentSubmission[];
  preselectedItemId?: string;
  onSelectProfile: (key: string) => void;
  onCreateProfile: (payload: { picName: string; area: string }) => Promise<AppraisalProfile>;
  onSubmitEvidence: (payload: {
    area: string;
    picName: string;
    itemId: string;
    photoDataUrl: string;
    photoDataUrls: string[];
    assesseeNotes: string;
    assesseeExistClaim: ExistValue;
  }) => Promise<void>;
  onDownloadAssessment: (
    area: string,
    picName: string,
    focusedSubmission?: AssessmentSubmission | null,
  ) => void;
  onPreviewAssessment: (
    area: string,
    picName: string,
    focusedSubmission?: AssessmentSubmission | null,
  ) => void;
}

export function AssesseeView({
  areas,
  profiles,
  activeProfileKey,
  items,
  submissions,
  preselectedItemId,
  onSelectProfile,
  onCreateProfile,
  onSubmitEvidence,
  onDownloadAssessment,
  onPreviewAssessment,
}: AssesseeViewProps) {
  const activeProfile = useMemo(
    () =>
      profiles.find((p) => p.id === activeProfileKey) ||
      profiles[0] || {
        id: getAppraisalKey('Rina Kusuma', areas[0] || 'Kantor Pusat SPIL'),
        picName: 'Rina Kusuma',
        area: areas[0] || 'Kantor Pusat SPIL',
      },
    [profiles, activeProfileKey, areas],
  );

  const [showNewProfileForm, setShowNewProfileForm] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState('');
  const [newProfileAreaMode, setNewProfileAreaMode] = useState<'existing' | 'custom'>('existing');
  const [newProfileAreaSelect, setNewProfileAreaSelect] = useState(areas[0] || '');
  const [newProfileAreaCustom, setNewProfileAreaCustom] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId || items[0]?.id || '');
  const [existClaim, setExistClaim] = useState<ExistValue>('Y');
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [assesseeNotes, setAssesseeNotes] = useState('');

  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'reviewed'>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeItem = items.find((i) => i.id === selectedItemId) || items[0];

  // Strict isolation: only show submissions belonging to active (picName, area)
  const myAppraisalSubmissions = useMemo(
    () => filterSubmissionsByAppraisal(submissions, activeProfile.picName, activeProfile.area),
    [submissions, activeProfile.picName, activeProfile.area],
  );

  const filteredSubmissions = myAppraisalSubmissions.filter((sub) => {
    if (historyFilter !== 'all' && sub.status !== historyFilter) return false;
    return true;
  });

  const pendingCount = myAppraisalSubmissions.filter((s) => s.status === 'pending').length;
  const reviewedCount = myAppraisalSubmissions.filter((s) => s.status === 'reviewed').length;

  const appendCompressedFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      setFormError('Pilih berkas gambar dengan format JPG, PNG, atau WebP.');
      return;
    }

    const remainingSlots = MAX_PHOTOS_PER_SUBMISSION - photoDataUrls.length;
    if (remainingSlots <= 0) {
      setFormError(`Maksimal ${MAX_PHOTOS_PER_SUBMISSION} foto bukti per pengiriman.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setFormError(
      files.length > remainingSlots
        ? `Hanya ${remainingSlots} foto tambahan yang diproses (batas maksimal ${MAX_PHOTOS_PER_SUBMISSION} foto).`
        : null,
    );

    setIsCompressing(true);
    try {
      const compressed = await Promise.all(filesToProcess.map((f) => compressImageFile(f)));
      setPhotoDataUrls((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS_PER_SUBMISSION));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCameraCapture = (dataUrl: string) => {
    if (photoDataUrls.length >= MAX_PHOTOS_PER_SUBMISSION) {
      setFormError(`Maksimal ${MAX_PHOTOS_PER_SUBMISSION} foto bukti per pengiriman.`);
      return;
    }
    setPhotoDataUrls((prev) => [...prev, dataUrl]);
    setFormError(null);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotoDataUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateNewProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const pic = newProfilePic.trim();
    const area =
      newProfileAreaMode === 'custom' ? newProfileAreaCustom.trim() : newProfileAreaSelect.trim();

    if (pic.length < 2) {
      setProfileError('Masukkan nama Yang Dinilai (minimal 2 karakter).');
      return;
    }
    if (area.length < 3) {
      setProfileError('Pilih atau masukkan nama tempat / area (minimal 3 karakter).');
      return;
    }

    setIsCreatingProfile(true);
    try {
      const created = await onCreateProfile({ picName: pic, area });
      onSelectProfile(created.id);
      setNewProfilePic('');
      setNewProfileAreaCustom('');
      setShowNewProfileForm(false);
      setSubmitSuccess(null);
      setFormError(null);
      setPhotoDataUrls([]);
      setAssesseeNotes('');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Gagal membuat form appraisal baru.');
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitSuccess(null);

    const validation = validateSubmissionInput({
      area: activeProfile.area,
      picName: activeProfile.picName,
      itemId: selectedItemId,
      photoDataUrl: photoDataUrls[0],
      photoDataUrls,
      assesseeNotes,
    });

    if (!validation.valid) {
      setFormError(validation.error || 'Lengkapi seluruh data terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitEvidence({
        area: activeProfile.area,
        picName: activeProfile.picName,
        itemId: selectedItemId,
        photoDataUrl: photoDataUrls[0],
        photoDataUrls,
        assesseeNotes: assesseeNotes.trim(),
        assesseeExistClaim: existClaim,
      });
      const sentCount = photoDataUrls.length;
      setPhotoDataUrls([]);
      setAssesseeNotes('');
      setSubmitSuccess(
        `${sentCount} foto bukti untuk ${activeItem?.code} (${activeItem?.title}) berhasil dikirim atas nama ${activeProfile.picName}.`,
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengirim bukti penilaian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="assessee-heading" className="space-y-6">
      {/* SPIL Branded Hero Strip & 5R Instruments */}
      <div className="relative rounded-xl border border-red-900/20 bg-gradient-to-br from-[#991B1B] via-[#B91C1C] to-[#7F1D1D] overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-5 text-white">
            <div className="flex items-start gap-4">
              <SpilBrandLogo size="lg" variant="onDark" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-rose-100">
                  PT Salam Pacific Indonesia Lines · Menu 01 Yang Dinilai
                </p>
                <h1
                  id="assessee-heading"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance"
                >
                  Unggah Foto & Catatan HSE 5R / 5S
                </h1>
              </div>
            </div>

            <p className="text-sm text-slate-200 max-w-2xl leading-relaxed">
              Ambil atau unggah beberapa foto bukti lapangan sekaligus dalam satu item measurement,
              lengkapi catatan kondisi area, dan pantau hasil skor serta feedback auditor secara
              terpisah per Nama & Tempat.
            </p>

            {/* 5R Pillar Quick Instrument Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {PILLARS.map((p) => (
                <div
                  key={p.code}
                  className="rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-xs"
                >
                  <span className="font-mono font-semibold text-amber-300 block">{p.code}</span>
                  <span className="font-medium text-white block truncate">{p.indonesianName}</span>
                  <span className="text-[11px] text-slate-300 block truncate">
                    {p.japaneseName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[200px] lg:min-h-full">
            <ResilientImage
              src="/src/assets/images/spil_depo_green_containers_1795597332745.jpg"
              alt="Depo kontainer hijau resmi SPIL dengan marka keselamatan 5S dan strip merah SPIL"
              className="w-full h-full object-cover"
              fallbackTitle="Depo Kontainer SPIL"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#991B1B] via-[#991B1B]/30 to-transparent"
            />
            <div className="absolute bottom-3 right-3 flex items-center justify-end gap-4 rounded-lg bg-[#7F1D1D]/95 border border-white/20 px-4 py-2 text-white shadow-sm">
              <div>
                <span className="text-[11px] text-rose-100 block">Menunggu Nilai</span>
                <span className="font-display font-semibold text-amber-300 tabular-nums text-lg">
                  {pendingCount}
                </span>
              </div>
              <div className="h-7 w-px bg-white/25" aria-hidden="true" />
              <div>
                <span className="text-[11px] text-rose-100 block">Sudah Dinilai</span>
                <span className="font-display font-semibold text-emerald-300 tabular-nums text-lg">
                  {reviewedCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appraisal Profile Selector & Isolation Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[#B91C1C]">
              <UserCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block">
                Form Appraisal Aktif (Terpisah per Nama & Tempat)
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {activeProfile.picName}{' '}
                <span className="text-slate-400 font-normal mx-1">·</span>{' '}
                <span className="font-medium text-slate-700">{activeProfile.area}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="active-appraisal-profile"
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                Ganti Appraisal:
              </label>
              <select
                id="active-appraisal-profile"
                value={activeProfile.id}
                onChange={(e) => {
                  onSelectProfile(e.target.value);
                  setSubmitSuccess(null);
                  setFormError(null);
                }}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 max-w-xs"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.picName} — {p.area}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowNewProfileForm((prev) => !prev);
                setProfileError(null);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {showNewProfileForm ? 'Tutup Form Baru' : 'Appraisal Baru'}
            </button>
          </div>
        </div>

        {showNewProfileForm && (
          <form
            onSubmit={handleCreateNewProfile}
            className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
            noValidate
          >
            <div className="md:col-span-4">
              <label
                htmlFor="new-appraisal-pic"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nama Yang Dinilai (PIC)
              </label>
              <input
                id="new-appraisal-pic"
                type="text"
                value={newProfilePic}
                onChange={(e) => setNewProfilePic(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-5">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="new-appraisal-area"
                  className="block text-xs font-medium text-slate-700"
                >
                  Tempat / Area SPIL
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setNewProfileAreaMode((m) => (m === 'existing' ? 'custom' : 'existing'))
                  }
                  className="text-[11px] font-medium text-[#B91C1C] hover:underline cursor-pointer"
                >
                  {newProfileAreaMode === 'existing' ? '+ Ketik Tempat Baru' : 'Pilih Area Ada'}
                </button>
              </div>
              {newProfileAreaMode === 'existing' ? (
                <select
                  id="new-appraisal-area"
                  value={newProfileAreaSelect}
                  onChange={(e) => setNewProfileAreaSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                >
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="new-appraisal-area"
                  type="text"
                  value={newProfileAreaCustom}
                  onChange={(e) => setNewProfileAreaCustom(e.target.value)}
                  placeholder="Contoh: Depo Semarang - Ruang Admin"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              )}
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={isCreatingProfile}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isCreatingProfile ? 'Membuat...' : 'Buat & Buka Form'}
              </button>
            </div>

            {profileError && (
              <div
                role="alert"
                className="md:col-span-12 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
              >
                {profileError}
              </div>
            )}
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Multi-Photo Upload / Camera + Notes Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6"
          noValidate
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs">
            <div>
              <span className="text-slate-500 block">Nama Yang Dinilai (Terkunci ke Profil)</span>
              <span className="font-semibold text-slate-900 text-sm block mt-0.5">
                {activeProfile.picName}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Tempat / Lokasi Appraisal</span>
              <span className="font-semibold text-slate-900 text-sm block mt-0.5">
                {activeProfile.area}
              </span>
            </div>
          </div>

          {/* Measurement Item Selector */}
          <div className="space-y-2">
            <label htmlFor="measurement-item" className="block text-sm font-medium text-slate-800">
              Item Measurement 5R / 5S
            </label>
            <select
              id="measurement-item"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
            >
              {PILLARS.map((pillar) => {
                const groupItems = items.filter((i) => i.pillar === pillar.code);
                if (groupItems.length === 0) return null;
                return (
                  <optgroup
                    key={pillar.code}
                    label={`${pillar.code} · ${pillar.englishName} - ${pillar.japaneseName} (${pillar.indonesianName})`}
                  >
                    {groupItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.title}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {activeItem && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono font-semibold text-[#B91C1C]">{activeItem.code}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-slate-900">Kriteria:</span>
                <span>{activeItem.criteria}</span>
              </div>
            )}
          </div>

          {/* Multi-Photo Upload & Live Camera Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-medium text-slate-800 block">
                  Foto Bukti Kondisi Lapangan (Bisa Lebih dari 1 Foto)
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {photoDataUrls.length} / {MAX_PHOTOS_PER_SUBMISSION} foto terlampir
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  disabled={photoDataUrls.length >= MAX_PHOTOS_PER_SUBMISSION}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  {photoDataUrls.length > 0 ? 'Tambah via Kamera' : 'Buka Kamera'}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoDataUrls.length >= MAX_PHOTOS_PER_SUBMISSION}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  {photoDataUrls.length > 0 ? 'Tambah File Foto' : 'Unggah File'}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              aria-label="Pilih file foto bukti 5R"
              onChange={(e) => appendCompressedFiles(e.target.files)}
              className="sr-only"
            />

            {photoDataUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photoDataUrls.map((src, idx) => (
                  <div
                    key={`${idx}-${src.slice(0, 24)}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex flex-col"
                  >
                    <img
                      src={src}
                      alt={`Pratinjau foto bukti ${idx + 1}`}
                      className="w-full h-32 object-cover bg-slate-900/5"
                    />
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border-t border-slate-200 text-[11px]">
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        Foto #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        aria-label={`Hapus foto ${idx + 1}`}
                        className="inline-flex items-center gap-1 text-red-700 hover:underline font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                appendCompressedFiles(e.dataTransfer.files);
              }}
              className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-6 py-5 text-center space-y-1.5"
            >
              <p className="text-xs sm:text-sm font-medium text-slate-700">
                {isCompressing
                  ? 'Memproses foto...'
                  : photoDataUrls.length > 0
                    ? 'Seret beberapa foto lagi ke sini atau gunakan tombol di atas untuk menambah sudut pandang lain'
                    : 'Ambil beberapa foto melalui kamera atau seret banyak file gambar sekaligus ke sini'}
              </p>
              <p className="text-xs text-slate-500">
                Mendukung multi-foto (maks. {MAX_PHOTOS_PER_SUBMISSION} foto per item) untuk
                appraisal <strong className="text-slate-700">{activeProfile.picName}</strong>.
              </p>
            </div>
          </div>

          {/* Exist Self-Check */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-slate-100">
            <div>
              <span className="text-sm font-medium text-slate-800 block">
                Klaim Kondisi Awal (Exist?)
              </span>
              <span className="text-xs text-slate-500">
                Apakah standar item ini sudah tersedia di lapangan?
              </span>
            </div>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setExistClaim('Y')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  existClaim === 'Y'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ya (Sesuai)
              </button>
              <button
                type="button"
                onClick={() => setExistClaim('N')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  existClaim === 'N'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tidak (Temuan)
              </button>
            </div>
          </div>

          {/* Catatan di bawah foto */}
          <div className="space-y-1.5">
            <label htmlFor="assessee-notes" className="block text-sm font-medium text-slate-800">
              Catatan Lapangan (Di Bawah Foto)
            </label>
            <textarea
              id="assessee-notes"
              rows={4}
              value={assesseeNotes}
              onChange={(e) => setAssesseeNotes(e.target.value)}
              placeholder="Jelaskan kondisi lokasi pada foto-foto yang diunggah, tindakan pemilahan/penataan yang dilakukan, atau kendala yang ditemukan..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
            />
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {formError}
            </div>
          )}

          {submitSuccess && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            >
              {submitSuccess}
            </div>
          )}

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              {isSubmitting
                ? 'Mengirim Bukti...'
                : photoDataUrls.length > 1
                  ? `Kirim ${photoDataUrls.length} Foto Bukti`
                  : 'Kirim Bukti Penilaian'}
            </button>
          </div>
        </form>

        {/* Right Column: Strictly isolated history for activeProfile */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Riwayat Appraisal: {activeProfile.picName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hanya menampilkan kiriman dan feedback untuk{' '}
                <span className="font-medium text-slate-700">{activeProfile.area}</span>.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
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
                    onClick={() => setHistoryFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      historyFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {filteredSubmissions.length} item
              </span>
            </div>

            {reviewedCount > 0 ? (
              <div className="rounded-lg bg-red-50/70 border border-red-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
                <span className="text-xs text-[#991B1B] font-medium">
                  {reviewedCount} item telah dinilai · Dokumen hasil siap diunduh
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPreviewAssessment(activeProfile.area, activeProfile.picName)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    Pratinjau Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadAssessment(activeProfile.area, activeProfile.picName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Unduh Hasil Asesmen
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-500">
                Dokumen hasil asesmen akan aktif untuk diunduh setelah dinilai oleh Penilai.
              </div>
            )}
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Belum ada bukti penilaian untuk <strong>{activeProfile.picName}</strong> di{' '}
              <strong>{activeProfile.area}</strong>.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 max-h-[720px] overflow-y-auto pr-1">
              {filteredSubmissions.map((sub) => {
                const photos = getSubmissionPhotos(sub);
                return (
                  <li key={sub.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                    <div className="flex gap-3.5 items-start">
                      <ResilientImage
                        src={photos[0] || ''}
                        alt={`Foto ${sub.itemCode} ${sub.itemTitle}`}
                        className="w-20 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-700">
                            {sub.itemCode}
                            {photos.length > 1 && (
                              <span className="text-[#B91C1C] ml-1.5 font-sans font-medium">
                                · {photos.length} foto
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums">
                            {new Date(sub.submittedAt).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {sub.itemTitle}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {sub.area} · PIC: {sub.picName}
                        </p>
                      </div>
                    </div>

                    {photos.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <Images className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                        {photos.map((photoSrc, idx) => (
                          <ResilientImage
                            key={`${sub.id}-thumb-${idx}`}
                            src={photoSrc}
                            alt={`Lampiran ${idx + 1} ${sub.itemTitle}`}
                            className="w-12 h-9 rounded border border-slate-200 object-cover shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-700 leading-relaxed">{sub.assesseeNotes}</p>

                    {sub.status === 'reviewed' ? (
                      <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 px-3.5 py-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Sudah Dinilai · {sub.evaluatorName}
                          </span>
                          <span className="font-mono font-semibold text-slate-900 tabular-nums">
                            Exist: {sub.exist} · Skor: {sub.rating}/4
                          </span>
                        </div>
                        <p className="text-xs text-slate-800">{sub.evaluatorFeedback}</p>
                        <div className="pt-1.5 border-t border-emerald-200/80 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onPreviewAssessment(sub.area, sub.picName, sub)}
                            aria-label={`Pratinjau hasil ${sub.itemCode}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" aria-hidden="true" />
                            Pratinjau
                          </button>
                          <button
                            type="button"
                            onClick={() => onDownloadAssessment(sub.area, sub.picName, sub)}
                            aria-label={`Unduh dokumen asesmen ${sub.itemCode}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#B91C1C] rounded-md hover:bg-[#991B1B] cursor-pointer"
                          >
                            <Download className="w-3 h-3" aria-hidden="true" />
                            Unduh Hasil
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        Menunggu penilaian & feedback Auditor HSE
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
        onFallbackFilePick={() => fileInputRef.current?.click()}
      />
    </section>
  );
}
