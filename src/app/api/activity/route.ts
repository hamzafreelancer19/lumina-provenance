import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { logActivity } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;

  let body: { action?: unknown; detail?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (body.action !== 'watermark') {
    return NextResponse.json({ error: 'Unsupported activity.' }, { status: 400 });
  }

  const detail = typeof body.detail === 'string' ? body.detail : 'Cleaned an image';
  await logActivity(result.user.username, 'watermark', detail || 'Cleaned an image');
  return NextResponse.json({ ok: true });
}
