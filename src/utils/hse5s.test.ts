import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_AREAS,
  DEFAULT_MEASUREMENT_ITEMS,
  calculateAreaChecklistSummary,
  calculateComplianceStats,
  filterSubmissionsByAppraisal,
  generateChecklistCsv,
  generateOfficialAssessmentDocumentHtml,
  getAppraisalKey,
  getComplianceTier,
  getSubmissionPhotos,
  normalizeUsername,
  validateAssessorAccountInput,
  validateEvaluationInput,
  validateMeasurementItemInput,
  validateSubmissionInput,
  type AssessmentSubmission,
} from './hse5s';

test('DEFAULT_MEASUREMENT_ITEMS contains all 28 Excel checklist items across S1-S5', () => {
  assert.equal(DEFAULT_MEASUREMENT_ITEMS.length, 28);
  const byPillar = (p: string) => DEFAULT_MEASUREMENT_ITEMS.filter((i) => i.pillar === p).length;
  assert.equal(byPillar('S1'), 5);
  assert.equal(byPillar('S2'), 7);
  assert.equal(byPillar('S3'), 8);
  assert.equal(byPillar('S4'), 5);
  assert.equal(byPillar('S5'), 3);
});

test('getComplianceTier classifies thresholds accurately', () => {
  assert.equal(getComplianceTier(null), 'Belum Ada Data');
  assert.equal(getComplianceTier(90), 'Patuh');
  assert.equal(getComplianceTier(85), 'Patuh');
  assert.equal(getComplianceTier(84.9), 'Perlu Perhatian');
  assert.equal(getComplianceTier(70), 'Perlu Perhatian');
  assert.equal(getComplianceTier(69.9), 'Kritis');
});

test('calculateComplianceStats computes overall, pillar, area, ratingDistribution, and isolated appraisalStats', () => {
  const sampleSubs: AssessmentSubmission[] = [
    {
      id: 'sub-1',
      area: 'Area A',
      picName: 'Budi',
      itemId: 'item-1',
      itemCode: 'S1-01',
      pillar: 'S1',
      itemTitle: 'Cabinets and shelves',
      criteria: 'No irrelevant materials',
      photoDataUrl: '/img1.jpg',
      photoDataUrls: ['/img1.jpg', '/img1b.jpg'],
      assesseeNotes: 'Sudah dirapikan',
      assesseeExistClaim: 'Y',
      submittedAt: '2026-11-24T08:00:00Z',
      status: 'reviewed',
      evaluatorName: 'Andi HSE',
      exist: 'Y',
      rating: 4,
      evaluatorFeedback: 'Sangat rapi',
      reviewedAt: '2026-11-24T09:00:00Z',
    },
    {
      id: 'sub-2',
      area: 'Area A',
      picName: 'Ani',
      itemId: 'item-1',
      itemCode: 'S1-01',
      pillar: 'S1',
      itemTitle: 'Cabinets and shelves',
      criteria: 'No irrelevant materials',
      photoDataUrl: '/img2.jpg',
      assesseeNotes: 'Masih ada berkas lama',
      assesseeExistClaim: 'Y',
      submittedAt: '2026-11-24T08:10:00Z',
      status: 'reviewed',
      evaluatorName: 'Andi HSE',
      exist: 'Y',
      rating: 2,
      evaluatorFeedback: 'Segera arsipkan berkas tahun lalu',
      reviewedAt: '2026-11-24T09:15:00Z',
    },
    {
      id: 'sub-3',
      area: 'Area B',
      picName: 'Siti',
      itemId: 'item-13',
      itemCode: 'S3-01',
      pillar: 'S3',
      itemTitle: 'Floor',
      criteria: 'Clean floor',
      photoDataUrl: '/img3.jpg',
      assesseeNotes: 'Menunggu verifikasi',
      assesseeExistClaim: 'Y',
      submittedAt: '2026-11-24T10:00:00Z',
      status: 'pending',
    },
  ];

  assert.deepEqual(getSubmissionPhotos(sampleSubs[0]), ['/img1.jpg', '/img1b.jpg']);
  assert.deepEqual(getSubmissionPhotos(sampleSubs[1]), ['/img2.jpg']);

  const stats = calculateComplianceStats(DEFAULT_MEASUREMENT_ITEMS, sampleSubs, ['Area A', 'Area B']);
  assert.equal(stats.totalSubmissions, 3);
  assert.equal(stats.reviewedCount, 2);
  assert.equal(stats.pendingCount, 1);
  // (4 + 2) / (2 * 4) = 6 / 8 = 75.0%
  assert.equal(stats.overallCompliancePct, 75);
  assert.equal(stats.appraisalStats.length, 3);
  assert.equal(stats.ratingDistribution.find((r) => r.rating === 4)?.count, 1);
  assert.equal(stats.ratingDistribution.find((r) => r.rating === 2)?.count, 1);

  const budiStat = stats.appraisalStats.find((a) => a.key === getAppraisalKey('Budi', 'Area A'));
  const aniStat = stats.appraisalStats.find((a) => a.key === getAppraisalKey('Ani', 'Area A'));
  assert.equal(budiStat?.compliancePct, 100);
  assert.equal(aniStat?.compliancePct, 50);

  // Even with same area & same assessor, Budi and Ani checklists stay completely isolated
  const budiSubs = filterSubmissionsByAppraisal(sampleSubs, 'Budi', 'Area A');
  const aniSubs = filterSubmissionsByAppraisal(sampleSubs, 'Ani', 'Area A');
  assert.equal(budiSubs.length, 1);
  assert.equal(aniSubs.length, 1);
  assert.equal(budiSubs[0].id, 'sub-1');
  assert.equal(aniSubs[0].id, 'sub-2');

  const budiChecklist = calculateAreaChecklistSummary(
    DEFAULT_MEASUREMENT_ITEMS,
    sampleSubs,
    'Area A',
    'Budi',
  );
  const aniChecklist = calculateAreaChecklistSummary(
    DEFAULT_MEASUREMENT_ITEMS,
    sampleSubs,
    'Area A',
    'Ani',
  );
  assert.equal(budiChecklist.totalPoints, 4);
  assert.equal(budiChecklist.evaluatedScorePct, 100);
  assert.equal(aniChecklist.totalPoints, 2);
  assert.equal(aniChecklist.evaluatedScorePct, 50);
});

test('calculateAreaChecklistSummary builds 28-item matrix and CSV export', () => {
  const subs: AssessmentSubmission[] = [
    {
      id: 'sub-1',
      area: DEFAULT_AREAS[0],
      picName: 'Rina',
      itemId: 'item-1',
      itemCode: 'S1-01',
      pillar: 'S1',
      itemTitle: 'Cabinets and shelves',
      criteria: 'No irrelevant materials',
      photoDataUrl: '/img1.jpg',
      assesseeNotes: 'Bersih',
      assesseeExistClaim: 'Y',
      submittedAt: '2026-11-24T08:00:00Z',
      status: 'reviewed',
      evaluatorName: 'Dewi Auditor',
      exist: 'Y',
      rating: 4,
      evaluatorFeedback: 'Mantap',
      reviewedAt: '2026-11-24T09:00:00Z',
    },
  ];

  const summary = calculateAreaChecklistSummary(
    DEFAULT_MEASUREMENT_ITEMS,
    subs,
    DEFAULT_AREAS[0],
    'Rina',
  );
  assert.equal(summary.rows.length, 28);
  assert.equal(summary.picName, 'Rina');
  assert.equal(summary.totalPoints, 4);
  assert.equal(summary.evaluatedItemsCount, 1);
  assert.equal(summary.evaluatedScorePct, 100);
  assert.equal(summary.lastAuditor, 'Dewi Auditor');

  const csv = generateChecklistCsv(summary);
  assert.ok(csv.includes('Yang Dinilai (PIC),Rina'));
  assert.ok(csv.includes('Cabinets and shelves'));
  assert.ok(csv.includes('100.0%'));
});

test('validation helpers support multi-photo arrays and reject invalid counts', () => {
  assert.equal(validateSubmissionInput({ area: '', picName: 'A', itemId: '1', photoDataUrls: ['x'], assesseeNotes: 'ok ok' }).valid, false);
  assert.equal(validateSubmissionInput({ area: 'Depo', picName: 'A', itemId: '1', photoDataUrls: [], assesseeNotes: 'ok ok' }).valid, false);
  assert.equal(validateSubmissionInput({ area: 'Depo', picName: 'A', itemId: '1', photoDataUrls: ['a', 'b', 'c'], assesseeNotes: 'Sudah rapi' }).valid, true);
  assert.equal(
    validateSubmissionInput({
      area: 'Depo',
      picName: 'A',
      itemId: '1',
      photoDataUrls: Array.from({ length: 11 }, (_, idx) => `p-${idx}`),
      assesseeNotes: 'Terlalu banyak',
    }).valid,
    false,
  );

  assert.equal(validateEvaluationInput({ evaluatorName: 'Auditor', exist: 'Y', rating: 5, evaluatorFeedback: 'Bagus' }).valid, false);
  assert.equal(validateEvaluationInput({ evaluatorName: 'Auditor', exist: 'Y', rating: 3, evaluatorFeedback: 'Bagus sekali' }).valid, true);

  assert.equal(validateMeasurementItemInput({ pillar: 'S1', title: 'A', criteria: 'Valid criteria' }).valid, false);
  assert.equal(validateMeasurementItemInput({ pillar: 'S9', title: 'Rak', criteria: 'Valid criteria' }).valid, false);
  assert.equal(validateMeasurementItemInput({ pillar: 'S2', title: 'Rak Alat', criteria: 'Tersusun rapi berlabel' }).valid, true);
});

test('generateOfficialAssessmentDocumentHtml formats SPIL document and escapes untrusted HTML', () => {
  const subs: AssessmentSubmission[] = [
    {
      id: 'sub-doc-1',
      area: 'Depo <script>alert(1)</script> Perak',
      picName: 'Budi Santoso',
      itemId: 'item-1',
      itemCode: 'S1-01',
      pillar: 'S1',
      itemTitle: 'Cabinets and shelves',
      criteria: 'No irrelevant materials',
      photoDataUrl: '/img1.jpg',
      assesseeNotes: 'Sudah dirapikan',
      assesseeExistClaim: 'Y',
      submittedAt: '2026-11-24T08:00:00Z',
      status: 'reviewed',
      evaluatorName: 'Hendra HSE',
      exist: 'Y',
      rating: 4,
      evaluatorFeedback: 'Sangat baik & <b>rapi</b>',
      reviewedAt: '2026-11-24T09:00:00Z',
    },
  ];
  const summary = calculateAreaChecklistSummary(
    DEFAULT_MEASUREMENT_ITEMS,
    subs,
    'Depo <script>alert(1)</script> Perak',
    'Budi Santoso',
  );
  const html = generateOfficialAssessmentDocumentHtml(summary, {
    focusedSubmission: subs[0],
    generatedAt: '2026-11-25T00:00:00Z',
  });
  assert.ok(html.includes('Formulir Hasil Asesmen HSE 5R / 5S'));
  assert.ok(html.includes('Budi Santoso'));
  assert.ok(html.includes('Hendra HSE'));
  assert.ok(html.includes('100.0%'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('validateAssessorAccountInput validates personal assessor account registration inputs', () => {
  assert.equal(normalizeUsername(' Hendra.HSE '), 'hendra.hse');
  assert.equal(
    validateAssessorAccountInput({ fullName: 'H', username: 'hendra', password: 'secret123' }).valid,
    false,
  );
  assert.equal(
    validateAssessorAccountInput({ fullName: 'Hendra HSE', username: 'a b', password: 'secret123' }).valid,
    false,
  );
  assert.equal(
    validateAssessorAccountInput({ fullName: 'Hendra HSE', username: 'hendra.hse', password: '12345' }).valid,
    false,
  );
  assert.equal(
    validateAssessorAccountInput({
      fullName: 'Hendra Wijaya',
      username: 'Hendra.HSE',
      password: 'spil-hse-2026',
    }).valid,
    true,
  );
});
