import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { markContactReportRead } from '@/lib/store';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'Message ID is required.' }, { status: 400 });
  }

  try {
    await markContactReportRead(body.id);
    return NextResponse.json({ ok: true });
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : 'Could not update the message.' },
      { status: 404 },
    );
  }
}
