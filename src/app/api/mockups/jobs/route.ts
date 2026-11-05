import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { logActivity } from '@/lib/store';
import { diffusersWorkerConfigured, workerFetch } from '@/lib/diffusers-worker';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

function readImage(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Upload a product reference photo.');
  }
  const match = value.match(DATA_URL);
  if (!match) {
    throw new Error('Upload a PNG, JPEG, or WebP photo.');
  }
  const encoded = match[2].replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) {
    throw new Error('The photo must be under 8 MB.');
  }
  return {
    mime: match[1],
    bytes,
  };
}

export async function POST(request: Request) {
  const access = await authorizeTool(request, 'mockups');
  if (access.response) return access.response;

  if (!diffusersWorkerConfigured()) {
    return NextResponse.json(
      { error: 'Set DIFFUSERS_WORKER_URL to your local Diffusers worker.' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { productImage?: unknown };
    const image = readImage(body.productImage);
    const form = new FormData();
    form.append(
      'file',
      new Blob([image.bytes], { type: image.mime }),
      'reference.png',
    );

    const upstream = await workerFetch('/jobs', {
      method: 'POST',
      body: form,
      signal: request.signal,
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail =
        typeof payload === 'object' && payload && 'detail' in payload
          ? String((payload as { detail?: unknown }).detail || '')
          : '';
      throw new Error(detail || 'Diffusers worker rejected the job.');
    }

    await logActivity(access.user.username, 'mockups', 'Started a Diffusers mockup job');
    return NextResponse.json(payload);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Could not start the mockup job.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
