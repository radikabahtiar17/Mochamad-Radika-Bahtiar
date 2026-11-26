import { ArrowRight, CheckCircle2, Clock, Download, ShieldCheck } from 'lucide-react';
import {
  getSubmissionPhotos,
  type AssessmentSubmission,
  type ComplianceDashboardStats,
  type ComplianceTier,
} from '../utils/hse5s';
import { ResilientImage } from './ResilientImage';
import { SpilBrandLogo } from './SpilBrandLogo';

interface AssessorDashboardViewProps {
  stats: ComplianceDashboardStats;
  submissions: AssessmentSubmission[];
  wsConnected: boolean;
  onJumpToQueue: (submissionId?: string, appraisalKey?: string) => void;
  onJumpToChecklist: (area: string, picName?: string) => void;
  onDownloadAppraisalReport: (area: string, picName: string) => void;
  onDownloadSubmissionReport: (submission: AssessmentSubmission) => void;
}

function getTierColorClass(tier: ComplianceTier): string {
  switch (tier) {
    case 'Patuh':
      return 'text-emerald-700';
    case 'Perlu Perhatian':
      return 'text-amber-700';
    case 'Kritis':
      return 'text-red-700';
    default:
      return 'text-slate-500';
  }
}

function getBarColorClass(pct: number | null): string {
  if (pct === null) return 'bg-slate-300';
  if (pct >= 85) return 'bg-emerald-600';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-red-600';
}

export function AssessorDashboardView({
  stats,
  submissions,
  wsConnected,
  onJumpToQueue,
  onJumpToChecklist,
  onDownloadAppraisalReport,
  onDownloadSubmissionReport,
}: AssessorDashboardViewProps) {
  const recentSubmissions = [...submissions].slice(0, 6);
  const maxRatingBucket = Math.max(
    1,
    ...stats.ratingDistribution.map((item) => item.count),
  );

  return (
    <div className="space-y-8">
      {/* SPIL Operational Identity & HSE Instruments Banner */}
      <div className="relative rounded-xl border border-red-900/20 bg-gradient-to-br from-[#991B1B] via-[#B91C1C] to-[#7F1D1D] overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 flex flex-col justify-between gap-4 text-white">
            <div className="flex items-center gap-3.5">
              <SpilBrandLogo size="lg" variant="onDark" />
              <div>
                <p className="text-xs font-medium text-rose-100">
                  PT Salam Pacific Indonesia Lines · Pusat Kendali Audit HSE 5R
                </p>
                <h2 className="font-display text-xl font-bold text-white mt-0.5">
                  Instrumen Kepatuhan & Pengawasan Terminal, Depo, dan Kantor
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg bg-white/10 border border-white/20 px-3.5 py-2.5">
                <span className="text-[11px] text-rose-100 block">Ambang Target Patuh</span>
                <span className="font-display text-base font-semibold text-white tabular-nums">
                  ≥ 85.0%
                </span>
              </div>
              <div className="rounded-lg bg-white/10 border border-white/20 px-3.5 py-2.5">
                <span className="text-[11px] text-rose-100 block">Standar Penilaian</span>
                <span className="font-display text-base font-semibold text-white tabular-nums">
                  28 Item (S1–S5)
                </span>
              </div>
              <div className="rounded-lg bg-white/10 border border-white/20 px-3.5 py-2.5">
                <span className="text-[11px] text-rose-100 block">Profil Appraisal Aktif</span>
                <span className="font-display text-base font-semibold text-white tabular-nums">
                  {stats.appraisalStats.length} PIC · Lokasi
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[190px] lg:min-h-full">
            <ResilientImage
              src="/src/assets/images/spil_vessel_port_terminal_1795597334392.jpg"
              alt="Kapal kontainer SPIL bermuatan kontainer hijau di terminal pelabuhan"
              className="w-full h-full object-cover"
              fallbackTitle="Armada & Terminal SPIL"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#991B1B] via-[#991B1B]/30 to-transparent"
            />
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-[#7F1D1D]/95 border border-white/20 px-3 py-1.5 text-xs text-white shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              <span>{wsConnected ? 'Live Sync WebSocket Aktif' : 'Menghubungkan Sync...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Full-Width KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Skor Kepatuhan Total</span>
            <span className={`font-semibold ${getTierColorClass(stats.overallTier)}`}>
              {stats.overallTier}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-slate-900 tabular-nums">
              {stats.overallCompliancePct !== null
                ? `${stats.overallCompliancePct.toFixed(1)}%`
                : '0.0%'}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              (Avg {stats.averageRating !== null ? stats.averageRating.toFixed(2) : '0.00'}/4)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Antrean Menunggu Nilai</span>
            <span className="text-slate-500">
              {wsConnected ? 'Real-Time' : 'Sinkronisasi'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl font-semibold text-amber-700 tabular-nums">
              {stats.pendingCount}
            </span>
            <button
              type="button"
              onClick={() => onJumpToQueue()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
            >
              Nilai Sekarang
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <span className="text-xs text-slate-500 block">Total Bukti Terverifikasi</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-slate-900 tabular-nums">
              {stats.reviewedCount}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              dari {stats.totalSubmissions} kiriman
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <span className="text-xs text-slate-500 block">Area Kepatuhan Tertinggi</span>
          <div className="mt-2">
            {stats.topArea ? (
              <>
                <span className="font-display text-2xl font-semibold text-emerald-700 tabular-nums">
                  {stats.topArea.compliancePct?.toFixed(1)}%
                </span>
                <p className="text-xs text-slate-600 truncate mt-0.5">{stats.topArea.area}</p>
              </>
            ) : (
              <span className="text-sm text-slate-500">Belum ada area dinilai</span>
            )}
          </div>
        </div>
      </div>

      {/* Middle Section: 5R Pillar Compliance + Separated Appraisal Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 5R Pillar Breakdown + Rating Distribution Instrument */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Statistik Kepatuhan per Pilar 5R / 5S
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Akumulasi skor rata-rata dari seluruh foto yang telah diverifikasi penilai.
              </p>
            </div>

            <div className="space-y-4">
              {stats.pillarStats.map((pillar) => {
                const pct = pillar.compliancePct ?? 0;
                return (
                  <div key={pillar.code} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-medium text-slate-800 truncate">
                        <span className="font-mono font-semibold text-[#B91C1C] mr-1.5">
                          {pillar.code}
                        </span>
                        {pillar.englishName} ({pillar.indonesianName})
                      </span>
                      <span className="font-display font-semibold text-slate-900 tabular-nums shrink-0">
                        {pillar.compliancePct !== null
                          ? `${pillar.compliancePct.toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${getBarColorClass(
                          pillar.compliancePct,
                        )}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                      <span>
                        {pillar.reviewedCount} dinilai · {pillar.pendingCount} menunggu
                      </span>
                      <span>
                        Avg: {pillar.averageRating !== null ? `${pillar.averageRating.toFixed(2)}/4` : 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instrumen Distribusi Rating (0-4) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Distribusi Skor Rating Audit (0–4)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sebaran nilai hasil verifikasi auditor HSE di seluruh area SPIL.
              </p>
            </div>
            <div className="space-y-2.5">
              {stats.ratingDistribution.map((bucket) => {
                const barWidth = Math.round((bucket.count / maxRatingBucket) * 100);
                const barColor =
                  bucket.rating >= 3
                    ? 'bg-emerald-600'
                    : bucket.rating === 2
                      ? 'bg-amber-500'
                      : 'bg-red-600';
                return (
                  <div key={bucket.rating} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-4 font-mono font-medium text-slate-700 truncate">
                      {bucket.label}
                    </span>
                    <div className="col-span-6 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${bucket.count > 0 ? Math.max(8, barWidth) : 0}%` }}
                      />
                    </div>
                    <span className="col-span-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {bucket.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Separated Appraisal Table per Nama & Tempat */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Appraisal Terpisah per Nama & Tempat
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap individu dan lokasi memiliki skor kepatuhan serta rekap checklist terpisah
                meskipun dinilai oleh auditor yang sama.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">Yang Dinilai & Tempat</th>
                  <th className="py-2.5 px-3 font-medium text-right">Dinilai</th>
                  <th className="py-2.5 px-3 font-medium text-right">Antrean</th>
                  <th className="py-2.5 px-3 font-medium text-right">Kepatuhan</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.appraisalStats.map((appr) => (
                  <tr key={appr.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pr-3 min-w-[220px]">
                      <div className="font-semibold text-slate-900">{appr.picName}</div>
                      <div className="text-xs text-slate-500">{appr.area}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {appr.reviewedCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 font-medium">
                      {appr.pendingCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {appr.compliancePct !== null ? `${appr.compliancePct.toFixed(1)}%` : '—'}
                    </td>
                    <td className={`py-3 px-3 text-xs font-semibold ${getTierColorClass(appr.tier)}`}>
                      {appr.tier}
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onJumpToChecklist(appr.area, appr.picName)}
                        className="text-xs font-medium text-[#B91C1C] hover:underline mr-2.5 cursor-pointer"
                      >
                        Checklist
                      </button>
                      <button
                        type="button"
                        onClick={() => onJumpToQueue(undefined, appr.key)}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline mr-2.5 cursor-pointer"
                      >
                        Foto
                      </button>
                      {appr.reviewedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => onDownloadAppraisalReport(appr.area, appr.picName)}
                          aria-label={`Unduh formulir hasil ${appr.picName}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          <Download className="w-3 h-3" aria-hidden="true" />
                          Dokumen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Feed of Incoming & Evaluated Submissions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Aktivitas Penilaian Real-Time
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kiriman foto terbaru dari lapangan dan hasil penilaian auditor HSE.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onJumpToQueue()}
            className="text-xs font-semibold text-[#B91C1C] hover:underline whitespace-nowrap cursor-pointer"
          >
            Buka Semua Antrean
          </button>
        </div>

        {recentSubmissions.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">Belum ada kiriman foto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">Waktu</th>
                  <th className="py-2.5 px-3 font-medium">Kode</th>
                  <th className="py-2.5 px-3 font-medium">Item Measurement</th>
                  <th className="py-2.5 px-3 font-medium">Yang Dinilai · Tempat</th>
                  <th className="py-2.5 px-3 font-medium text-right">Foto</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Skor</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSubmissions.map((sub) => {
                  const photoCount = getSubmissionPhotos(sub).length;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(sub.submittedAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#B91C1C] whitespace-nowrap">
                        {sub.itemCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{sub.itemTitle}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">
                        {sub.picName} · {sub.area}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {photoCount}
                      </td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        {sub.status === 'reviewed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Sudah Dinilai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            Menunggu Nilai
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {sub.status === 'reviewed' ? `${sub.rating}/4` : '—'}
                      </td>
                      <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onJumpToQueue(sub.id)}
                          className="text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                        >
                          {sub.status === 'pending' ? 'Beri Skor' : 'Lihat Detail'}
                        </button>
                        {sub.status === 'reviewed' && (
                          <button
                            type="button"
                            onClick={() => onDownloadSubmissionReport(sub)}
                            aria-label={`Unduh hasil asesmen ${sub.itemCode}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline ml-3 cursor-pointer"
                          >
                            <Download className="w-3 h-3" aria-hidden="true" />
                            Unduh Hasil
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
