import { Download, Lock, LogOut, Menu, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { SpilBrandLogo } from './SpilBrandLogo';

export type AppView = 'assessee' | 'assessor' | 'checklist' | 'measurements';

interface TopBarProps {
  activeView: AppView;
  isAssessorAuthenticated: boolean;
  assessorName?: string | null;
  assessorUsername?: string | null;
  onNavigate: (view: AppView) => void;
  onExportCsv: () => void;
  onOpenAssessorLogin: () => void;
  onOpenManageAccounts: () => void;
  onLogoutAssessor: () => void;
}

const ALL_NAV_ITEMS: { id: AppView; label: string; assessorOnly?: boolean }[] = [
  { id: 'assessee', label: 'Yang Dinilai' },
  { id: 'assessor', label: 'Penilai', assessorOnly: true },
  { id: 'checklist', label: 'Rekap Checklist', assessorOnly: true },
  { id: 'measurements', label: 'Measurement', assessorOnly: true },
];

export function TopBar({
  activeView,
  isAssessorAuthenticated,
  assessorName,
  assessorUsername,
  onNavigate,
  onExportCsv,
  onOpenAssessorLogin,
  onOpenManageAccounts,
  onLogoutAssessor,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNavItems = ALL_NAV_ITEMS.filter(
    (item) => !item.assessorOnly || isAssessorAuthenticated,
  );

  const handleSelect = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line Brand Wordmark with SPIL Emblem */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleSelect('assessee');
          }}
          className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-[#B91C1C] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B91C1C]"
        >
          <SpilBrandLogo size="sm" decorative />
          SPIL HSE 5R
        </a>

        {/* Zone 2: Navigation Links (Yang Dinilai only sees Yang Dinilai; Penilai sees full navigation) */}
        <nav aria-label="Navigasi Utama" className="hidden md:flex items-center gap-6">
          {visibleNavItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B91C1C] cursor-pointer ${
                  isActive
                    ? 'text-[#B91C1C]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B91C1C]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Assessor Auth Gate / Export Action + Mobile Drawer Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isAssessorAuthenticated ? (
            <>
              {assessorName && (
                <span className="hidden xl:inline text-xs font-medium text-slate-600 whitespace-nowrap">
                  Auditor: <strong className="text-slate-900">{assessorName}</strong>
                  {assessorUsername ? (
                    <span className="text-slate-400 font-mono ml-1">(@{assessorUsername})</span>
                  ) : null}
                </span>
              )}
              <button
                type="button"
                onClick={onOpenManageAccounts}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Akun Penilai
              </button>
              <button
                type="button"
                onClick={onExportCsv}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={onLogoutAssessor}
                aria-label="Keluar dari mode Penilai"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Keluar Penilai
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAssessorLogin}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              Masuk Penilai
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Navigasi Seluler"
          className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1"
        >
          {visibleNavItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 text-[#B91C1C] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {isAssessorAuthenticated ? (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onOpenManageAccounts();
                  setMobileMenuOpen(false);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                Akun Penilai
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportCsv();
                  setMobileMenuOpen(false);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogoutAssessor();
                  setMobileMenuOpen(false);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Keluar Penilai
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOpenAssessorLogin();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              Masuk Penilai
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
