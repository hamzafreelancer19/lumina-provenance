import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions } from '@/lib/auth';
import { createStudioUser, getSettings, logActivity } from '@/lib/store';

export const runtime = 'nodejs';

type Bucket = { failures: number; reset: number };
const attempts = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'local';
}

function tooManyAttempts(ip: string) {
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || bucket.reset < now) return false;
  return bucket.failures >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string) {
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || bucket.reset < now) {
    attempts.set(ip, { failures: 1, reset: now + WINDOW_MS });
    return;
  }
  bucket.failures += 1;
}

export async function POST(request: Request) {
  if ((process.env.AUTH_SECRET || '').length < 32) {
    return NextResponse.json({ error: 'Sign-up is not configured on the server.' }, { status: 500 });
  }

  const settings = await getSettings();
  if (settings.maintenanceMode) {
    return NextResponse.json({ error: 'The studio is under maintenance.' }, { status: 403 });
  }
  if (!settings.registrationEnabled) {
    return NextResponse.json({ error: 'Registration is turned off.' }, { status: 403 });
  }

  const ip = clientIp(request);
  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': '900' } },
    );
  }

  let body: { username?: unknown; displayName?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName : '';
  const password = typeof body.password === 'string' ? body.password : '';

  try {
    const user = await createStudioUser({
      username,
      displayName,
      password,
      role: 'member',
    });
    await logActivity(user.username, 'register', 'Created an account');
    const response = NextResponse.json({ ok: true, role: user.role });
    response.cookies.set({
      ...sessionCookieOptions(),
      value: await createSessionToken({ id: user.id, username: user.username, role: user.role }),
    });
    return response;
  } catch (reason) {
    recordAttempt(ip);
    const message = reason instanceof Error ? reason.message : 'Could not create the account.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
