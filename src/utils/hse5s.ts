export type PillarCode = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export type ExistValue = 'Y' | 'N';

export type RatingValue = 0 | 1 | 2 | 3 | 4;

export type SubmissionStatus = 'pending' | 'reviewed';

export type ComplianceTier = 'Patuh' | 'Perlu Perhatian' | 'Kritis' | 'Belum Ada Data';

export interface PillarMeta {
  code: PillarCode;
  englishName: string;
  japaneseName: string;
  indonesianName: string;
  description: string;
}

export interface MeasurementItem {
  id: string;
  number: number;
  code: string;
  pillar: PillarCode;
  title: string;
  criteria: string;
  isCustom?: boolean;
}

export interface AssessmentSubmission {
  id: string;
  area: string;
  picName: string;
  itemId: string;
  itemCode: string;
  pillar: PillarCode;
  itemTitle: string;
  criteria: string;
  photoDataUrl: string;
  photoDataUrls?: string[];
  assesseeNotes: string;
  assesseeExistClaim: ExistValue;
  submittedAt: string;
  status: SubmissionStatus;
  evaluatorName?: string;
  exist?: ExistValue;
  rating?: RatingValue;
  evaluatorFeedback?: string;
  reviewedAt?: string;
}

export function getSubmissionPhotos(
  submission: Pick<AssessmentSubmission, 'photoDataUrl' | 'photoDataUrls'>,
): string[] {
  if (Array.isArray(submission.photoDataUrls) && submission.photoDataUrls.length > 0) {
    return submission.photoDataUrls.filter((p) => typeof p === 'string' && p.trim().length > 0);
  }
  if (typeof submission.photoDataUrl === 'string' && submission.photoDataUrl.trim().length > 0) {
    return [submission.photoDataUrl];
  }
  return [];
}

export interface AppraisalProfile {
  id: string;
  picName: string;
  area: string;
  createdAt?: string;
}

export interface AssessorCredential {
  salt: string;
  hash: string;
  assessorName?: string;
  updatedAt?: string;
}

export interface AssessorAccount {
  id: string;
  username: string;
  fullName: string;
  salt: string;
  hash: string;
  createdAt: string;
  createdBy?: string;
}

export interface PublicAssessorAccount {
  id: string;
  username: string;
  fullName: string;
  createdAt: string;
  createdBy?: string;
}

export interface StoreState {
  areas: string[];
  profiles: AppraisalProfile[];
  items: MeasurementItem[];
  submissions: AssessmentSubmission[];
  assessorCredential?: AssessorCredential;
  assessorAccounts?: AssessorAccount[];
}

export function getAppraisalKey(picName: string, area: string): string {
  return `${picName.trim().toLowerCase()}::${area.trim().toLowerCase()}`;
}

export function filterSubmissionsByAppraisal(
  submissions: AssessmentSubmission[],
  picName: string,
  area: string,
): AssessmentSubmission[] {
  const targetKey = getAppraisalKey(picName, area);
  return submissions.filter((s) => getAppraisalKey(s.picName, s.area) === targetKey);
}

export const PILLARS: PillarMeta[] = [
  {
    code: 'S1',
    englishName: 'Sort',
    japaneseName: 'SEIRI',
    indonesianName: 'Ringkas',
    description: 'Memisahkan dan menyingkirkan barang yang tidak diperlukan dari area kerja.',
  },
  {
    code: 'S2',
    englishName: 'Set in order',
    japaneseName: 'SEITON',
    indonesianName: 'Rapi',
    description: 'Menata peralatan, dokumen, dan perlengkapan keselamatan pada tempat tetap yang berlabel.',
  },
  {
    code: 'S3',
    englishName: 'Shine',
    japaneseName: 'SEISO',
    indonesianName: 'Resik',
    description: 'Menjaga kebersihan lantai, bangunan, furnitur, pencahayaan, ventilasi, dan tempat sampah.',
  },
  {
    code: 'S4',
    englishName: 'Standardize',
    japaneseName: 'SEIKETSU',
    indonesianName: 'Rawat',
    description: 'Membakukan prosedur visual, jadwal, tanggung jawab, dan audit rutin 5R/5S.',
  },
  {
    code: 'S5',
    englishName: 'Sustain',
    japaneseName: 'SHITSUKE',
    indonesianName: 'Rajin',
    description: 'Membudayakan disiplin 5R/5S melalui dokumentasi keberhasilan dan penghargaan.',
  },
];

export const RATING_RUBRIC: { value: RatingValue; label: string; detail: string }[] = [
  { value: 0, label: '0 - Kritis', detail: 'Tidak diterapkan / temuan mayor HSE' },
  { value: 1, label: '1 - Kurang', detail: 'Diterapkan minimal, banyak ketidaksesuaian' },
  { value: 2, label: '2 - Cukup', detail: 'Sebagian sesuai, butuh perbaikan segera' },
  { value: 3, label: '3 - Baik', detail: 'Sesuai standar operasional HSE SPIL' },
  { value: 4, label: '4 - Teladan', detail: 'Sangat baik, konsisten, dan terdokumentasi' },
];

export const DEFAULT_AREAS: string[] = [
  'Kantor Pusat SPIL - Operasional Lt. 3',
  'Depo Kontainer Perak - Tool & Safety Bay',
  'Gudang Logistik Kalianak - Aisle 4',
  'Terminal Dermaga - Ruang HSE & Briefing',
];

export const DEFAULT_MEASUREMENT_ITEMS: MeasurementItem[] = [
  // S1: Sort - SEIRI
  {
    id: 'item-1',
    number: 1,
    code: 'S1-01',
    pillar: 'S1',
    title: 'Cabinets and shelves',
    criteria: 'No irrelevant reference materials, documents, drawings, etc.',
  },
  {
    id: 'item-2',
    number: 2,
    code: 'S1-02',
    pillar: 'S1',
    title: 'Desks and tables',
    criteria: 'No irrelevant reference materials, documents, etc.',
  },
  {
    id: 'item-3',
    number: 3,
    code: 'S1-03',
    pillar: 'S1',
    title: 'Drawers',
    criteria: 'No excess pieces of equipment, documents, etc.',
  },
  {
    id: 'item-4',
    number: 4,
    code: 'S1-04',
    pillar: 'S1',
    title: 'Other storage area',
    criteria: 'Storage area is defined to store unneeded items and out-dated documents',
  },
  {
    id: 'item-5',
    number: 5,
    code: 'S1-05',
    pillar: 'S1',
    title: 'Standards for disposal',
    criteria: 'Standards for eliminating unnecessary items exist and are being followed',
  },

  // S2: Set in order - SEITON
  {
    id: 'item-6',
    number: 6,
    code: 'S2-01',
    pillar: 'S2',
    title: 'Desks, shelves & cabinets',
    criteria: 'Desks and cabinets are free of accumulations of papers and other objects',
  },
  {
    id: 'item-7',
    number: 7,
    code: 'S2-02',
    pillar: 'S2',
    title: 'Tools and equipment',
    criteria: 'All tools and equipment are stored in a fixed place',
  },
  {
    id: 'item-8',
    number: 8,
    code: 'S2-03',
    pillar: 'S2',
    title: 'Easy of take and return',
    criteria: 'Tools and equipment are well organized for ease of take and return',
  },
  {
    id: 'item-9',
    number: 9,
    code: 'S2-04',
    pillar: 'S2',
    title: 'Storage labels',
    criteria: 'Labeling of cabinets, shelves and files allows immediate identification',
  },
  {
    id: 'item-10',
    number: 10,
    code: 'S2-05',
    pillar: 'S2',
    title: 'Documents',
    criteria: 'Documents are filed in accordance with the Record Retention Guidelines',
  },
  {
    id: 'item-11',
    number: 11,
    code: 'S2-06',
    pillar: 'S2',
    title: 'Display areas',
    criteria: 'Displays are tidy, free of clutter, labeled and up-to-date',
  },
  {
    id: 'item-12',
    number: 12,
    code: 'S2-07',
    pillar: 'S2',
    title: 'Safety',
    criteria: 'Safety equipment easily accessible and in good condition',
  },

  // S3: Shine - SEISO
  {
    id: 'item-13',
    number: 13,
    code: 'S3-01',
    pillar: 'S3',
    title: 'Floor',
    criteria: 'The floor is kept clean and no signs of damage',
  },
  {
    id: 'item-14',
    number: 14,
    code: 'S3-02',
    pillar: 'S3',
    title: 'Building structure',
    criteria: 'Walls and ceilings are in good condition and free from dirt/dust',
  },
  {
    id: 'item-15',
    number: 15,
    code: 'S3-03',
    pillar: 'S3',
    title: 'Racks and cabinets',
    criteria: 'Racks and cabinets are kept clean and in good condition',
  },
  {
    id: 'item-16',
    number: 16,
    code: 'S3-04',
    pillar: 'S3',
    title: 'Equipment and tools',
    criteria: 'Equipment and tools are kept clean and in good condition',
  },
  {
    id: 'item-17',
    number: 17,
    code: 'S3-05',
    pillar: 'S3',
    title: 'Furniture',
    criteria: 'Desks, tables and other furniture are kept clean',
  },
  {
    id: 'item-18',
    number: 18,
    code: 'S3-06',
    pillar: 'S3',
    title: 'Lighting',
    criteria: 'Lighting is enough & the angle and intensity of illumination are appropriate',
  },
  {
    id: 'item-19',
    number: 19,
    code: 'S3-07',
    pillar: 'S3',
    title: 'Ventilation',
    criteria: 'Good movement of air exist through the room',
  },
  {
    id: 'item-20',
    number: 20,
    code: 'S3-08',
    pillar: 'S3',
    title: 'Trash containers',
    criteria: 'Trash containers are emptied on a regular basis',
  },

  // S4: Standardize - SEIKETSU
  {
    id: 'item-21',
    number: 21,
    code: 'S4-01',
    pillar: 'S4',
    title: 'Display boards',
    criteria: 'Visual controls and display boards are used and regularly updated',
  },
  {
    id: 'item-22',
    number: 22,
    code: 'S4-02',
    pillar: 'S4',
    title: 'Procedures',
    criteria: "Procedures for maintaining the first three S's are being displayed",
  },
  {
    id: 'item-23',
    number: 23,
    code: 'S4-03',
    pillar: 'S4',
    title: '5S documentation',
    criteria: '5S checklists, schedules and routines are defined and being used',
  },
  {
    id: 'item-24',
    number: 24,
    code: 'S4-04',
    pillar: 'S4',
    title: 'Responsibilities',
    criteria: 'Everyone knows his responsibilities, when and how',
  },
  {
    id: 'item-25',
    number: 25,
    code: 'S4-05',
    pillar: 'S4',
    title: 'Regular Audits',
    criteria: 'Regular audits are taking place using checklists and measures',
  },

  // S5: Sustain - SHITSUKE
  {
    id: 'item-26',
    number: 26,
    code: 'S5-01',
    pillar: 'S5',
    title: '5S System',
    criteria: '5S seems to be the way of life rather than just a routine',
  },
  {
    id: 'item-27',
    number: 27,
    code: 'S5-02',
    pillar: 'S5',
    title: 'Success stories',
    criteria: 'Success stories are being displayed (i.e. before and after pictures)',
  },
  {
    id: 'item-28',
    number: 28,
    code: 'S5-03',
    pillar: 'S5',
    title: 'Rewards and recognition',
    criteria: 'Rewards and recognition is part of the 5S system',
  },
];

export function getComplianceTier(percentage: number | null): ComplianceTier {
  if (percentage === null || Number.isNaN(percentage)) {
    return 'Belum Ada Data';
  }
  if (percentage >= 85) {
    return 'Patuh';
  }
  if (percentage >= 70) {
    return 'Perlu Perhatian';
  }
  return 'Kritis';
}

export interface PillarComplianceStat {
  code: PillarCode;
  englishName: string;
  japaneseName: string;
  indonesianName: string;
  itemCount: number;
  reviewedCount: number;
  pendingCount: number;
  averageRating: number | null;
  compliancePct: number | null;
}

export interface AreaComplianceStat {
  area: string;
  reviewedCount: number;
  pendingCount: number;
  totalPoints: number;
  maxEvaluatedPoints: number;
  compliancePct: number | null;
  tier: ComplianceTier;
  lastUpdatedAt: string | null;
}

export interface AppraisalComplianceStat {
  key: string;
  picName: string;
  area: string;
  totalSubmissions: number;
  reviewedCount: number;
  pendingCount: number;
  totalPoints: number;
  maxEvaluatedPoints: number;
  compliancePct: number | null;
  tier: ComplianceTier;
  lastUpdatedAt: string | null;
}

export interface RatingDistributionItem {
  rating: RatingValue;
  label: string;
  count: number;
}

export interface ComplianceDashboardStats {
  totalSubmissions: number;
  reviewedCount: number;
  pendingCount: number;
  overallCompliancePct: number | null;
  overallTier: ComplianceTier;
  averageRating: number | null;
  pillarStats: PillarComplianceStat[];
  areaStats: AreaComplianceStat[];
  appraisalStats: AppraisalComplianceStat[];
  ratingDistribution: RatingDistributionItem[];
  topArea: AreaComplianceStat | null;
}

export function calculateComplianceStats(
  items: MeasurementItem[],
  submissions: AssessmentSubmission[],
  areas: string[],
  profiles: AppraisalProfile[] = [],
): ComplianceDashboardStats {
  const reviewed = submissions.filter(
    (s) => s.status === 'reviewed' && typeof s.rating === 'number',
  );
  const pending = submissions.filter((s) => s.status === 'pending');

  const totalPoints = reviewed.reduce((acc, s) => acc + (s.rating ?? 0), 0);
  const maxPoints = reviewed.length * 4;
  const overallCompliancePct =
    reviewed.length > 0 ? Number(((totalPoints / maxPoints) * 100).toFixed(1)) : null;
  const averageRating =
    reviewed.length > 0 ? Number((totalPoints / reviewed.length).toFixed(2)) : null;

  const pillarStats: PillarComplianceStat[] = PILLARS.map((pillar) => {
    const pillarItems = items.filter((it) => it.pillar === pillar.code);
    const pillarReviewed = reviewed.filter((s) => s.pillar === pillar.code);
    const pillarPending = pending.filter((s) => s.pillar === pillar.code);
    const pts = pillarReviewed.reduce((acc, s) => acc + (s.rating ?? 0), 0);
    const maxP = pillarReviewed.length * 4;

    return {
      code: pillar.code,
      englishName: pillar.englishName,
      japaneseName: pillar.japaneseName,
      indonesianName: pillar.indonesianName,
      itemCount: pillarItems.length,
      reviewedCount: pillarReviewed.length,
      pendingCount: pillarPending.length,
      averageRating:
        pillarReviewed.length > 0 ? Number((pts / pillarReviewed.length).toFixed(2)) : null,
      compliancePct: pillarReviewed.length > 0 ? Number(((pts / maxP) * 100).toFixed(1)) : null,
    };
  });

  const allAreas = Array.from(new Set([...areas, ...submissions.map((s) => s.area)]));

  const areaStats: AreaComplianceStat[] = allAreas.map((area) => {
    const areaSubs = submissions.filter((s) => s.area === area);
    const areaReviewed = areaSubs.filter(
      (s) => s.status === 'reviewed' && typeof s.rating === 'number',
    );
    const areaPending = areaSubs.filter((s) => s.status === 'pending');

    // Use latest reviewed submission per item for fair checklist score in that area
    const latestReviewedByItem = new Map<string, AssessmentSubmission>();
    const sortedReviewed = [...areaReviewed].sort((a, b) =>
      (b.reviewedAt ?? b.submittedAt).localeCompare(a.reviewedAt ?? a.submittedAt),
    );
    for (const sub of sortedReviewed) {
      if (!latestReviewedByItem.has(sub.itemId)) {
        latestReviewedByItem.set(sub.itemId, sub);
      }
    }

    const uniqueReviewed = Array.from(latestReviewedByItem.values());
    const areaPts = uniqueReviewed.reduce((acc, s) => acc + (s.rating ?? 0), 0);
    const areaMaxPts = uniqueReviewed.length * 4;
    const compliancePct =
      uniqueReviewed.length > 0 ? Number(((areaPts / areaMaxPts) * 100).toFixed(1)) : null;

    const latestTs =
      areaSubs.length > 0
        ? [...areaSubs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0].submittedAt
        : null;

    return {
      area,
      reviewedCount: areaReviewed.length,
      pendingCount: areaPending.length,
      totalPoints: areaPts,
      maxEvaluatedPoints: areaMaxPts,
      compliancePct,
      tier: getComplianceTier(compliancePct),
      lastUpdatedAt: latestTs,
    };
  });

  // Build isolated per-(picName, area) appraisal stats so Si A and Si B never mix
  const profileMap = new Map<string, { picName: string; area: string }>();
  for (const p of profiles) {
    const key = getAppraisalKey(p.picName, p.area);
    if (!profileMap.has(key)) {
      profileMap.set(key, { picName: p.picName.trim(), area: p.area.trim() });
    }
  }
  for (const sub of submissions) {
    const key = getAppraisalKey(sub.picName, sub.area);
    if (!profileMap.has(key)) {
      profileMap.set(key, { picName: sub.picName.trim(), area: sub.area.trim() });
    }
  }

  const appraisalStats: AppraisalComplianceStat[] = Array.from(profileMap.entries()).map(
    ([key, owner]) => {
      const ownerSubs = submissions.filter(
        (s) => getAppraisalKey(s.picName, s.area) === key,
      );
      const ownerReviewed = ownerSubs.filter(
        (s) => s.status === 'reviewed' && typeof s.rating === 'number',
      );
      const ownerPending = ownerSubs.filter((s) => s.status === 'pending');

      const latestByItem = new Map<string, AssessmentSubmission>();
      const sortedReviewed = [...ownerReviewed].sort((a, b) =>
        (b.reviewedAt ?? b.submittedAt).localeCompare(a.reviewedAt ?? a.submittedAt),
      );
      for (const sub of sortedReviewed) {
        if (!latestByItem.has(sub.itemId)) {
          latestByItem.set(sub.itemId, sub);
        }
      }

      const uniqueReviewed = Array.from(latestByItem.values());
      const pts = uniqueReviewed.reduce((acc, s) => acc + (s.rating ?? 0), 0);
      const maxPts = uniqueReviewed.length * 4;
      const compliancePct =
        uniqueReviewed.length > 0 ? Number(((pts / maxPts) * 100).toFixed(1)) : null;

      const latestTs =
        ownerSubs.length > 0
          ? [...ownerSubs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0].submittedAt
          : null;

      return {
        key,
        picName: owner.picName,
        area: owner.area,
        totalSubmissions: ownerSubs.length,
        reviewedCount: ownerReviewed.length,
        pendingCount: ownerPending.length,
        totalPoints: pts,
        maxEvaluatedPoints: maxPts,
        compliancePct,
        tier: getComplianceTier(compliancePct),
        lastUpdatedAt: latestTs,
      };
    },
  );

  const ratingDistribution: RatingDistributionItem[] = ([4, 3, 2, 1, 0] as RatingValue[]).map(
    (val) => {
      const rubric = RATING_RUBRIC.find((r) => r.value === val);
      return {
        rating: val,
        label: rubric ? rubric.label : String(val),
        count: reviewed.filter((s) => s.rating === val).length,
      };
    },
  );

  const rankedAreas = areaStats
    .filter((a) => a.compliancePct !== null)
    .sort((a, b) => (b.compliancePct ?? 0) - (a.compliancePct ?? 0));

  return {
    totalSubmissions: submissions.length,
    reviewedCount: reviewed.length,
    pendingCount: pending.length,
    overallCompliancePct,
    overallTier: getComplianceTier(overallCompliancePct),
    averageRating,
    pillarStats,
    areaStats,
    appraisalStats,
    ratingDistribution,
    topArea: rankedAreas[0] ?? null,
  };
}

export interface ChecklistMatrixRow {
  item: MeasurementItem;
  latestSubmission: AssessmentSubmission | null;
  exist: ExistValue | '-';
  rating: RatingValue | null;
  comments: string;
  status: SubmissionStatus | 'unsubmitted';
}

export interface AreaChecklistSummary {
  area: string;
  picName: string;
  rows: ChecklistMatrixRow[];
  totalPoints: number;
  evaluatedItemsCount: number;
  totalChecklistItems: number;
  evaluatedScorePct: number;
  fullChecklistScorePct: number;
  lastAuditor: string;
  lastAuditDate: string | null;
}

export function calculateAreaChecklistSummary(
  items: MeasurementItem[],
  submissions: AssessmentSubmission[],
  area: string,
  picName?: string,
): AreaChecklistSummary {
  const normalizedPic = picName?.trim();
  const isSpecificPic = Boolean(normalizedPic && normalizedPic !== 'ALL');

  const areaSubs = submissions
    .filter((s) => {
      if (isSpecificPic && normalizedPic) {
        return getAppraisalKey(s.picName, s.area) === getAppraisalKey(normalizedPic, area);
      }
      return s.area === area;
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  let totalPoints = 0;
  let evaluatedItemsCount = 0;
  let lastAuditor = '-';
  let lastAuditDate: string | null = null;

  const rows: ChecklistMatrixRow[] = items.map((item) => {
    const itemSubs = areaSubs.filter((s) => s.itemId === item.id);
    const latestReviewed = itemSubs.find((s) => s.status === 'reviewed');
    const latestAny = latestReviewed ?? itemSubs[0] ?? null;

    if (latestReviewed && typeof latestReviewed.rating === 'number') {
      totalPoints += latestReviewed.rating;
      evaluatedItemsCount += 1;
      const revDate = latestReviewed.reviewedAt ?? latestReviewed.submittedAt;
      if (!lastAuditDate || revDate > lastAuditDate) {
        lastAuditDate = revDate;
        lastAuditor = latestReviewed.evaluatorName || '-';
      }
    }

    return {
      item,
      latestSubmission: latestAny,
      exist: latestReviewed?.exist ?? latestAny?.assesseeExistClaim ?? '-',
      rating: latestReviewed?.rating ?? null,
      comments: latestReviewed?.evaluatorFeedback || latestAny?.assesseeNotes || '',
      status: latestAny ? latestAny.status : 'unsubmitted',
    };
  });

  const evaluatedScorePct =
    evaluatedItemsCount > 0
      ? Number(((totalPoints / (evaluatedItemsCount * 4)) * 100).toFixed(1))
      : 0;

  const fullChecklistScorePct =
    items.length > 0 ? Number(((totalPoints / (items.length * 4)) * 100).toFixed(1)) : 0;

  return {
    area,
    picName: isSpecificPic && normalizedPic ? normalizedPic : 'Semua PIC',
    rows,
    totalPoints,
    evaluatedItemsCount,
    totalChecklistItems: items.length,
    evaluatedScorePct,
    fullChecklistScorePct,
    lastAuditor,
    lastAuditDate,
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSubmissionInput(input: {
  area?: string;
  picName?: string;
  itemId?: string;
  photoDataUrl?: string;
  photoDataUrls?: string[];
  assesseeNotes?: string;
}): ValidationResult {
  if (!input.area || !input.area.trim()) {
    return { valid: false, error: 'Pilih atau isi Area / Lokasi terlebih dahulu.' };
  }
  if (!input.picName || !input.picName.trim()) {
    return { valid: false, error: 'Masukkan nama PIC / Yang Dinilai.' };
  }
  if (!input.itemId || !input.itemId.trim()) {
    return { valid: false, error: 'Pilih item measurement 5R / 5S.' };
  }
  const photos =
    Array.isArray(input.photoDataUrls) && input.photoDataUrls.length > 0
      ? input.photoDataUrls.filter((p) => typeof p === 'string' && p.trim().length > 0)
      : input.photoDataUrl && input.photoDataUrl.trim()
        ? [input.photoDataUrl.trim()]
        : [];
  if (photos.length === 0) {
    return { valid: false, error: 'Minimal 1 foto bukti lapangan wajib diambil atau diunggah.' };
  }
  if (photos.length > 10) {
    return { valid: false, error: 'Maksimal 10 foto bukti per pengiriman.' };
  }
  if (!input.assesseeNotes || input.assesseeNotes.trim().length < 3) {
    return { valid: false, error: 'Tuliskan catatan lapangan minimal 3 karakter.' };
  }
  return { valid: true };
}

export function validateEvaluationInput(input: {
  evaluatorName?: string;
  exist?: string;
  rating?: unknown;
  evaluatorFeedback?: string;
}): ValidationResult {
  if (!input.evaluatorName || !input.evaluatorName.trim()) {
    return { valid: false, error: 'Masukkan nama Penilai / Auditor HSE.' };
  }
  if (input.exist !== 'Y' && input.exist !== 'N') {
    return { valid: false, error: 'Pilih status Exist? (Y atau N).' };
  }
  if (
    typeof input.rating !== 'number' ||
    !Number.isInteger(input.rating) ||
    input.rating < 0 ||
    input.rating > 4
  ) {
    return { valid: false, error: 'Rating harus berupa angka bulat antara 0 sampai 4.' };
  }
  if (!input.evaluatorFeedback || input.evaluatorFeedback.trim().length < 3) {
    return { valid: false, error: 'Berikan feedback penilai minimal 3 karakter.' };
  }
  return { valid: true };
}

export function validateMeasurementItemInput(input: {
  pillar?: string;
  title?: string;
  criteria?: string;
}): ValidationResult {
  const validPillars: PillarCode[] = ['S1', 'S2', 'S3', 'S4', 'S5'];
  if (!input.pillar || !validPillars.includes(input.pillar as PillarCode)) {
    return { valid: false, error: 'Kategori pilar 5R / 5S tidak valid.' };
  }
  if (!input.title || input.title.trim().length < 2) {
    return { valid: false, error: 'Nama checklist item minimal 2 karakter.' };
  }
  if (!input.criteria || input.criteria.trim().length < 4) {
    return { valid: false, error: 'Kriteria penilaian minimal 4 karakter.' };
  }
  return { valid: true };
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateAssessorAccountInput(input: {
  fullName?: string;
  username?: string;
  password?: string;
}): ValidationResult {
  const fullName = (input.fullName || '').trim();
  const username = normalizeUsername(input.username || '');
  const password = input.password || '';

  if (fullName.length < 2 || fullName.length > 80) {
    return { valid: false, error: 'Nama lengkap Auditor HSE harus 2–80 karakter.' };
  }
  if (username.length < 3 || username.length > 32) {
    return { valid: false, error: 'Username Penilai harus 3–32 karakter.' };
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      valid: false,
      error: 'Username hanya boleh menggunakan huruf kecil, angka, titik, garis bawah, atau tanda hubung.',
    };
  }
  if (password.length < 6 || password.length > 128) {
    return { valid: false, error: 'Kata sandi akun Penilai minimal 6 karakter.' };
  }
  return { valid: true };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateChecklistCsv(summary: AreaChecklistSummary): string {
  const headerLines = [
    `5S Checklist - ${summary.area}`,
    `Yang Dinilai (PIC),${escapeCsvCell(summary.picName)}`,
    `Auditor,${escapeCsvCell(summary.lastAuditor)}`,
    `Tanggal Audit,${escapeCsvCell(summary.lastAuditDate ? summary.lastAuditDate.slice(0, 10) : '-')}`,
    `Skor Item Dinilai,${summary.evaluatedScorePct.toFixed(1)}%`,
    `Skor Checklist Penuh (28 Item),${summary.fullChecklistScorePct.toFixed(1)}%`,
    '',
    'No,Code,Pillar,Checklist item,Criteria,Exist?,Rating,Comments',
  ];

  const rowLines = summary.rows.map((row) =>
    [
      row.item.number,
      escapeCsvCell(row.item.code),
      escapeCsvCell(row.item.pillar),
      escapeCsvCell(row.item.title),
      escapeCsvCell(row.item.criteria),
      escapeCsvCell(row.exist),
      row.rating !== null ? row.rating : '',
      escapeCsvCell(row.comments),
    ].join(','),
  );

  const footerLines = [
    `Total Points,,,,,,${summary.totalPoints},Evaluated Score: ${summary.evaluatedScorePct.toFixed(1)}%`,
  ];

  return [...headerLines, ...rowLines, ...footerLines].join('\n');
}

export function generateOfficialAssessmentDocumentHtml(
  summary: AreaChecklistSummary,
  options?: {
    focusedSubmission?: AssessmentSubmission | null;
    generatedAt?: string;
  },
): string {
  const tier = getComplianceTier(
    summary.evaluatedItemsCount > 0 ? summary.evaluatedScorePct : null,
  );
  const focused = options?.focusedSubmission ?? null;
  const auditDateDisplay = summary.lastAuditDate
    ? summary.lastAuditDate.slice(0, 10)
    : (options?.generatedAt ?? new Date().toISOString()).slice(0, 10);

  const focusedSection = focused
    ? `
    <section class="highlight-box">
      <div class="highlight-header">
        <strong>Ringkasan Penilaian Item Terakhir: ${escapeHtml(focused.itemCode)} — ${escapeHtml(focused.itemTitle)}</strong>
        <span class="score-pill">Skor: ${focused.rating ?? '-'}/4 · Exist: ${escapeHtml(focused.exist ?? '-')}</span>
      </div>
      <p class="criteria"><strong>Kriteria:</strong> ${escapeHtml(focused.criteria)}</p>
      <p class="notes"><strong>Catatan Lapangan (${escapeHtml(focused.picName)}):</strong> ${escapeHtml(focused.assesseeNotes)}</p>
      <p class="feedback"><strong>Feedback Auditor (${escapeHtml(focused.evaluatorName || summary.lastAuditor)}):</strong> ${escapeHtml(focused.evaluatorFeedback || '-')}</p>
    </section>
  `
    : '';

  const pillarSections = PILLARS.map((pillar) => {
    const pillarRows = summary.rows.filter((r) => r.item.pillar === pillar.code);
    if (pillarRows.length === 0) return '';
    const rowsHtml = pillarRows
      .map(
        (row) => `
      <tr>
        <td class="num">${row.item.number}</td>
        <td class="code">${escapeHtml(row.item.code)}</td>
        <td><strong>${escapeHtml(row.item.title)}</strong><div class="sub">${escapeHtml(row.item.criteria)}</div></td>
        <td class="center">${escapeHtml(row.exist)}</td>
        <td class="center bold">${row.rating !== null ? row.rating : '-'}</td>
        <td>${escapeHtml(row.comments || '-')}</td>
      </tr>
    `,
      )
      .join('');

    return `
      <tr class="pillar-row">
        <td colspan="6">${escapeHtml(pillar.code)} · ${escapeHtml(pillar.englishName)} – ${escapeHtml(pillar.japaneseName)} (${escapeHtml(pillar.indonesianName)})</td>
      </tr>
      ${rowsHtml}
    `;
  }).join('');

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Formulir Hasil Asesmen HSE 5R / 5S - ${escapeHtml(summary.picName)} (${escapeHtml(summary.area)})</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; padding: 28px; background: #f8fafc; font-size: 12px; line-height: 1.45; }
    .sheet { max-width: 960px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 28px; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b91c1c; padding-bottom: 14px; margin-bottom: 18px; gap: 16px; }
    .brand-tag { color: #b91c1c; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    h1 { margin: 4px 0 2px; font-size: 20px; color: #0f172a; }
    .subtitle { color: #475569; margin: 0; font-size: 12px; }
    .print-actions { text-align: right; }
    .btn-print { background: #b91c1c; color: #fff; border: none; border-radius: 6px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
    .meta-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; display: block; }
    .meta-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; display: block; }
    .meta-val.red { color: #b91c1c; }
    .highlight-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-bottom: 18px; }
    .highlight-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; color: #991b1b; }
    .score-pill { font-weight: 700; background: #fff; border: 1px solid #fca5a5; padding: 2px 8px; border-radius: 6px; }
    .highlight-box p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #b91c1c; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; }
    td { border: 1px solid #e2e8f0; padding: 7px 10px; vertical-align: top; }
    .pillar-row td { background: #f1f5f9; font-weight: 700; color: #991b1b; font-size: 11px; }
    .num { width: 32px; text-align: center; color: #64748b; }
    .code { width: 64px; font-family: Consolas, monospace; font-weight: 700; color: #b91c1c; }
    .center { text-align: center; width: 58px; }
    .bold { font-weight: 700; }
    .sub { font-size: 11px; color: #475569; margin-top: 2px; }
    .summary-row td { background: #fef2f2; font-weight: 700; font-size: 12px; color: #991b1b; }
    .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 28px; }
    .sig-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
    .sig-space { height: 56px; border-bottom: 1px dashed #94a3b8; margin: 12px 24px 8px; }
    .footer-note { margin-top: 16px; font-size: 10px; color: #64748b; text-align: center; }
    @media print {
      body { padding: 0; background: #fff; }
      .sheet { border: none; padding: 0; }
      .print-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="doc-header">
      <div>
        <div class="brand-tag">PT Salam Pacific Indonesia Lines · Dokumen Resmi HSE</div>
        <h1>Formulir Hasil Asesmen HSE 5R / 5S</h1>
        <p class="subtitle">Standar Audit S1 Ringkas · S2 Rapi · S3 Resik · S4 Rawat · S5 Rajin</p>
      </div>
      <div class="print-actions">
        <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF</button>
      </div>
    </header>

    <section class="meta-grid">
      <div class="meta-card">
        <span class="meta-label">Yang Dinilai (PIC)</span>
        <span class="meta-val red">${escapeHtml(summary.picName)}</span>
      </div>
      <div class="meta-card">
        <span class="meta-label">Tempat / Area</span>
        <span class="meta-val">${escapeHtml(summary.area)}</span>
      </div>
      <div class="meta-card">
        <span class="meta-label">Auditor HSE / Penilai</span>
        <span class="meta-val">${escapeHtml(summary.lastAuditor)}</span>
      </div>
      <div class="meta-card">
        <span class="meta-label">Skor & Status (${escapeHtml(auditDateDisplay)})</span>
        <span class="meta-val red">${summary.evaluatedScorePct.toFixed(1)}% · ${escapeHtml(tier)}</span>
      </div>
    </section>

    ${focusedSection}

    <table>
      <thead>
        <tr>
          <th class="center">No</th>
          <th>Kode</th>
          <th>Checklist Item &amp; Kriteria</th>
          <th class="center">Exist?</th>
          <th class="center">Rating</th>
          <th>Komentar &amp; Feedback Penilai</th>
        </tr>
      </thead>
      <tbody>
        ${pillarSections}
        <tr class="summary-row">
          <td colspan="4" style="text-align:right">Total Poin (${summary.evaluatedItemsCount} dari ${summary.totalChecklistItems} item dinilai)</td>
          <td class="center">${summary.totalPoints}</td>
          <td>Skor Item Dinilai: ${summary.evaluatedScorePct.toFixed(1)}% · Skor Checklist Penuh: ${summary.fullChecklistScorePct.toFixed(1)}%</td>
        </tr>
      </tbody>
    </table>

    <section class="signatures">
      <div class="sig-box">
        <div>Diperiksa &amp; Dinilai Oleh (Auditor HSE SPIL)</div>
        <div class="sig-space"></div>
        <strong>${escapeHtml(summary.lastAuditor)}</strong>
      </div>
      <div class="sig-box">
        <div>Diterima &amp; Ditindaklanjuti Oleh (PIC Area)</div>
        <div class="sig-space"></div>
        <strong>${escapeHtml(summary.picName)}</strong>
      </div>
    </section>

    <div class="footer-note">
      Dokumen ini diterbitkan oleh Portal Asesmen HSE 5R / 5S PT Salam Pacific Indonesia Lines pada ${escapeHtml(auditDateDisplay)}.
    </div>
  </div>
</body>
</html>`;
}
