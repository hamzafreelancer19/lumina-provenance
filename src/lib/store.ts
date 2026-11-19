import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { cookies } from 'next/headers';
import { dirname, join } from 'path';
import type { SessionPayload } from '@/lib/auth';
import { DAILY_CREDIT_ALLOWANCE, WATERMARK_CREDIT_COST } from '@/lib/credit-policy';
import { DEFAULT_CREDIT_PLANS, REFERRAL_REWARD_CREDITS, type CreditPlan } from '@/lib/pricing';
import { hashPassword, secretsMatch, verifyPassword } from '@/lib/password';

export type Role = 'admin' | 'member';

export type UserTools = {
  watermark: boolean;
  mockups: boolean;
  seo: boolean;
  keywords: boolean;
};

export type StudioUser = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  disabled: boolean;
  tools: UserTools;
  dailyCreditsRemaining: number;
  dailyCreditsDate: string;
  bonusCredits: number;
  unlimitedCredits: boolean;
  referralCode: string;
  referredBy: string | null;
  referralRewardedAt: number | null;
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
  keywordsEnabled: boolean;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  xaiApiKey?: string;
  /** One or more Groq keys, comma-separated. */
  groqApiKey?: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  paymentMethodName?: string;
  paymentRecipientName?: string;
  paymentAccountNumber?: string;
  paymentQrImageUrl?: string;
};

export type PublicSettings = {
  studioName: string;
  watermarkEnabled: boolean;
  mockupsEnabled: boolean;
  seoEnabled: boolean;
  keywordsEnabled: boolean;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
};

export type PaymentConfig = {
  paymentMethodName: string;
  paymentRecipientName: string;
  paymentAccountNumber: string;
  paymentQrImageUrl: string;
};

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  paymentMethodName: 'JazzCash / SadaPay / NayaPay',
  paymentRecipientName: 'Hamza Ali',
  paymentAccountNumber: '03208587752',
  paymentQrImageUrl: '/payment-qr.jpeg',
};

export type PaymentRequest = {
  id: string;
  userId: string;
  username: string;
  planId: string;
  planName: string;
  credits: number;
  amount: number;
  transactionId: string;
  proofFileName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt: number | null;
  reviewedBy: string | null;
};

export type ApiKeyStatus = {
  configured: boolean;
  source: 'panel' | 'environment' | 'none';
  hint: string;
};

type Store = {
  users: StudioUser[];
  activity: Activity[];
  paymentRequests: PaymentRequest[];
  plans: CreditPlan[];
  settings: Settings;
  revision: number;
  deletedUsers: string[];
};

const DIR_COOKIE = 'lumina_dir';

export type PublicUser = Omit<StudioUser, 'passwordHash'> & { credits: number };

const USERNAME = /^[a-zA-Z0-9._-]{3,32}$/;
const ACTIVITY_LIMIT = 200;

function utcDate(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

function referralCodeFor(id: string) {
  return `LUM${createHash('sha256').update(id).digest('hex').slice(0, 10).toUpperCase()}`;
}

function uniqueReferralCode(existing: Set<string>, seed: string, preferred?: string) {
  let code = preferred || referralCodeFor(seed);
  if (!existing.has(code)) {
    existing.add(code);
    return code;
  }
  let suffix = 0;
  while (existing.has(code)) {
    suffix += 1;
    code = referralCodeFor(`${seed}:${suffix}`);
  }
  existing.add(code);
  return code;
}

function refreshUserCredits(user: StudioUser, now = Date.now()) {
  const today = utcDate(now);
  if (user.dailyCreditsDate !== today) {
    user.dailyCreditsRemaining = DAILY_CREDIT_ALLOWANCE;
    user.dailyCreditsDate = today;
  }
}

export function defaultUserTools(): UserTools {
  return { watermark: true, mockups: true, seo: true, keywords: true };
}

export function normalizeUserTools(value: unknown): UserTools {
  if (!value || typeof value !== 'object') return defaultUserTools();
  const raw = value as Record<string, unknown>;
  return {
    watermark: raw.watermark !== false,
    mockups: raw.mockups !== false,
    seo: raw.seo !== false,
    keywords: raw.keywords !== false,
  };
}

function readUserTools(value: unknown): UserTools {
  if (!value || typeof value !== 'object') {
    throw new Error('Choose which tools this user can open.');
  }
  const raw = value as Record<string, unknown>;
  return {
    watermark: raw.watermark === true,
    mockups: raw.mockups === true,
    seo: raw.seo === true,
    keywords: raw.keywords === true,
  };
}

function filePath() {
  const root = process.env.VERCEL ? '/tmp' : join(process.cwd(), 'data');
  return join(root, 'studio.json');
}

function paymentProofPath(name: string) {
  if (!/^[0-9a-f-]+\.(png|jpg|webp)$/i.test(name)) throw new Error('Invalid payment proof.');
  const root = process.env.VERCEL ? '/tmp' : join(process.cwd(), 'data');
  return join(root, 'payment-proofs', name);
}

function paymentQrPath(extension: 'png' | 'jpg' | 'webp') {
  const root = process.env.VERCEL ? '/tmp' : join(process.cwd(), 'data');
  return join(root, 'payment-qr', `qr.${extension}`);
}

export async function savePaymentQrImage(extension: 'png' | 'jpg' | 'webp', bytes: Uint8Array) {
  const path = paymentQrPath(extension);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  for (const otherExtension of ['png', 'jpg', 'webp'] as const) {
    if (otherExtension !== extension) {
      const oldPath = paymentQrPath(otherExtension);
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
  }
}

export async function readPaymentQrImage() {
  for (const extension of ['png', 'jpg', 'webp'] as const) {
    const path = paymentQrPath(extension);
    if (existsSync(path)) {
      const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
      return { bytes: readFileSync(path), contentType };
    }
  }
  return null;
}

export function setPaymentQrImageUrl(paymentQrImageUrl: string) {
  return updateStore((store) => {
    store.settings.paymentQrImageUrl = paymentQrImageUrl;
  });
}

export async function savePaymentProof(name: string, bytes: Uint8Array) {
  const path = paymentProofPath(name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes, { flag: 'wx' });
}

export async function deletePaymentProof(name: string) {
  const path = paymentProofPath(name);
  if (existsSync(path)) unlinkSync(path);
}

export async function readPaymentProof(name: string) {
  return readFileSync(paymentProofPath(name));
}

function defaultSettings(): Settings {
  return {
    studioName: 'Lumina Studio',
    watermarkEnabled: true,
    mockupsEnabled: true,
    seoEnabled: true,
    keywordsEnabled: true,
    registrationEnabled: true,
    maintenanceMode: false,
  };
}

function emptyStore(): Store {
  return {
    users: [],
    activity: [],
    paymentRequests: [],
    plans: DEFAULT_CREDIT_PLANS.map((plan) => ({ ...plan })),
    settings: defaultSettings(),
    revision: 0,
    deletedUsers: [],
  };
}

function normalize(value: Store): Store {
  const referralCodes = new Set<string>();
  const users = (Array.isArray(value.users) ? value.users : []).map((user) => {
    const referralCode =
      typeof user.referralCode === 'string' && /^LUM[A-Z0-9]{10}$/.test(user.referralCode)
        ? user.referralCode
        : referralCodeFor(user.id);
    return {
      ...user,
      tools: normalizeUserTools(user.tools),
      dailyCreditsRemaining: Number.isSafeInteger(user.dailyCreditsRemaining)
        ? Math.max(0, user.dailyCreditsRemaining)
        : DAILY_CREDIT_ALLOWANCE,
      dailyCreditsDate:
        typeof user.dailyCreditsDate === 'string' ? user.dailyCreditsDate : utcDate(),
      bonusCredits: Number.isSafeInteger(user.bonusCredits)
        ? Math.max(0, user.bonusCredits)
        : 0,
      unlimitedCredits: user.unlimitedCredits === true,
      referralCode: uniqueReferralCode(referralCodes, user.id, referralCode),
      referredBy: typeof user.referredBy === 'string' ? user.referredBy : null,
      referralRewardedAt:
        typeof user.referralRewardedAt === 'number' ? user.referralRewardedAt : null,
    };
  });
  return {
    users,
    activity: Array.isArray(value.activity) ? value.activity : [],
    paymentRequests: Array.isArray(value.paymentRequests) ? value.paymentRequests : [],
    plans: Array.isArray(value.plans)
      ? value.plans.map((plan) => ({
          ...plan,
          active: plan.active === true,
          popular: plan.popular === true,
        }))
      : DEFAULT_CREDIT_PLANS.map((plan) => ({ ...plan })),
    settings: { ...defaultSettings(), ...(value.settings || {}) },
    revision: typeof value.revision === 'number' ? value.revision : 0,
    deletedUsers: Array.isArray(value.deletedUsers) ? value.deletedUsers.map((name) => name.toLowerCase()) : [],
  };
}

function absorb(base: Store, extra: Store | null): Store {
  if (!extra) return base;
  const deleted = new Set([...(base.deletedUsers || []), ...(extra.deletedUsers || [])]);
  const extraWins = (extra.revision || 0) >= (base.revision || 0);
  const paymentRequests = new Map<string, PaymentRequest>();
  for (const request of [...(base.paymentRequests || []), ...(extra.paymentRequests || [])]) {
    const current = paymentRequests.get(request.id);
    if (
      !current ||
      (request.status !== 'pending' && current.status === 'pending') ||
      (request.reviewedAt !== null && request.reviewedAt > (current.reviewedAt || 0))
    ) {
      paymentRequests.set(request.id, request);
    }
  }
  const settings = extraWins
    ? {
        ...extra.settings,
        xaiApiKey: extra.settings.xaiApiKey || base.settings.xaiApiKey,
        groqApiKey: extra.settings.groqApiKey || base.settings.groqApiKey,
        cloudflareAccountId:
          extra.settings.cloudflareAccountId || base.settings.cloudflareAccountId,
        cloudflareApiToken:
          extra.settings.cloudflareApiToken || base.settings.cloudflareApiToken,
      }
    : {
        ...base.settings,
        xaiApiKey: base.settings.xaiApiKey || extra.settings.xaiApiKey,
        groqApiKey: base.settings.groqApiKey || extra.settings.groqApiKey,
        cloudflareAccountId:
          base.settings.cloudflareAccountId || extra.settings.cloudflareAccountId,
        cloudflareApiToken:
          base.settings.cloudflareApiToken || extra.settings.cloudflareApiToken,
      };
  const map = new Map<string, StudioUser>();
  for (const user of [...(extraWins ? base.users : extra.users), ...(extraWins ? extra.users : base.users)]) {
    if (deleted.has(user.username.toLowerCase())) continue;
    map.set(user.username.toLowerCase(), user);
  }
  return {
    users: [...map.values()],
    settings,
    activity: base.activity.length >= extra.activity.length ? base.activity : extra.activity,
    paymentRequests: [...paymentRequests.values()].sort((a, b) => b.createdAt - a.createdAt),
    plans: extraWins ? extra.plans : base.plans,
    revision: Math.max(base.revision || 0, extra.revision || 0),
    deletedUsers: [...deleted],
  };
}

function signDir(payload: string) {
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length < 32) return '';
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readDirValue(value: string): Store | null {
  const secret = process.env.AUTH_SECRET || '';
  const splitAt = value.lastIndexOf('.');
  if (splitAt <= 0 || secret.length < 32) return null;
  const payload = value.slice(0, splitAt);
  const signature = value.slice(splitAt + 1);
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    return normalize(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Store);
  } catch {
    return null;
  }
}

async function readDirCookie(): Promise<Store | null> {
  try {
    const jar = await cookies();
    const value = jar.get(DIR_COOKIE)?.value;
    return value ? readDirValue(value) : null;
  } catch {
    return null;
  }
}

async function writeDirCookie(store: Store) {
  const copy: Store = {
    ...store,
    activity: [],
    paymentRequests: [],
    plans: store.plans.map((plan) => ({ ...plan })),
    settings: { ...store.settings },
  };
  delete copy.settings.xaiApiKey;
  delete copy.settings.groqApiKey;
  delete copy.settings.cloudflareApiToken;
  const payload = Buffer.from(JSON.stringify(copy)).toString('base64url');
  const signed = signDir(payload);
  if (!signed || signed.length > 3800) return;
  try {
    const jar = await cookies();
    jar.set(DIR_COOKIE, signed, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 400,
    });
  } catch {
    // Server Components can read this cookie, but only route handlers can update it.
  }
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

function envUserId(username: string) {
  const hex = createHash('sha256').update(`lumina-env-user:${username}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function addEnvAdmin(store: Store, username: string, password: string, displayName: string) {
  if (!username || !password) return false;
  store.deletedUsers = store.deletedUsers.filter((name) => name !== username.toLowerCase());
  const existing = store.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    const stableId = envUserId(username);
    let changed = false;
    if (existing.id !== stableId) {
      existing.id = stableId;
      changed = true;
    }
    if (existing.role !== 'admin' || existing.disabled) {
      existing.role = 'admin';
      existing.disabled = false;
      changed = true;
    }
    return changed;
  }
  store.users.push({
    id: envUserId(username),
    username,
    displayName,
    passwordHash: hashPassword(password),
    role: 'admin',
    disabled: false,
    tools: defaultUserTools(),
    dailyCreditsRemaining: DAILY_CREDIT_ALLOWANCE,
    dailyCreditsDate: utcDate(),
    bonusCredits: 0,
    unlimitedCredits: false,
    referralCode: uniqueReferralCode(new Set(store.users.map((user) => user.referralCode)), envUserId(username)),
    referredBy: null,
    referralRewardedAt: null,
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

let chain: Promise<void> = Promise.resolve();

function updateStore<T>(mutator: (store: Store) => T): Promise<T> {
  let result!: T;
  const run = chain.then(async () => {
    let store = absorb(memory || emptyStore(), readStoredFile());
    store = absorb(store, await readDirCookie());
    const changedBySeed = seed(store);
    const before = JSON.stringify({
      users: store.users,
      settings: store.settings,
      paymentRequests: store.paymentRequests,
      plans: store.plans,
      deletedUsers: store.deletedUsers,
    });
    result = mutator(store);
    const after = JSON.stringify({
      users: store.users,
      settings: store.settings,
      paymentRequests: store.paymentRequests,
      plans: store.plans,
      deletedUsers: store.deletedUsers,
    });
    if (changedBySeed || before !== after) store.revision = Date.now();
    memory = store;
    save(store);
    if (store.revision) await writeDirCookie(store);
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run.then(() => result);
}

export function toPublicUser(user: StudioUser): PublicUser {
  refreshUserCredits(user);
  const { passwordHash: _passwordHash, ...rest } = user;
  return {
    ...rest,
    tools: normalizeUserTools(user.tools),
    credits: user.dailyCreditsRemaining + user.bonusCredits,
  };
}

export function findUser(session: Pick<SessionPayload, 'uid' | 'sub'>) {
  return updateStore((store) => {
    const byName = store.users.find((item) => item.username.toLowerCase() === session.sub.toLowerCase());
    const byId = session.uid ? store.users.find((item) => item.id === session.uid) : undefined;
    const user = byId || byName;
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
  tools?: unknown;
  referralCode?: string;
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
  const tools =
    input.tools === undefined ? defaultUserTools() : readUserTools(input.tools);

  return updateStore((store) => {
    if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('That username is already in use.');
    }
    const referralCode = input.referralCode?.trim().toUpperCase();
    const referrer = referralCode
      ? store.users.find((user) => user.referralCode === referralCode && !user.disabled)
      : undefined;
    if (referralCode && !referrer) throw new Error('That referral link is invalid or inactive.');
    store.deletedUsers = store.deletedUsers.filter((name) => name !== username.toLowerCase());
    const now = Date.now();
    const id = randomUUID();
    const user: StudioUser = {
      id,
      username,
      displayName,
      passwordHash: hashPassword(input.password),
      role: input.role,
      disabled: false,
      tools,
      dailyCreditsRemaining: DAILY_CREDIT_ALLOWANCE,
      dailyCreditsDate: utcDate(now),
      bonusCredits: referrer ? REFERRAL_REWARD_CREDITS : 0,
      unlimitedCredits: false,
      referralCode: uniqueReferralCode(new Set(store.users.map((item) => item.referralCode)), id),
      referredBy: referrer?.referralCode || null,
      referralRewardedAt: referrer ? now : null,
      createdAt: now,
      lastLoginAt: null,
    };
    if (referrer) referrer.bonusCredits += REFERRAL_REWARD_CREDITS;
    store.users.push(user);
    return toPublicUser(user);
  });
}

export function getReferralSummary(userId: string) {
  return updateStore((store) => {
    const user = store.users.find((item) => item.id === userId);
    if (!user) throw new Error('User not found.');
    const referrals = store.users.filter((item) => item.referredBy === user.referralCode);
    return {
      referralCode: user.referralCode,
      referralCount: referrals.length,
      rewardedReferrals: referrals.filter((item) => item.referralRewardedAt !== null).length,
      creditsEarned: referrals.filter((item) => item.referralRewardedAt !== null).length * REFERRAL_REWARD_CREDITS,
      rewardCredits: REFERRAL_REWARD_CREDITS,
    };
  });
}

export function getReferralOwnerUsername(referralCode: string) {
  return updateStore(
    (store) =>
      store.users.find((item) => item.referralCode === referralCode)?.username || null,
  );
}

export function spendWatermarkCredit(id: string) {
  return updateStore((store) => {
    const user = store.users.find((item) => item.id === id);
    if (!user) throw new Error('User not found.');
    refreshUserCredits(user);

    if (user.unlimitedCredits) {
      return { user: toPublicUser(user), spent: true, unlimited: true };
    }

    if (user.dailyCreditsRemaining + user.bonusCredits < WATERMARK_CREDIT_COST) {
      return { user: toPublicUser(user), spent: false, unlimited: false };
    }

    const fromDaily = Math.min(user.dailyCreditsRemaining, WATERMARK_CREDIT_COST);
    user.dailyCreditsRemaining -= fromDaily;
    user.bonusCredits -= WATERMARK_CREDIT_COST - fromDaily;
    return { user: toPublicUser(user), spent: true, unlimited: false };
  });
}

export function createPaymentRequest(input: {
  userId: string;
  username: string;
  planId: string;
  transactionId: string;
  proofFileName: string | null;
}) {
  if (!input.transactionId && !input.proofFileName) {
    throw new Error('Enter a transaction ID or attach a payment screenshot.');
  }
  if (input.transactionId.length > 120) throw new Error('Transaction ID is too long.');

  return updateStore((store) => {
    const plan = store.plans.find((item) => item.id === input.planId && item.active);
    if (!plan) throw new Error('That plan is no longer available. Refresh and choose an active plan.');
    if (store.paymentRequests.some((item) => item.userId === input.userId && item.status === 'pending')) {
      throw new Error('You already have a payment waiting for admin review.');
    }
    const request: PaymentRequest = {
      id: randomUUID(),
      userId: input.userId,
      username: input.username,
      planId: plan.id,
      planName: plan.name,
      credits: plan.credits,
      amount: plan.price,
      transactionId: input.transactionId,
      proofFileName: input.proofFileName,
      status: 'pending',
      createdAt: Date.now(),
      reviewedAt: null,
      reviewedBy: null,
    };
    store.paymentRequests.unshift(request);
    return request;
  });
}

export function listPaymentRequests(userId?: string) {
  return updateStore((store) =>
    store.paymentRequests
      .filter((item) => !userId || item.userId === userId)
      .map(({ proofFileName: _proofFileName, ...item }) => item),
  );
}

export function findPaymentRequest(id: string) {
  return updateStore((store) => store.paymentRequests.find((item) => item.id === id) || null);
}

export function updatePaymentRequestStatus(id: string, adminUsername: string, status: 'approved' | 'rejected') {
  return updateStore((store) => {
    const payment = store.paymentRequests.find((item) => item.id === id);
    if (!payment) throw new Error('Payment request not found.');
    if (payment.status !== 'pending') throw new Error('This payment request has already been reviewed.');
    if (status === 'approved') {
      const user = store.users.find((item) => item.id === payment.userId);
      if (!user || user.disabled) throw new Error('The account for this payment is unavailable.');
      user.bonusCredits += payment.credits;
    }
    payment.status = status;
    payment.reviewedAt = Date.now();
    payment.reviewedBy = adminUsername;
    return payment;
  });
}

export function updateOwnProfile(
  id: string,
  patch: {
    displayName?: string;
    currentPassword?: string;
    newPassword?: string;
  },
) {
  const displayName = patch.displayName?.trim();
  if (patch.displayName !== undefined && (!displayName || displayName.length > 60)) {
    throw new Error('Display name must be 1–60 characters.');
  }
  if (patch.newPassword !== undefined) {
    if (patch.newPassword.length < 8 || patch.newPassword.length > 200) {
      throw new Error('New password must be 8–200 characters.');
    }
    if (!patch.currentPassword) {
      throw new Error('Enter your current password to set a new password.');
    }
  }

  return updateStore((store) => {
    const user = store.users.find((item) => item.id === id);
    if (!user) throw new Error('User not found.');

    if (
      patch.newPassword !== undefined &&
      !verifyPassword(patch.currentPassword || '', user.passwordHash)
    ) {
      throw new Error('Your current password is incorrect.');
    }
    if (displayName !== undefined) user.displayName = displayName;
    if (patch.newPassword !== undefined) user.passwordHash = hashPassword(patch.newPassword);
    return toPublicUser(user);
  });
}

function adminCount(store: Store, exceptId?: string) {
  return store.users.filter((user) => user.role === 'admin' && !user.disabled && user.id !== exceptId).length;
}

export function updateStudioUser(
  id: string,
  actorId: string,
  patch: {
    displayName?: string;
    role?: Role;
    disabled?: boolean;
    password?: string;
    tools?: unknown;
    creditsToAdd?: number;
    unlimitedCredits?: boolean;
  },
) {
  return updateStore((store) => {
    const user = store.users.find((item) => item.id === id);
    if (!user) throw new Error('User not found.');
    refreshUserCredits(user);
    user.tools = normalizeUserTools(user.tools);

    if (patch.creditsToAdd !== undefined) {
      if (!Number.isSafeInteger(patch.creditsToAdd) || patch.creditsToAdd < 0 || patch.creditsToAdd > 1_000_000) {
        throw new Error('Add between 0 and 1,000,000 credits.');
      }
      user.bonusCredits += patch.creditsToAdd;
    }

    if (typeof patch.unlimitedCredits === 'boolean') {
      user.unlimitedCredits = patch.unlimitedCredits;
    }

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

    if (patch.tools !== undefined) {
      user.tools = readUserTools(patch.tools);
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
    store.deletedUsers.push(user.username.toLowerCase());
    return toPublicUser(user);
  });
}

function publicSettings(settings: Settings): PublicSettings {
  return {
    studioName: settings.studioName,
    watermarkEnabled: settings.watermarkEnabled,
    mockupsEnabled: settings.mockupsEnabled,
    seoEnabled: settings.seoEnabled,
    keywordsEnabled: settings.keywordsEnabled !== false,
    registrationEnabled: settings.registrationEnabled !== false,
    maintenanceMode: settings.maintenanceMode === true,
  };
}

function parseApiKeys(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n\r,;|]+/)
        .map((key) => key.trim())
        .filter((key) => key.length > 8),
    ),
  ];
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

function groqApiKeyStatus(settings: Settings): ApiKeyStatus {
  const storedKeys = parseApiKeys(settings.groqApiKey || '');
  const envKeys = parseApiKeys(
    [process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS].filter(Boolean).join(','),
  );
  const active = storedKeys[0] || envKeys[0] || '';
  const count = storedKeys.length || envKeys.length;
  return {
    configured: Boolean(active),
    source: storedKeys.length ? 'panel' : envKeys.length ? 'environment' : 'none',
    hint: active
      ? `${count > 1 ? `${count} keys · ` : ''}••••${active.slice(-4)}`
      : '',
  };
}

function cloudflareAiStatus(settings: Settings): ApiKeyStatus {
  const storedAccount = settings.cloudflareAccountId?.trim() || '';
  const storedToken = settings.cloudflareApiToken?.trim() || '';
  const envAccount = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
  const envToken =
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_AI_API_TOKEN?.trim() ||
    '';
  const account = storedAccount || envAccount;
  const token = storedToken || envToken;
  const configured = Boolean(account && token);
  return {
    configured,
    source: storedToken || storedAccount ? 'panel' : configured ? 'environment' : 'none',
    hint: configured
      ? `account ${account.slice(0, 4)}… · token ••••${token.slice(-4)}`
      : '',
  };
}

export function getSettings() {
  return updateStore((store) => publicSettings(store.settings));
}

export function getPaymentConfig() {
  return updateStore((store) => paymentConfigWithDefaults(store.settings));
}

function paymentConfigWithDefaults(settings: Settings): PaymentConfig {
  return {
    paymentMethodName: settings.paymentMethodName || DEFAULT_PAYMENT_CONFIG.paymentMethodName,
    paymentRecipientName: settings.paymentRecipientName || DEFAULT_PAYMENT_CONFIG.paymentRecipientName,
    paymentAccountNumber: settings.paymentAccountNumber || DEFAULT_PAYMENT_CONFIG.paymentAccountNumber,
    paymentQrImageUrl: settings.paymentQrImageUrl || DEFAULT_PAYMENT_CONFIG.paymentQrImageUrl,
  };
}

export function listCreditPlans(activeOnly = false) {
  return updateStore((store) =>
    store.plans
      .filter((plan) => !activeOnly || plan.active)
      .map((plan) => ({ ...plan }))
      .sort((a, b) => a.price - b.price),
  );
}

export function getCreditPlan(id: string) {
  return updateStore((store) => {
    const plan = store.plans.find((item) => item.id === id);
    return plan ? { ...plan } : null;
  });
}

export function saveCreditPlan(input: {
  id?: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  active: boolean;
  popular: boolean;
}) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name || name.length > 40) throw new Error('Plan name must be 1–40 characters.');
  if (!Number.isSafeInteger(input.credits) || input.credits < 1 || input.credits > 1_000_000) {
    throw new Error('Credits must be between 1 and 1,000,000.');
  }
  if (!Number.isFinite(input.price) || input.price < 0.55 || input.price > 2) {
    throw new Error('Plan price must be between $0.55 and $2.00.');
  }
  if (!description || description.length > 120) {
    throw new Error('Plan description must be 1–120 characters.');
  }
  return updateStore((store) => {
    let id = input.id?.trim();
    if (id) {
      const current = store.plans.find((plan) => plan.id === id);
      if (!current) throw new Error('Plan not found.');
    } else {
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'plan';
      id = base;
      let suffix = 2;
      while (store.plans.some((plan) => plan.id === id)) id = `${base}-${suffix++}`;
    }
    const plan: CreditPlan = {
      id,
      name,
      credits: input.credits,
      price: Math.round(input.price * 100) / 100,
      description,
      active: input.active,
      popular: input.popular,
    };
    const index = store.plans.findIndex((item) => item.id === id);
    if (index < 0) store.plans.push(plan);
    else store.plans[index] = plan;
    return plan;
  });
}

export function setCreditPlanActive(id: string, active: boolean) {
  return updateStore((store) => {
    const plan = store.plans.find((item) => item.id === id);
    if (!plan) throw new Error('Plan not found.');
    if (!active && plan.active && store.plans.filter((item) => item.active).length <= 1) {
      throw new Error('Keep at least one plan active for users.');
    }
    plan.active = active;
    return { ...plan };
  });
}

export function savePaymentConfig(patch: PaymentConfig) {
  const paymentMethodName = patch.paymentMethodName.trim();
  const paymentRecipientName = patch.paymentRecipientName.trim();
  const paymentAccountNumber = patch.paymentAccountNumber.trim();
  const paymentQrImageUrl = patch.paymentQrImageUrl.trim();
  if ([paymentMethodName, paymentRecipientName, paymentAccountNumber].some((value) => !value)) {
    throw new Error('Enter the payment method, receiver name, and account number.');
  }
  if (paymentMethodName.length > 50 || paymentRecipientName.length > 80 || paymentAccountNumber.length > 80) {
    throw new Error('Payment details are too long.');
  }
  if (
    paymentQrImageUrl &&
    !['/api/payments/qr', DEFAULT_PAYMENT_CONFIG.paymentQrImageUrl].includes(paymentQrImageUrl) &&
    (paymentQrImageUrl.length > 1000 || !/^https:\/\/\S+$/i.test(paymentQrImageUrl))
  ) {
    throw new Error('QR image must be a valid HTTPS image URL.');
  }

  return updateStore((store) => {
    store.settings.paymentMethodName = paymentMethodName;
    store.settings.paymentRecipientName = paymentRecipientName;
    store.settings.paymentAccountNumber = paymentAccountNumber;
    store.settings.paymentQrImageUrl = paymentQrImageUrl;
    return {
      paymentMethodName,
      paymentRecipientName,
      paymentAccountNumber,
      paymentQrImageUrl,
    };
  });
}

export function getApiKey() {
  return updateStore((store) => (store.settings.xaiApiKey?.trim() || process.env.XAI_API_KEY?.trim() || ''));
}

export function getStoredGroqApiKeys() {
  return updateStore((store) => {
    const fromPanel = parseApiKeys(store.settings.groqApiKey || '');
    if (fromPanel.length) return fromPanel;
    return parseApiKeys(
      [process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS].filter(Boolean).join(','),
    );
  });
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
    if (typeof patch.keywordsEnabled === 'boolean') store.settings.keywordsEnabled = patch.keywordsEnabled;
    if (typeof patch.registrationEnabled === 'boolean') store.settings.registrationEnabled = patch.registrationEnabled;
    if (typeof patch.maintenanceMode === 'boolean') store.settings.maintenanceMode = patch.maintenanceMode;
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

export function saveGroqApiKey(value: string) {
  const keys = parseApiKeys(value);
  if (!keys.length) {
    throw new Error('Paste one or more Groq API keys (comma-separated).');
  }
  if (keys.some((key) => key.length > 400) || value.length > 4000) {
    throw new Error('That Groq API key list is too long.');
  }
  return updateStore((store) => {
    store.settings.groqApiKey = keys.join(',');
    return groqApiKeyStatus(store.settings);
  });
}

export function clearGroqApiKey() {
  return updateStore((store) => {
    delete store.settings.groqApiKey;
    return groqApiKeyStatus(store.settings);
  });
}

export function getCloudflareAiCredentials() {
  return updateStore((store) => {
    const accountId =
      store.settings.cloudflareAccountId?.trim() ||
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
      '';
    const apiToken =
      store.settings.cloudflareApiToken?.trim() ||
      process.env.CLOUDFLARE_API_TOKEN?.trim() ||
      process.env.CLOUDFLARE_AI_API_TOKEN?.trim() ||
      '';
    if (!accountId || !apiToken) return null;
    return { accountId, apiToken };
  });
}

export function saveCloudflareAi(input: { accountId: string; apiToken: string }) {
  const accountId = input.accountId.trim();
  const apiToken = input.apiToken.trim();
  if (!accountId || accountId.length < 8 || accountId.length > 64) {
    throw new Error('Paste a valid Cloudflare Account ID.');
  }
  if (apiToken.length < 20 || apiToken.length > 200 || /\s/.test(apiToken)) {
    throw new Error('Paste a valid Cloudflare Workers AI API token.');
  }
  return updateStore((store) => {
    store.settings.cloudflareAccountId = accountId;
    store.settings.cloudflareApiToken = apiToken;
    return cloudflareAiStatus(store.settings);
  });
}

export function clearCloudflareAi() {
  return updateStore((store) => {
    delete store.settings.cloudflareAccountId;
    delete store.settings.cloudflareApiToken;
    return cloudflareAiStatus(store.settings);
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
      paymentConfig: paymentConfigWithDefaults(store.settings),
      plans: store.plans.map((plan) => ({ ...plan })).sort((a, b) => a.price - b.price),
      paymentRequests: store.paymentRequests.slice(0, 100),
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
        keywords: count('keywords'),
      },
      xai: apiKeyStatus(store.settings),
      groq: groqApiKeyStatus(store.settings),
      cloudflare: cloudflareAiStatus(store.settings),
    };
  });
}
