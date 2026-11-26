import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssesseeView } from './components/AssesseeView';
import { AssessmentDocumentModal } from './components/AssessmentDocumentModal';
import { AssessorAuthModal, type AuthMode } from './components/AssessorAuthModal';
import { AssessorDashboardView } from './components/AssessorDashboardView';
import { AssessorQueueView } from './components/AssessorQueueView';
import { ChecklistMatrixView } from './components/ChecklistMatrixView';
import { MeasurementManagerView } from './components/MeasurementManagerView';
import { SpilBrandLogo } from './components/SpilBrandLogo';
import { TopBar, type AppView } from './components/TopBar';
import {
  calculateAreaChecklistSummary,
  calculateComplianceStats,
  generateChecklistCsv,
  generateOfficialAssessmentDocumentHtml,
  getAppraisalKey,
  type AppraisalProfile,
  type AreaChecklistSummary,
  type AssessmentSubmission,
  type ExistValue,
  type MeasurementItem,
  type PillarCode,
  type RatingValue,
  type StoreState,
} from './utils/hse5s';

type AssessorSubTab = 'dashboard' | 'queue';

function triggerFileDownload(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('assessee');
  const [assessorTab, setAssessorTab] = useState<AssessorSubTab>('dashboard');
  const [store, setStore] = useState<StoreState>({
    areas: [],
    profiles: [],
    items: [],
    submissions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Assessor access state (Bearer token stored strictly in React memory)
  const [authMode, setAuthMode] = useState<AuthMode>('unclaimed');
  const [hasEnvCode, setHasEnvCode] = useState(false);
  const [assessorToken, setAssessorToken] = useState<string | null>(null);
  const [assessorName, setAssessorName] = useState<string | null>(null);
  const [assessorUsername, setAssessorUsername] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState<AppView | null>(null);

  const [activeProfileKey, setActiveProfileKey] = useState<string>('');
  const [selectedChecklistArea, setSelectedChecklistArea] = useState<string>('');
  const [selectedChecklistPic, setSelectedChecklistPic] = useState<string>('ALL');
  const [queueTargetId, setQueueTargetId] = useState<string | undefined>(undefined);
  const [queueAppraisalFilter, setQueueAppraisalFilter] = useState<string | undefined>(undefined);
  const [uploadPresetItemId, setUploadPresetItemId] = useState<string | undefined>(undefined);

  const [docPreview, setDocPreview] = useState<{
    summary: AreaChecklistSummary;
    focusedSubmission?: AssessmentSubmission | null;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const isAssessorAuthenticated = Boolean(assessorToken);
  const effectiveView: AppView = isAssessorAuthenticated ? activeView : 'assessee';

  const fetchState = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [stateRes, authRes] = await Promise.all([
        fetch('/api/state'),
        fetch('/api/auth/status'),
      ]);
      if (!stateRes.ok) {
        throw new Error(`Gagal memuat data sistem (${stateRes.status}).`);
      }
      const data = (await stateRes.json()) as StoreState;
      setStore(data);
      setActiveProfileKey((prev) => prev || data.profiles[0]?.id || '');
      setSelectedChecklistArea((prev) => prev || data.areas[0] || '');

      if (authRes.ok) {
        const authData = (await authRes.json()) as {
          mode: AuthMode;
          hasEnvCode?: boolean;
        };
        setAuthMode(authData.mode);
        setHasEnvCode(Boolean(authData.hasEnvCode));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Real-time WebSocket sync with auto-reconnect
  useEffect(() => {
    let closedByCleanup = false;
    let reconnectTimer: number | undefined;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as { type: string; payload: unknown };
          if (msg.type === 'submission:created') {
            const sub = msg.payload as AssessmentSubmission;
            setStore((prev) => {
              if (prev.submissions.some((s) => s.id === sub.id)) return prev;
              return { ...prev, submissions: [sub, ...prev.submissions] };
            });
          } else if (msg.type === 'submission:evaluated') {
            const updated = msg.payload as AssessmentSubmission;
            setStore((prev) => ({
              ...prev,
              submissions: prev.submissions.map((s) => (s.id === updated.id ? updated : s)),
            }));
          } else if (msg.type === 'item:created') {
            const item = msg.payload as MeasurementItem;
            setStore((prev) => {
              if (prev.items.some((i) => i.id === item.id)) return prev;
              return { ...prev, items: [...prev.items, item] };
            });
          } else if (msg.type === 'item:updated') {
            const updated = msg.payload as MeasurementItem;
            setStore((prev) => ({
              ...prev,
              items: prev.items.map((i) => (i.id === updated.id ? updated : i)),
            }));
          } else if (msg.type === 'item:deleted') {
            const { id } = msg.payload as { id: string };
            setStore((prev) => ({
              ...prev,
              items: prev.items.filter((i) => i.id !== id),
            }));
          } else if (msg.type === 'area:created') {
            const area = msg.payload as string;
            setStore((prev) => {
              if (prev.areas.includes(area)) return prev;
              return { ...prev, areas: [...prev.areas, area] };
            });
          } else if (msg.type === 'profile:created') {
            const profile = msg.payload as AppraisalProfile;
            setStore((prev) => {
              if (prev.profiles.some((p) => p.id === profile.id)) return prev;
              return { ...prev, profiles: [...prev.profiles, profile] };
            });
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByCleanup) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const stats = useMemo(
    () =>
      calculateComplianceStats(store.items, store.submissions, store.areas, store.profiles),
    [store.items, store.submissions, store.areas, store.profiles],
  );

  const handleUnauthorized = useCallback(() => {
    setAssessorToken(null);
    setAssessorName(null);
    setAssessorUsername(null);
    setActiveView('assessee');
    setAuthModalOpen(true);
  }, []);

  const buildReportFilenameSlug = (area: string, picName?: string) => {
    const picSlug =
      picName && picName !== 'ALL' && picName !== 'Semua PIC'
        ? `-${picName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : '';
    const areaSlug = area.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${areaSlug}${picSlug}`;
  };

  const handleExportCsv = useCallback(
    (areaOverride?: string, picOverride?: string) => {
      const targetArea = areaOverride || selectedChecklistArea || store.areas[0];
      const targetPic = picOverride ?? selectedChecklistPic;
      if (!targetArea) return;
      const summary = calculateAreaChecklistSummary(
        store.items,
        store.submissions,
        targetArea,
        targetPic,
      );
      const csv = generateChecklistCsv(summary);
      triggerFileDownload(
        csv,
        'text/csv;charset=utf-8;',
        `spil-5s-checklist-${buildReportFilenameSlug(targetArea, targetPic)}.csv`,
      );
    },
    [selectedChecklistArea, selectedChecklistPic, store.areas, store.items, store.submissions],
  );

  const handleDownloadOfficialDocument = useCallback(
    (area: string, picName: string, focusedSubmission?: AssessmentSubmission | null) => {
      const summary = calculateAreaChecklistSummary(
        store.items,
        store.submissions,
        area,
        picName,
      );
      const html = generateOfficialAssessmentDocumentHtml(summary, {
        focusedSubmission,
      });
      triggerFileDownload(
        html,
        'text/html;charset=utf-8;',
        `formulir-hasil-5r-spil-${buildReportFilenameSlug(area, picName)}.html`,
      );
    },
    [store.items, store.submissions],
  );

  const handlePreviewOfficialDocument = useCallback(
    (area: string, picName: string, focusedSubmission?: AssessmentSubmission | null) => {
      const summary = calculateAreaChecklistSummary(
        store.items,
        store.submissions,
        area,
        picName,
      );
      setDocPreview({ summary, focusedSubmission });
    },
    [store.items, store.submissions],
  );

  const handleCreateProfile = async (payload: {
    picName: string;
    area: string;
  }): Promise<AppraisalProfile> => {
    const res = await fetch('/api/appraisals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal membuat form appraisal baru.');
    }
    const created = data as AppraisalProfile;
    setStore((prev) => {
      const nextAreas = prev.areas.includes(created.area)
        ? prev.areas
        : [...prev.areas, created.area];
      const nextProfiles = prev.profiles.some((p) => p.id === created.id)
        ? prev.profiles
        : [...prev.profiles, created];
      return { ...prev, areas: nextAreas, profiles: nextProfiles };
    });
    return created;
  };

  const handleSubmitEvidence = async (payload: {
    area: string;
    picName: string;
    itemId: string;
    photoDataUrl: string;
    photoDataUrls: string[];
    assesseeNotes: string;
    assesseeExistClaim: ExistValue;
  }) => {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal mengirim bukti penilaian.');
    }
    const created = data as AssessmentSubmission;
    const profileKey = getAppraisalKey(created.picName, created.area);
    setStore((prev) => {
      const nextAreas = prev.areas.includes(created.area)
        ? prev.areas
        : [...prev.areas, created.area];
      const nextProfiles = prev.profiles.some((p) => p.id === profileKey)
        ? prev.profiles
        : [
            ...prev.profiles,
            {
              id: profileKey,
              picName: created.picName,
              area: created.area,
              createdAt: created.submittedAt,
            },
          ];
      if (prev.submissions.some((s) => s.id === created.id)) {
        return { ...prev, areas: nextAreas, profiles: nextProfiles };
      }
      return {
        ...prev,
        areas: nextAreas,
        profiles: nextProfiles,
        submissions: [created, ...prev.submissions],
      };
    });
  };

  const handleEvaluateSubmission = async (
    id: string,
    payload: {
      evaluatorName: string;
      exist: ExistValue;
      rating: RatingValue;
      evaluatorFeedback: string;
    },
  ) => {
    const res = await fetch(`/api/submissions/${encodeURIComponent(id)}/evaluate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(assessorToken ? { Authorization: `Bearer ${assessorToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error(data.error || 'Sesi Penilai berakhir. Silakan masuk kembali.');
    }
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan penilaian.');
    }
    const updated = data as AssessmentSubmission;
    setStore((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleAddItem = async (payload: {
    pillar: PillarCode;
    title: string;
    criteria: string;
  }) => {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(assessorToken ? { Authorization: `Bearer ${assessorToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error(data.error || 'Sesi Penilai berakhir.');
    }
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menambahkan item measurement.');
    }
    const created = data as MeasurementItem;
    setStore((prev) =>
      prev.items.some((i) => i.id === created.id)
        ? prev
        : { ...prev, items: [...prev.items, created] },
    );
  };

  const handleUpdateItem = async (
    id: string,
    payload: {
      pillar: PillarCode;
      title: string;
      criteria: string;
    },
  ) => {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(assessorToken ? { Authorization: `Bearer ${assessorToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error(data.error || 'Sesi Penilai berakhir.');
    }
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui item measurement.');
    }
    const updated = data as MeasurementItem;
    setStore((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === updated.id ? updated : i)),
    }));
  };

  const handleDeleteItem = async (id: string) => {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: assessorToken ? { Authorization: `Bearer ${assessorToken}` } : {},
    });
    const data = await res.json();
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error(data.error || 'Sesi Penilai berakhir.');
    }
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menghapus item measurement.');
    }
    setStore((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  const handleOpenAssessorLogin = () => {
    setPendingTargetView('assessor');
    setAuthModalOpen(true);
  };

  const handleOpenManageAccounts = () => {
    setPendingTargetView(null);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (session: {
    token: string;
    assessorName: string;
    username?: string | null;
    mode: AuthMode;
  }) => {
    setAssessorToken(session.token);
    setAssessorName(session.assessorName);
    setAssessorUsername(session.username ?? null);
    setAuthMode(session.mode);
    setAuthModalOpen(false);
    setActiveView(pendingTargetView || 'assessor');
    setPendingTargetView(null);
    window.scrollTo({ top: 0 });
  };

  const handleLogoutAssessor = async () => {
    if (assessorToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${assessorToken}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    setAssessorToken(null);
    setAssessorName(null);
    setAssessorUsername(null);
    setDocPreview(null);
    setActiveView('assessee');
    window.scrollTo({ top: 0 });
  };

  const navigateTo = (view: AppView) => {
    if (view !== 'assessee' && !isAssessorAuthenticated) {
      setPendingTargetView(view);
      setAuthModalOpen(true);
      return;
    }
    setActiveView(view);
    window.scrollTo({ top: 0 });
  };

  const jumpToQueue = (submissionId?: string, appraisalKey?: string) => {
    if (!isAssessorAuthenticated) {
      setPendingTargetView('assessor');
      setAuthModalOpen(true);
      return;
    }
    setQueueTargetId(submissionId);
    setQueueAppraisalFilter(appraisalKey);
    setActiveView('assessor');
    setAssessorTab('queue');
    window.scrollTo({ top: 0 });
  };

  const jumpToChecklist = (area: string, picName?: string) => {
    if (!isAssessorAuthenticated) {
      setPendingTargetView('checklist');
      setAuthModalOpen(true);
      return;
    }
    setSelectedChecklistArea(area);
    setSelectedChecklistPic(picName || 'ALL');
    setActiveView('checklist');
    window.scrollTo({ top: 0 });
  };

  const startUploadForItem = (itemId: string, area: string, picName?: string) => {
    setUploadPresetItemId(itemId);
    if (picName) {
      const key = getAppraisalKey(picName, area);
      setActiveProfileKey(key);
    } else {
      const matching = store.profiles.find((p) => p.area === area);
      if (matching) setActiveProfileKey(matching.id);
    }
    setActiveView('assessee');
    window.scrollTo({ top: 0 });
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeView={effectiveView}
        isAssessorAuthenticated={isAssessorAuthenticated}
        assessorName={assessorName}
        assessorUsername={assessorUsername}
        onNavigate={navigateTo}
        onExportCsv={() => handleExportCsv()}
        onOpenAssessorLogin={handleOpenAssessorLogin}
        onOpenManageAccounts={handleOpenManageAccounts}
        onLogoutAssessor={handleLogoutAssessor}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-6" aria-busy="true" aria-label="Memuat data asesmen 5R">
            <div className="h-10 w-72 bg-slate-200 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 h-96 bg-white border border-slate-200 rounded-xl" />
              <div className="lg:col-span-5 h-96 bg-white border border-slate-200 rounded-xl" />
            </div>
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="max-w-lg mx-auto my-12 bg-white border border-red-200 rounded-xl p-6 text-center space-y-4"
          >
            <p className="text-sm font-semibold text-red-800">{loadError}</p>
            <button
              type="button"
              onClick={fetchState}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer"
            >
              Muat Ulang Data
            </button>
          </div>
        ) : effectiveView === 'assessee' ? (
          <AssesseeView
            areas={store.areas}
            profiles={store.profiles}
            activeProfileKey={activeProfileKey}
            items={store.items}
            submissions={store.submissions}
            preselectedItemId={uploadPresetItemId}
            onSelectProfile={setActiveProfileKey}
            onCreateProfile={handleCreateProfile}
            onSubmitEvidence={handleSubmitEvidence}
            onDownloadAssessment={(area, picName, focusedSubmission) =>
              handleDownloadOfficialDocument(area, picName, focusedSubmission)
            }
            onPreviewAssessment={(area, picName, focusedSubmission) =>
              handlePreviewOfficialDocument(area, picName, focusedSubmission)
            }
          />
        ) : effectiveView === 'assessor' ? (
          <section aria-labelledby="assessor-heading" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Menu 02 · Penilai (Auditor HSE SPIL)
                </p>
                <h1
                  id="assessor-heading"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1 text-balance"
                >
                  Dashboard Kepatuhan & Penilaian 5R / 5S
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  Monitor tingkat kepatuhan area SPIL secara real-time, periksa bukti foto
                  lapangan, berikan skor <span className="whitespace-nowrap">0–4</span> beserta
                  feedback perbaikan, dan unduh formulir hasil asesmen.
                </p>
              </div>

              {/* Sub-menu Tabs inside Penilai */}
              <div className="inline-flex flex-wrap items-center p-1 bg-slate-200/70 rounded-lg self-start sm:self-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setAssessorTab('dashboard')}
                  className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    assessorTab === 'dashboard'
                      ? 'bg-white text-[#B91C1C] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard Real-Time
                </button>
                <button
                  type="button"
                  onClick={() => setAssessorTab('queue')}
                  className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    assessorTab === 'queue'
                      ? 'bg-white text-[#B91C1C] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Antrean Foto ({stats.pendingCount})
                </button>
              </div>
            </div>

            {assessorTab === 'dashboard' ? (
              <AssessorDashboardView
                stats={stats}
                submissions={store.submissions}
                wsConnected={wsConnected}
                onJumpToQueue={jumpToQueue}
                onJumpToChecklist={jumpToChecklist}
                onDownloadAppraisalReport={(area, picName) =>
                  handleDownloadOfficialDocument(area, picName)
                }
                onDownloadSubmissionReport={(sub) =>
                  handleDownloadOfficialDocument(sub.area, sub.picName, sub)
                }
              />
            ) : (
              <AssessorQueueView
                profiles={store.profiles}
                submissions={store.submissions}
                initialSelectedId={queueTargetId}
                initialAppraisalFilter={queueAppraisalFilter}
                defaultEvaluatorName={assessorName}
                onEvaluateSubmission={handleEvaluateSubmission}
                onDownloadReport={(sub) =>
                  handleDownloadOfficialDocument(sub.area, sub.picName, sub)
                }
                onPreviewReport={(sub) =>
                  handlePreviewOfficialDocument(sub.area, sub.picName, sub)
                }
              />
            )}
          </section>
        ) : effectiveView === 'checklist' ? (
          <ChecklistMatrixView
            areas={store.areas}
            profiles={store.profiles}
            items={store.items}
            submissions={store.submissions}
            selectedArea={selectedChecklistArea || store.areas[0] || ''}
            selectedPic={selectedChecklistPic}
            onSelectArea={setSelectedChecklistArea}
            onSelectPic={setSelectedChecklistPic}
            onExportCsv={handleExportCsv}
            onDownloadDocument={(area, picName) => handleDownloadOfficialDocument(area, picName)}
            onPreviewDocument={(area, picName) => handlePreviewOfficialDocument(area, picName)}
            onOpenSubmissionInQueue={(subId) => jumpToQueue(subId)}
            onStartUploadForItem={startUploadForItem}
          />
        ) : (
          <MeasurementManagerView
            items={store.items}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="inline-flex items-center gap-2.5">
            <SpilBrandLogo size="sm" decorative />
            <span>PT Salam Pacific Indonesia Lines · Portal Asesmen HSE 5R / 5S</span>
          </div>
          <span>Standar Audit: S1 Ringkas · S2 Rapi · S3 Resik · S4 Rawat · S5 Rajin</span>
        </div>
      </footer>

      <AssessorAuthModal
        open={authModalOpen}
        mode={authMode}
        hasEnvCode={hasEnvCode}
        isAuthenticated={isAssessorAuthenticated}
        activeToken={assessorToken}
        activeUsername={assessorUsername}
        activeAssessorName={assessorName}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingTargetView(null);
        }}
        onAuthenticated={handleAuthenticated}
      />

      <AssessmentDocumentModal
        open={Boolean(docPreview)}
        summary={docPreview?.summary ?? null}
        focusedSubmission={docPreview?.focusedSubmission ?? null}
        onClose={() => setDocPreview(null)}
        onDownloadHtml={() => {
          if (!docPreview) return;
          handleDownloadOfficialDocument(
            docPreview.summary.area,
            docPreview.summary.picName,
            docPreview.focusedSubmission,
          );
        }}
        onDownloadCsv={() => {
          if (!docPreview) return;
          handleExportCsv(docPreview.summary.area, docPreview.summary.picName);
        }}
      />
    </div>
  );
}
