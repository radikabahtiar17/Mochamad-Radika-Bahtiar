import { useEffect, useState } from 'react';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { type PublicAssessorAccount } from '../utils/hse5s';
import { SpilBrandLogo } from './SpilBrandLogo';

export type AuthMode = 'accounts' | 'env' | 'configured' | 'unclaimed';

interface AssessorAuthModalProps {
  open: boolean;
  mode: AuthMode;
  hasEnvCode?: boolean;
  isAuthenticated: boolean;
  activeToken: string | null;
  activeUsername?: string | null;
  activeAssessorName?: string | null;
  onClose: () => void;
  onAuthenticated: (session: {
    token: string;
    assessorName: string;
    username?: string | null;
    mode: AuthMode;
  }) => void;
}

export function AssessorAuthModal({
  open,
  mode,
  hasEnvCode = false,
  isAuthenticated,
  activeToken,
  activeUsername,
  activeAssessorName,
  onClose,
  onAuthenticated,
}: AssessorAuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(
    mode === 'unclaimed' || isAuthenticated ? 'register' : 'login',
  );

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginDisplayName, setLoginDisplayName] = useState('Hendra Wijaya (HSE)');

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('');

  // Authenticated account list
  const [accounts, setAccounts] = useState<PublicAssessorAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStatusMessage(null);
    setConfirmDeleteId(null);
    if (isAuthenticated) {
      setTab('register');
    } else if (mode === 'unclaimed') {
      setTab('register');
    } else {
      setTab('login');
    }
  }, [open, mode, isAuthenticated]);

  const fetchAccounts = async () => {
    if (!isAuthenticated || !activeToken) return;
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/auth/accounts', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { accounts: PublicAssessorAccount[] };
        setAccounts(data.accounts || []);
      }
    } catch {
      // Ignore network hiccup on account list fetch
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (open && isAuthenticated && activeToken) {
      fetchAccounts();
    }
  }, [open, isAuthenticated, activeToken]);

  if (!open) return null;

  const isLegacyMode = mode === 'env' || mode === 'configured';
  const registrationRestricted =
    !isAuthenticated && mode !== 'unclaimed' && !hasEnvCode;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (mode === 'accounts' && !loginUsername.trim()) {
      setError('Masukkan username akun Penilai Anda.');
      return;
    }
    if (!loginPasscode) {
      setError('Masukkan kata sandi akun Penilai.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPasscode,
          assessorName: loginDisplayName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Username atau kata sandi Penilai tidak sesuai.');
      }
      setLoginPasscode('');
      onAuthenticated({
        token: data.token,
        assessorName: data.assessorName,
        username: data.username ?? null,
        mode: data.mode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (regFullName.trim().length < 2) {
      setError('Masukkan nama lengkap Auditor HSE minimal 2 karakter.');
      return;
    }
    if (regUsername.trim().length < 3) {
      setError('Masukkan username Penilai minimal 3 karakter.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Kata sandi akun Penilai minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isAuthenticated && activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: regFullName.trim(),
          username: regUsername.trim(),
          password: regPassword,
          inviteCode: regInviteCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat akun Penilai.');
      }

      setRegPassword('');
      setRegConfirmPassword('');
      setRegInviteCode('');

      if (data.createdBySession) {
        setRegFullName('');
        setRegUsername('');
        setStatusMessage(
          `Akun Penilai "${data.account.fullName}" (@${data.account.username}) berhasil dibuat.`,
        );
        await fetchAccounts();
      } else {
        setRegFullName('');
        setRegUsername('');
        onAuthenticated({
          token: data.token,
          assessorName: data.assessorName,
          username: data.username ?? null,
          mode: data.mode,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!activeToken) return;
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/auth/accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus akun Penilai.');
      }
      setConfirmDeleteId(null);
      setStatusMessage('Akun Penilai berhasil dihapus.');
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus akun Penilai.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessor-auth-title"
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#991B1B] to-[#B91C1C] px-5 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <SpilBrandLogo size="sm" variant="onDark" decorative />
            <div>
              <p className="text-[11px] font-medium text-rose-100">
                Proteksi Akun Penilai (Auditor HSE SPIL)
              </p>
              <h2 id="assessor-auth-title" className="font-display text-base font-bold">
                {isAuthenticated
                  ? 'Kelola & Buat Akun Penilai'
                  : mode === 'unclaimed'
                    ? 'Buat Akun Penilai Pertama'
                    : 'Masuk Akun Penilai'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog akun Penilai"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/90 hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {isAuthenticated && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-900 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 font-medium">
                <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                Sedang masuk sebagai <strong>{activeAssessorName}</strong>
                {activeUsername ? ` (@${activeUsername})` : ''}
              </span>
            </div>
          )}

          {!isAuthenticated && mode !== 'unclaimed' && (
            <div className="inline-flex w-full p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tab === 'login'
                    ? 'bg-white text-[#B91C1C] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tab === 'register'
                    ? 'bg-white text-[#B91C1C] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Buat Akun Penilai
              </button>
            </div>
          )}

          {!isAuthenticated && tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Hanya pemilik akun Penilai terdaftar yang dapat membuka menu Penilai, menilai foto,
                  dan mengubah item measurement.
                </span>
              </div>

              {mode === 'accounts' ? (
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Username Penilai
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Contoh: hendra.hse"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="login-display-name"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Nama Auditor HSE / Penilai
                  </label>
                  <input
                    id="login-display-name"
                    type="text"
                    value={loginDisplayName}
                    onChange={(e) => setLoginDisplayName(e.target.value)}
                    placeholder="Contoh: Hendra Wijaya (HSE)"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {isLegacyMode ? 'Kode Sandi Penilai' : 'Kata Sandi Akun Penilai'}
                </label>
                <div className="relative">
                  <KeyRound
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={loginPasscode}
                    onChange={(e) => setLoginPasscode(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                >
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  {isSubmitting ? 'Memverifikasi...' : 'Masuk Penilai'}
                </button>
              </div>
            </form>
          ) : registrationRestricted ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-1.5">
                <p className="font-semibold">Pendaftaran Akun Baru Terkunci</p>
                <p className="leading-relaxed">
                  Akun Penilai utama sudah aktif. Untuk menjaga keamanan agar Yang Dinilai tidak
                  dapat membuat akun sendiri, penambahan akun Penilai baru hanya dapat dilakukan
                  setelah Anda masuk menggunakan akun Penilai yang sudah terdaftar.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] cursor-pointer"
                >
                  Kembali ke Masuk Akun
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 flex items-start gap-2.5">
                  <UserPlus className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    {isAuthenticated
                      ? 'Tambahkan akun pribadi untuk rekan Auditor HSE lainnya agar setiap penilai masuk dengan kredensial masing-masing.'
                      : 'Buat akun pribadi khusus Auditor HSE agar hanya Anda yang memiliki username & kata sandi ini yang dapat mengakses menu Penilai.'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-fullname"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Nama Lengkap Auditor HSE
                    </label>
                    <input
                      id="reg-fullname"
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Hendra Wijaya (HSE)"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-username"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Username Penilai
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      autoComplete="username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="hendra.hse"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Kata Sandi (min. 6 karakter)
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-password-confirm"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Konfirmasi Kata Sandi
                    </label>
                    <input
                      id="reg-password-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                    />
                  </div>
                </div>

                {!isAuthenticated && hasEnvCode && (
                  <div>
                    <label
                      htmlFor="reg-invite-code"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Kode Undangan Penilai
                    </label>
                    <input
                      id="reg-invite-code"
                      type="password"
                      value={regInviteCode}
                      onChange={(e) => setRegInviteCode(e.target.value)}
                      placeholder="Masukkan kode undangan Penilai..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                    />
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                  >
                    {error}
                  </div>
                )}

                {statusMessage && (
                  <div
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900"
                  >
                    {statusMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    {isAuthenticated ? 'Tutup' : 'Batal'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] disabled:opacity-50 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    {isSubmitting
                      ? 'Menyimpan...'
                      : isAuthenticated
                        ? 'Tambah Akun Penilai'
                        : 'Buat Akun & Masuk Penilai'}
                  </button>
                </div>
              </form>

              {isAuthenticated && (
                <div className="border-t border-slate-200 pt-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#B91C1C]" aria-hidden="true" />
                      Daftar Akun Penilai Terdaftar ({accounts.length})
                    </span>
                    {loadingAccounts && <span className="text-slate-400 font-normal">Memuat...</span>}
                  </div>

                  {accounts.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Belum ada akun pribadi terdaftar. Tambahkan akun di atas agar setiap penilai
                      memiliki username dan kata sandi sendiri.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-44 overflow-y-auto">
                      {accounts.map((acc) => {
                        const isSelf = activeUsername === acc.username;
                        return (
                          <li
                            key={acc.id}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {acc.fullName}{' '}
                                {isSelf && (
                                  <span className="text-emerald-700 font-medium">(Anda)</span>
                                )}
                              </p>
                              <p className="font-mono text-[11px] text-slate-500">@{acc.username}</p>
                            </div>
                            {!isSelf && accounts.length > 1 && (
                              confirmDeleteId === acc.id ? (
                                <div className="inline-flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAccount(acc.id)}
                                    className="px-2 py-1 text-[11px] font-semibold text-white bg-red-700 rounded hover:bg-red-800 cursor-pointer"
                                  >
                                    Konfirmasi
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-[11px] text-slate-600 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(acc.id)}
                                  aria-label={`Hapus akun ${acc.username}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-red-700 border border-red-200 rounded hover:bg-red-50 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                                  Hapus
                                </button>
                              )
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
