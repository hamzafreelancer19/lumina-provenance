import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { workerFetch } from '@/lib/diffusers-worker';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeTool(request, 'mockups');
  if (access.response) return access.response;

  const { id } = await context.params;
  if (!/^[a-f0-9]{16,64}$/i.test(id)) {
    return NextResponse.json({ error: 'Unknown job.' }, { status: 404 });
  }

  try {
    const upstream = await workerFetch(`/jobs/${id}`, { signal: request.signal });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(
        { error: (payload as { detail?: string }).detail || 'Job not found.' },
        { status: upstream.status },
      );
    }
    return NextResponse.json(payload);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Could not read the mockup job.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
