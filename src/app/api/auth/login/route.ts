import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions } from '@/lib/auth';
import { authenticate, listUsers, logActivity } from '@/lib/store';

export const runtime = 'nodejs';

type Bucket = { failures: number; reset: number };
const attempts = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'local';
}

function tooManyAttempts(ip: string) {
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || bucket.reset < now) return false;
  return bucket.failures >= MAX_FAILURES;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || bucket.reset < now) {
    attempts.set(ip, { failures: 1, reset: now + WINDOW_MS });
    return;
  }
  bucket.failures += 1;
  if (attempts.size > 1000) {
    for (const [key, value] of attempts) {
      if (value.reset < now) attempts.delete(key);
    }
  }
}

function clearFailures(ip: string) {
  attempts.delete(ip);
}

export async function POST(request: Request) {
  const authSecret = process.env.AUTH_SECRET || '';

  if (authSecret.length < 32 || !(await listUsers()).length) {
    return NextResponse.json({ error: 'Sign-in is not configured on the server.' }, { status: 500 });
  }

  const ip = clientIp(request);
  if (tooManyAttempts(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': '900' } },
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  const givenUser = typeof body.username === 'string' ? body.username : '';
  const givenPassword = typeof body.password === 'string' ? body.password : '';

  if (givenUser.length > 80 || givenPassword.length > 200) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
  }

  const user = await authenticate(givenUser, givenPassword);
  if (!user) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
  }

  clearFailures(ip);
  await logActivity(user.username, 'login', 'Signed in');
  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set({
    ...sessionCookieOptions(),
    value: await createSessionToken({ id: user.id, username: user.username, role: user.role }),
  });
  return response;
}
