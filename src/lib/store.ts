import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { SessionPayload } from '@/lib/auth';
import { hashPassword, secretsMatch, verifyPassword } from '@/lib/password';

export type Role = 'admin' | 'member';

export type StudioUser = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  disabled: boolean;
  createdAt: number;
  lastLoginAt: number | null;
};

export type Activity = {
  id: string;
  at: number;
  username: string;
  action: string;
  detail: string;
};

export type Settings = {
  studioName: string;
  watermarkEnabled: boolean;
  mockupsEnabled: boolean;
  seoEnabled: boolean;
  registrationEnabled: boolean;
  xaiApiKey?: string;
};

export type PublicSettings = {
  studioName: string;
  watermarkEnabled: boolean;
  mockupsEnabled: boolean;
  seoEnabled: boolean;
  registrationEnabled: boolean;
};

export type ApiKeyStatus = {
  configured: boolean;
  source: 'panel' | 'environment' | 'none';
  hint: string;
};

type Store = {
  users: StudioUser[];
  activity: Activity[];
  settings: Settings;
};

export type PublicUser = Omit<StudioUser, 'passwordHash'>;

const USERNAME = /^[a-zA-Z0-9._-]{3,32}$/;
const ACTIVITY_LIMIT = 200;

function filePath() {
  const root = process.env.VERCEL ? '/tmp' : join(process.cwd(), 'data');
  return join(root, 'studio.json');
}

function defaultSettings(): Settings {
  return {
    studioName: 'Lumina Studio',
    watermarkEnabled: true,
    mockupsEnabled: true,
    seoEnabled: true,
    registrationEnabled: true,
  };
}

function emptyStore(): Store {
  return { users: [], activity: [], settings: defaultSettings() };
}

function normalize(value: Store): Store {
  return {
    users: Array.isArray(value.users) ? value.users : [],
    activity: Array.isArray(value.activity) ? value.activity : [],
    settings: { ...defaultSettings(), ...(value.settings || {}) },
  };
}

function save(store: Store) {
  try {
    const path = filePath();
    mkdirSync(dirname(path), { recursive: true });
    const body = JSON.stringify(store, null, 2);
    const temp = `${path}.${process.pid}.tmp`;
    writeFileSync(temp, body);
    try {
      if (existsSync(path)) unlinkSync(path);
      renameSync(temp, path);
    } catch {
      writeFileSync(path, body);
      try {
        unlinkSync(temp);
      } catch {
        // The temp file is only a fallback if the replace did not finish.
      }
    }
  } catch {
    // Serverless hosts such as Vercel keep the app directory read-only.
    // The in-memory copy still serves this running instance.
  }
}

function addEnvAdmin(store: Store, username: string, password: string, displayName: string) {
  if (!username || !password) return false;
  const existing = store.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    if (existing.role === 'admin' && !existing.disabled) return false;
    existing.role = 'admin';
    existing.disabled = false;
    return true;
  }
  store.users.push({
    id: randomUUID(),
    username,
    displayName,
    passwordHash: hashPassword(password),
    role: 'admin',
    disabled: false,
    createdAt: Date.now(),
    lastLoginAt: null,
  });
  return true;
}

function seed(store: Store) {
  const primary = addEnvAdmin(
    store,
    process.env.AUTH_USERNAME || '',
    process.env.AUTH_PASSWORD || '',
    process.env.AUTH_USERNAME || 'Admin',
  );
  const detected = addEnvAdmin(
    store,
    process.env.ADMIN_USERNAME || 'admin',
    process.env.ADMIN_PASSWORD || '',
    'Admin',
  );
  return primary || detected;
}

let memory: Store | null = null;

function readStoredFile(): Store | null {
  try {
    const path = filePath();
    if (!existsSync(path)) return null;
    return normalize(JSON.parse(readFileSync(path, 'utf8')) as Store);
  } catch {
    return null;
  }
}

function load(): Store {
  if (!memory) {
    memory = readStoredFile() || emptyStore();
  }
  if (seed(memory)) save(memory);
  return memory;
}

let chain: Promise<void> = Promise.resolve();

function updateStore<T>(mutator: (store: Store) => T): Promise<T> {
  let result!: T;
  const run = chain.then(() => {
    const store = load();
    result = mutator(store);
    save(store);
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run.then(() => result);
}

export function toPublicUser(user: StudioUser): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export function findUser(session: Pick<SessionPayload, 'uid' | 'sub'>) {
  return updateStore((store) => {
    const user = session.uid
      ? store.users.find((item) => item.id === session.uid)
      : store.users.find((item) => item.username === session.sub);
    return user ? toPublicUser(user) : null;
  });
}

function envLogin(username: string, password: string, expectedUser: string, expectedPassword: string) {
  return Boolean(
    expectedUser &&
      expectedPassword &&
      secretsMatch(username, expectedUser) &&
      secretsMatch(password, expectedPassword),
  );
}

export async function authenticate(username: string, password: string) {
  const envMatch = envLogin(username, password, process.env.AUTH_USERNAME || '', process.env.AUTH_PASSWORD || '');
  const adminMatch = envLogin(username, password, process.env.ADMIN_USERNAME || 'admin', process.env.ADMIN_PASSWORD || '');
  const recovery = envMatch || adminMatch;

  return updateStore((store) => {
    const user = store.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (!user) return null;
    const passwordOk = verifyPassword(password, user.passwordHash) || recovery;
    if (!passwordOk) return null;
    if (user.disabled && !recovery) return null;
    if (adminMatch || user.role === 'admin') user.role = 'admin';
    if (user.disabled && recovery) user.disabled = false;
    user.lastLoginAt = Date.now();
    return toPublicUser(user);
  });
}

export function listUsers() {
  return updateStore((store) => store.users.map(toPublicUser).sort((a, b) => a.username.localeCompare(b.username)));
}

export function createStudioUser(input: {
  username: string;
  displayName: string;
  password: string;
  role: Role;
}) {
  const username = input.username.trim();
  const displayName = input.displayName.trim() || username;
  if (!USERNAME.test(username)) {
    throw new Error('Username must be 3–32 characters: letters, numbers, dot, underscore, or hyphen.');
  }
  if (displayName.length > 60) throw new Error('Display name must be 60 characters or fewer.');
  if (input.password.length < 8 || input.password.length > 200) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (input.role !== 'admin' && input.role !== 'member') throw new Error('Choose a valid role.');

  return updateStore((store) => {
    if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('That username is already in use.');
    }
    const now = Date.now();
    const user: StudioUser = {
      id: randomUUID(),
      username,
      displayName,
      passwordHash: hashPassword(input.password),
      role: input.role,
      disabled: false,
      createdAt: now,
      lastLoginAt: null,
    };
    store.users.push(user);
    return toPublicUser(user);
  });
}

function adminCount(store: Store, exceptId?: string) {
  return store.users.filter((user) => user.role === 'admin' && !user.disabled && user.id !== exceptId).length;
}

export function updateStudioUser(
  id: string,
  actorId: string,
  patch: { displayName?: string; role?: Role; disabled?: boolean; password?: string },
) {
  return updateStore((store) => {
    const user = store.users.find((item) => item.id === id);
    if (!user) throw new Error('User not found.');

    if (typeof patch.displayName === 'string') {
      const displayName = patch.displayName.trim();
      if (!displayName || displayName.length > 60) throw new Error('Display name must be 1–60 characters.');
      user.displayName = displayName;
    }

    if (patch.role && patch.role !== user.role) {
      if (patch.role !== 'admin' && patch.role !== 'member') throw new Error('Choose a valid role.');
      if (user.role === 'admin' && adminCount(store, user.id) === 0) {
        throw new Error('Keep at least one active admin.');
      }
      user.role = patch.role;
    }

    if (typeof patch.disabled === 'boolean' && patch.disabled !== user.disabled) {
      if (patch.disabled && user.id === actorId) throw new Error('You cannot disable your own account.');
      if (patch.disabled && user.role === 'admin' && adminCount(store, user.id) === 0) {
        throw new Error('Keep at least one active admin.');
      }
      user.disabled = patch.disabled;
    }

    if (typeof patch.password === 'string' && patch.password.length > 0) {
      if (patch.password.length < 8 || patch.password.length > 200) {
        throw new Error('Password must be at least 8 characters.');
      }
      user.passwordHash = hashPassword(patch.password);
    }

    return toPublicUser(user);
  });
}

export function deleteStudioUser(id: string, actorId: string) {
  return updateStore((store) => {
    const user = store.users.find((item) => item.id === id);
    if (!user) throw new Error('User not found.');
    if (user.id === actorId) throw new Error('You cannot delete your own account.');
    if (user.role === 'admin' && !user.disabled && adminCount(store, user.id) === 0) {
      throw new Error('Keep at least one active admin.');
    }
    store.users = store.users.filter((item) => item.id !== id);
    return toPublicUser(user);
  });
}

function publicSettings(settings: Settings): PublicSettings {
  return {
    studioName: settings.studioName,
    watermarkEnabled: settings.watermarkEnabled,
    mockupsEnabled: settings.mockupsEnabled,
    seoEnabled: settings.seoEnabled,
    registrationEnabled: settings.registrationEnabled !== false,
  };
}

function apiKeyStatus(settings: Settings): ApiKeyStatus {
  const stored = settings.xaiApiKey?.trim() || '';
  const fromEnv = process.env.XAI_API_KEY?.trim() || '';
  const active = stored || fromEnv;
  return {
    configured: Boolean(active),
    source: stored ? 'panel' : fromEnv ? 'environment' : 'none',
    hint: active.length >= 4 ? `••••${active.slice(-4)}` : '',
  };
}

export function getSettings() {
  return updateStore((store) => publicSettings(store.settings));
}

export function getApiKey() {
  return updateStore((store) => (store.settings.xaiApiKey?.trim() || process.env.XAI_API_KEY?.trim() || ''));
}

export function saveSettings(patch: Partial<PublicSettings>) {
  return updateStore((store) => {
    if (typeof patch.studioName === 'string') {
      const studioName = patch.studioName.trim();
      if (!studioName || studioName.length > 60) throw new Error('Studio name must be 1–60 characters.');
      store.settings.studioName = studioName;
    }
    if (typeof patch.watermarkEnabled === 'boolean') store.settings.watermarkEnabled = patch.watermarkEnabled;
    if (typeof patch.mockupsEnabled === 'boolean') store.settings.mockupsEnabled = patch.mockupsEnabled;
    if (typeof patch.seoEnabled === 'boolean') store.settings.seoEnabled = patch.seoEnabled;
    if (typeof patch.registrationEnabled === 'boolean') store.settings.registrationEnabled = patch.registrationEnabled;
    return publicSettings(store.settings);
  });
}

export function saveApiKey(value: string) {
  const key = value.trim();
  if (key.length < 12 || key.length > 400 || /\s/.test(key)) {
    throw new Error('Paste a valid xAI API key.');
  }
  return updateStore((store) => {
    store.settings.xaiApiKey = key;
    return apiKeyStatus(store.settings);
  });
}

export function clearApiKey() {
  return updateStore((store) => {
    delete store.settings.xaiApiKey;
    return apiKeyStatus(store.settings);
  });
}

export function logActivity(username: string, action: string, detail: string) {
  return updateStore((store) => {
    store.activity.unshift({
      id: randomUUID(),
      at: Date.now(),
      username: username.slice(0, 32),
      action: action.slice(0, 40),
      detail: detail.replace(/\s+/g, ' ').trim().slice(0, 180),
    });
    if (store.activity.length > ACTIVITY_LIMIT) store.activity.length = ACTIVITY_LIMIT;
  }).catch(() => undefined);
}

export function overview() {
  return updateStore((store) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = store.activity.filter((item) => item.at >= dayAgo);
    const count = (action: string) => store.activity.filter((item) => item.action === action).length;
    return {
      users: store.users.map(toPublicUser).sort((a, b) => a.username.localeCompare(b.username)),
      activity: store.activity.slice(0, 80),
      settings: publicSettings(store.settings),
      stats: {
        users: store.users.length,
        active: store.users.filter((user) => !user.disabled).length,
        admins: store.users.filter((user) => user.role === 'admin' && !user.disabled).length,
        events24h: recent.length,
        logins24h: recent.filter((item) => item.action === 'login').length,
        watermark: count('watermark'),
        mockups: count('mockups'),
        seo: count('seo'),
      },
      xai: apiKeyStatus(store.settings),
    };
  });
}
