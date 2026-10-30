import { NextResponse } from 'next/server';
import { sessionCookieOptions, sessionFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await sessionFromRequest(request);
  if (session) await logActivity(session.sub, 'logout', 'Signed out');
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...sessionCookieOptions(0),
    value: '',
  });
  return response;
}
