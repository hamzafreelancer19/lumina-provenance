import { NextResponse } from 'next/server';
import { createContactReport } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; email?: unknown; subject?: unknown; message?: unknown }
    | null;

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: 'Enter a valid name.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (subject.length < 2 || subject.length > 120) {
    return NextResponse.json({ error: 'Enter a subject.' }, { status: 400 });
  }
  if (message.length < 10 || message.length > 5000) {
    return NextResponse.json({ error: 'Message must be at least 10 characters.' }, { status: 400 });
  }

  await createContactReport({ name, email, subject, message });
  return NextResponse.json({ ok: true });
}
