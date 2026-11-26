import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { createSeedState } from './server/seed';
import {
  type AppraisalProfile,
  type AssessmentSubmission,
  type AssessorAccount,
  type MeasurementItem,
  type PillarCode,
  type PublicAssessorAccount,
  type StoreState,
  getAppraisalKey,
  normalizeUsername,
  validateAssessorAccountInput,
  validateEvaluationInput,
  validateMeasurementItemInput,
  validateSubmissionInput,
} from './src/utils/hse5s';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function loadStore(): StoreState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const seed = createSeedState();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as StoreState;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.submissions)) {
      throw new Error('Invalid store format');
    }
    if (!Array.isArray(parsed.profiles)) {
      const derived = new Map<string, AppraisalProfile>();
      for (const s of parsed.submissions) {
        const key = getAppraisalKey(s.picName, s.area);
        if (!derived.has(key)) {
          derived.set(key, {
            id: key,
            picName: s.picName.trim(),
            area: s.area.trim(),
            createdAt: s.submittedAt,
          });
        }
      }
      parsed.profiles = Array.from(derived.values());
    }
    if (!Array.isArray(parsed.assessorAccounts)) {
      parsed.assessorAccounts = [];
    }
    return parsed;
  } catch {
    const seed = createSeedState();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function saveStore(state: StoreState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

async function startServer() {
  let store: StoreState = loadStore();

  const app = express();
  app.use(express.json({ limit: '25mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcast(event: { type: string; payload: unknown }) {
    const message = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        type: 'sync:init',
        payload: {
          connectedClients: wss.clients.size,
          serverTime: new Date().toISOString(),
        },
      }),
    );
  });

  interface AssessorSession {
    accountId?: string;
    username?: string;
    assessorName: string;
    expiresAt: number;
  }

  const assessorSessions = new Map<string, AssessorSession>();
  const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
  const DUMMY_SALT = '00000000000000000000000000000000';
  const DUMMY_HASH = '0'.repeat(128);

  function hashPasscode(passcode: string, saltHex?: string): { salt: string; hash: string } {
    const salt = saltHex || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(passcode, salt, 64).toString('hex');
    return { salt, hash };
  }

  function verifyScryptPasscode(passcode: string, salt: string, expectedHex: string): boolean {
    const derived = crypto.scryptSync(passcode, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }

  function verifyEnvPasscode(candidate: string, configuredSecret: string): boolean {
    const a = crypto.createHash('sha256').update(candidate).digest();
    const b = crypto.createHash('sha256').update(configuredSecret).digest();
    return crypto.timingSafeEqual(a, b);
  }

  function hasEnvCode(): boolean {
    return Boolean(process.env.ASSESSOR_PASSCODE && process.env.ASSESSOR_PASSCODE.trim().length > 0);
  }

  function getAccounts(): AssessorAccount[] {
    if (!Array.isArray(store.assessorAccounts)) {
      store.assessorAccounts = [];
    }
    return store.assessorAccounts;
  }

  function toPublicAccount(account: AssessorAccount): PublicAssessorAccount {
    return {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      createdAt: account.createdAt,
      createdBy: account.createdBy,
    };
  }

  function getAuthMode(): 'accounts' | 'env' | 'configured' | 'unclaimed' {
    if (getAccounts().length > 0) {
      return 'accounts';
    }
    if (hasEnvCode()) {
      return 'env';
    }
    if (store.assessorCredential?.hash && store.assessorCredential?.salt) {
      return 'configured';
    }
    return 'unclaimed';
  }

  function extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }

  function getSession(req: Request): (AssessorSession & { token: string }) | null {
    const token = extractBearerToken(req);
    if (!token) return null;
    const record = assessorSessions.get(token);
    if (!record) return null;
    if (record.expiresAt < Date.now()) {
      assessorSessions.delete(token);
      return null;
    }
    return { token, ...record };
  }

  function createSession(payload: {
    accountId?: string;
    username?: string;
    assessorName: string;
  }): string {
    const token = crypto.randomBytes(32).toString('hex');
    assessorSessions.set(token, {
      ...payload,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return token;
  }

  function requireAssessor(req: Request, res: Response, next: NextFunction): void {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ error: 'Akses ditolak. Masuk ke akun Penilai terlebih dahulu.' });
      return;
    }
    next();
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, clients: wss.clients.size });
  });

  app.get('/api/auth/status', (req, res) => {
    const session = getSession(req);
    res.json({
      mode: getAuthMode(),
      hasAccounts: getAccounts().length > 0,
      hasEnvCode: hasEnvCode(),
      authenticated: Boolean(session),
      accountId: session?.accountId ?? null,
      username: session?.username ?? null,
      assessorName: session?.assessorName ?? null,
    });
  });

  app.get('/api/auth/accounts', requireAssessor, (_req, res) => {
    res.json({ accounts: getAccounts().map(toPublicAccount) });
  });

  app.post('/api/auth/register', (req, res) => {
    const accounts = getAccounts();
    const callerSession = getSession(req);
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const usernameRaw = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const inviteCode = typeof req.body?.inviteCode === 'string' ? req.body.inviteCode : '';

    const isClaimed = accounts.length > 0 || Boolean(store.assessorCredential);
    const envConfigured = hasEnvCode();
    const inviteValid =
      envConfigured &&
      inviteCode.length > 0 &&
      verifyEnvPasscode(inviteCode, process.env.ASSESSOR_PASSCODE as string);

    if (isClaimed) {
      if (!callerSession && !inviteValid) {
        res.status(403).json({
          error:
            'Pendaftaran akun Penilai tambahan hanya dapat dilakukan oleh Auditor HSE yang sudah masuk.',
        });
        return;
      }
    } else if (envConfigured && !callerSession && !inviteValid) {
      res.status(403).json({
        error: 'Masukkan Kode Undangan Penilai yang valid untuk membuat akun pertama.',
      });
      return;
    }

    const validation = validateAssessorAccountInput({
      fullName,
      username: usernameRaw,
      password,
    });
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const username = normalizeUsername(usernameRaw);
    if (accounts.some((acc) => acc.username === username)) {
      res.status(409).json({
        error: 'Username sudah terdaftar. Gunakan username lain.',
      });
      return;
    }

    const { salt, hash } = hashPasscode(password);
    const newAccount: AssessorAccount = {
      id: `acc-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      username,
      fullName,
      salt,
      hash,
      createdAt: new Date().toISOString(),
      createdBy: callerSession?.username || username,
    };

    store.assessorAccounts = [...accounts, newAccount];
    saveStore(store);

    if (callerSession) {
      res.status(201).json({
        createdBySession: true,
        account: toPublicAccount(newAccount),
        mode: getAuthMode(),
        hasAccounts: true,
      });
      return;
    }

    const token = createSession({
      accountId: newAccount.id,
      username: newAccount.username,
      assessorName: newAccount.fullName,
    });
    res.status(201).json({
      token,
      accountId: newAccount.id,
      username: newAccount.username,
      assessorName: newAccount.fullName,
      mode: getAuthMode(),
      hasAccounts: true,
    });
  });

  app.delete('/api/auth/accounts/:id', requireAssessor, (req, res) => {
    const session = getSession(req);
    const { id } = req.params;
    const accounts = getAccounts();
    const target = accounts.find((a) => a.id === id);
    if (!target) {
      res.status(404).json({ error: 'Akun Penilai tidak ditemukan.' });
      return;
    }
    if (session?.accountId === target.id) {
      res.status(400).json({ error: 'Tidak dapat menghapus akun yang sedang digunakan login.' });
      return;
    }
    if (accounts.length <= 1) {
      res.status(400).json({ error: 'Minimal harus tersisa 1 akun Penilai aktif.' });
      return;
    }

    store.assessorAccounts = accounts.filter((a) => a.id !== id);
    saveStore(store);
    res.json({ deleted: id });
  });

  app.post('/api/auth/setup', (req, res) => {
    if (getAuthMode() !== 'unclaimed') {
      res.status(409).json({
        error: 'Akses Penilai sudah diaktifkan. Silakan masuk menggunakan akun Penilai.',
      });
      return;
    }
    const assessorName =
      typeof req.body?.assessorName === 'string' ? req.body.assessorName.trim() : '';
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';

    if (assessorName.length < 2) {
      res.status(400).json({ error: 'Masukkan nama Auditor HSE minimal 2 karakter.' });
      return;
    }
    if (passcode.trim().length < 4) {
      res.status(400).json({ error: 'Buat kode sandi Penilai minimal 4 karakter.' });
      return;
    }

    const { salt, hash } = hashPasscode(passcode);
    store.assessorCredential = {
      salt,
      hash,
      assessorName,
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    const token = createSession({ assessorName });
    res.status(201).json({
      token,
      assessorName,
      mode: getAuthMode(),
      hasAccounts: false,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const mode = getAuthMode();
    if (mode === 'unclaimed') {
      res.status(400).json({ error: 'Belum ada akun Penilai terdaftar. Silakan buat akun Penilai terlebih dahulu.' });
      return;
    }

    const accounts = getAccounts();
    const usernameInput =
      typeof req.body?.username === 'string' ? normalizeUsername(req.body.username) : '';
    const passwordInput =
      typeof req.body?.password === 'string'
        ? req.body.password
        : typeof req.body?.passcode === 'string'
          ? req.body.passcode
          : '';
    const assessorNameInput =
      typeof req.body?.assessorName === 'string' ? req.body.assessorName.trim() : '';

    if (!passwordInput) {
      res.status(400).json({ error: 'Masukkan kata sandi akun Penilai.' });
      return;
    }

    if (accounts.length > 0) {
      if (!usernameInput) {
        res.status(400).json({ error: 'Masukkan username akun Penilai.' });
        return;
      }
      const account = accounts.find((a) => a.username === usernameInput);
      const valid = verifyScryptPasscode(
        passwordInput,
        account?.salt || DUMMY_SALT,
        account?.hash || DUMMY_HASH,
      );
      if (!account || !valid) {
        res.status(401).json({ error: 'Username atau kata sandi Penilai tidak sesuai.' });
        return;
      }
      const token = createSession({
        accountId: account.id,
        username: account.username,
        assessorName: account.fullName,
      });
      res.json({
        token,
        accountId: account.id,
        username: account.username,
        assessorName: account.fullName,
        mode: getAuthMode(),
        hasAccounts: true,
      });
      return;
    }

    let valid = false;
    if (mode === 'env') {
      valid = verifyEnvPasscode(passwordInput, process.env.ASSESSOR_PASSCODE as string);
    } else if (store.assessorCredential) {
      valid = verifyScryptPasscode(
        passwordInput,
        store.assessorCredential.salt,
        store.assessorCredential.hash,
      );
    }

    if (!valid) {
      res.status(401).json({ error: 'Kode sandi Penilai tidak sesuai.' });
      return;
    }

    const assessorName =
      assessorNameInput.length >= 2
        ? assessorNameInput
        : store.assessorCredential?.assessorName || 'Auditor HSE SPIL';
    const token = createSession({ assessorName });
    res.json({
      token,
      assessorName,
      mode,
      hasAccounts: false,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      assessorSessions.delete(token);
    }
    res.json({ ok: true });
  });

  app.get('/api/state', (_req, res) => {
    const {
      assessorCredential: _cred,
      assessorAccounts: _accs,
      ...publicStore
    } = store;
    res.json(publicStore);
  });

  app.post('/api/areas', requireAssessor, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length < 3) {
      res.status(400).json({ error: 'Nama area minimal 3 karakter.' });
      return;
    }
    if (!store.areas.includes(name)) {
      store.areas.push(name);
      saveStore(store);
      broadcast({ type: 'area:created', payload: name });
    }
    res.status(201).json({ area: name, areas: store.areas });
  });

  app.post('/api/appraisals', (req, res) => {
    const picName = typeof req.body?.picName === 'string' ? req.body.picName.trim() : '';
    const area = typeof req.body?.area === 'string' ? req.body.area.trim() : '';

    if (picName.length < 2) {
      res.status(400).json({ error: 'Nama Yang Dinilai minimal 2 karakter.' });
      return;
    }
    if (area.length < 3) {
      res.status(400).json({ error: 'Nama tempat / area minimal 3 karakter.' });
      return;
    }

    if (!store.areas.includes(area)) {
      store.areas.push(area);
      broadcast({ type: 'area:created', payload: area });
    }

    const id = getAppraisalKey(picName, area);
    let profile = store.profiles.find((p) => p.id === id);
    if (!profile) {
      profile = {
        id,
        picName,
        area,
        createdAt: new Date().toISOString(),
      };
      store.profiles.push(profile);
      saveStore(store);
      broadcast({ type: 'profile:created', payload: profile });
    }

    res.status(201).json(profile);
  });

  app.post('/api/items', requireAssessor, (req, res) => {
    const pillar = req.body?.pillar as PillarCode;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const criteria = typeof req.body?.criteria === 'string' ? req.body.criteria.trim() : '';
    const validation = validateMeasurementItemInput({ pillar, title, criteria });

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const pillarCount = store.items.filter((i) => i.pillar === pillar).length;
    const nextNumber = store.items.reduce((max, i) => Math.max(max, i.number), 0) + 1;
    const newItem: MeasurementItem = {
      id: `item-custom-${Date.now()}`,
      number: nextNumber,
      code: `${pillar}-${String(pillarCount + 1).padStart(2, '0')}`,
      pillar,
      title,
      criteria,
      isCustom: true,
    };

    store.items.push(newItem);
    saveStore(store);
    broadcast({ type: 'item:created', payload: newItem });
    res.status(201).json(newItem);
  });

  app.patch('/api/items/:id', requireAssessor, (req, res) => {
    const { id } = req.params;
    const idx = store.items.findIndex((i) => i.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Item measurement tidak ditemukan.' });
      return;
    }

    const existing = store.items[idx];
    const pillar = (req.body?.pillar as PillarCode) ?? existing.pillar;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
    const criteria =
      typeof req.body?.criteria === 'string' ? req.body.criteria.trim() : existing.criteria;

    const validation = validateMeasurementItemInput({ pillar, title, criteria });
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    let nextCode = existing.code;
    if (pillar !== existing.pillar) {
      const pillarCount = store.items.filter((i) => i.pillar === pillar && i.id !== id).length;
      nextCode = `${pillar}-${String(pillarCount + 1).padStart(2, '0')}`;
    }

    const updated: MeasurementItem = {
      ...existing,
      pillar,
      code: nextCode,
      title,
      criteria,
    };

    store.items[idx] = updated;
    saveStore(store);
    broadcast({ type: 'item:updated', payload: updated });
    res.json(updated);
  });

  app.delete('/api/items/:id', requireAssessor, (req, res) => {
    const { id } = req.params;
    const target = store.items.find((i) => i.id === id);
    if (!target) {
      res.status(404).json({ error: 'Item measurement tidak ditemukan.' });
      return;
    }
    if (store.items.length <= 1) {
      res.status(400).json({ error: 'Minimal harus tersisa 1 item measurement aktif.' });
      return;
    }
    store.items = store.items.filter((i) => i.id !== id);
    saveStore(store);
    broadcast({ type: 'item:deleted', payload: { id } });
    res.json({ deleted: id });
  });

  app.post('/api/submissions', (req, res) => {
    const {
      area,
      picName,
      itemId,
      photoDataUrl,
      photoDataUrls,
      assesseeNotes,
      assesseeExistClaim,
    } = req.body ?? {};

    const normalizedPhotos: string[] =
      Array.isArray(photoDataUrls) && photoDataUrls.length > 0
        ? photoDataUrls
            .filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0)
            .map((p: string) => p.trim())
        : typeof photoDataUrl === 'string' && photoDataUrl.trim().length > 0
          ? [photoDataUrl.trim()]
          : [];

    const validation = validateSubmissionInput({
      area,
      picName,
      itemId,
      photoDataUrl: normalizedPhotos[0],
      photoDataUrls: normalizedPhotos,
      assesseeNotes,
    });

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const item = store.items.find((i) => i.id === itemId);
    if (!item) {
      res.status(404).json({ error: 'Item measurement tidak ditemukan.' });
      return;
    }

    const cleanArea = String(area).trim();
    const cleanPic = String(picName).trim();
    if (!store.areas.includes(cleanArea)) {
      store.areas.push(cleanArea);
      broadcast({ type: 'area:created', payload: cleanArea });
    }

    const profileId = getAppraisalKey(cleanPic, cleanArea);
    if (!store.profiles.some((p) => p.id === profileId)) {
      const newProfile: AppraisalProfile = {
        id: profileId,
        picName: cleanPic,
        area: cleanArea,
        createdAt: new Date().toISOString(),
      };
      store.profiles.push(newProfile);
      broadcast({ type: 'profile:created', payload: newProfile });
    }

    const submission: AssessmentSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      area: cleanArea,
      picName: cleanPic,
      itemId: item.id,
      itemCode: item.code,
      pillar: item.pillar,
      itemTitle: item.title,
      criteria: item.criteria,
      photoDataUrl: normalizedPhotos[0],
      photoDataUrls: normalizedPhotos,
      assesseeNotes: String(assesseeNotes).trim(),
      assesseeExistClaim: assesseeExistClaim === 'N' ? 'N' : 'Y',
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    store.submissions.unshift(submission);
    saveStore(store);
    broadcast({ type: 'submission:created', payload: submission });
    res.status(201).json(submission);
  });

  app.patch('/api/submissions/:id/evaluate', requireAssessor, (req, res) => {
    const { id } = req.params;
    const { evaluatorName, exist, rating, evaluatorFeedback } = req.body ?? {};

    const validation = validateEvaluationInput({
      evaluatorName,
      exist,
      rating: typeof rating === 'number' ? rating : Number(rating),
      evaluatorFeedback,
    });

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const idx = store.submissions.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Data pengiriman foto tidak ditemukan.' });
      return;
    }

    const updated: AssessmentSubmission = {
      ...store.submissions[idx],
      status: 'reviewed',
      evaluatorName: String(evaluatorName).trim(),
      exist: exist === 'N' ? 'N' : 'Y',
      rating: Number(rating) as 0 | 1 | 2 | 3 | 4,
      evaluatorFeedback: String(evaluatorFeedback).trim(),
      reviewedAt: new Date().toISOString(),
    };

    store.submissions[idx] = updated;
    saveStore(store);
    broadcast({ type: 'submission:evaluated', payload: updated });
    res.json(updated);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`SPIL HSE 5R/5S server running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
