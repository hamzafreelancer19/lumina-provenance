import { NextResponse } from 'next/server';
import { hasValidSession } from '@/lib/auth';

export const maxDuration = 120;

const ASPECT_RATIOS = new Set([
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  'auto',
]);
const RESOLUTIONS = new Set(['1k', '2k']);
const QUALITIES = new Set(['low', 'medium', 'auto']);

type ImageItem = {
  b64_json?: string;
  url?: string;
};

function mimeFromBase64(value: string) {
  if (value.startsWith('iVBOR')) return 'image/png';
  if (value.startsWith('/9j/')) return 'image/jpeg';
  if (value.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

function sourceImage(value: unknown, label: string) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a PNG, JPEG, or WebP image.`);
  }

  const match = value.match(DATA_URL);
  if (!match) {
    throw new Error(`${label} must be a PNG, JPEG, or WebP image.`);
  }

  const encoded = match[2].replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 6 * 1024 * 1024) {
    throw new Error(`${label} must be under 6 MB.`);
  }

  return {
    type: 'image_url' as const,
    url: `data:${match[1]};base64,${encoded}`,
  };
}

function editPrompt(prompt: string, hasProduct: boolean, hasReference: boolean, mockup: boolean) {
  if (mockup) return prompt;
  if (hasProduct && hasReference) {
    return `The first image is the product. Keep its shape, colors, branding, and details accurate. The second image is a reference for the scene, lighting, and composition. ${prompt}`;
  }
  if (hasProduct) {
    return `The uploaded image is the product. Keep its shape, colors, branding, and details accurate. ${prompt}`;
  }
  return `The uploaded image is a reference for the scene, lighting, and composition. ${prompt}`;
}

function mimeFromHeader(value: string | null) {
  if (!value) return 'image/png';
  const mime = value.split(';')[0]?.trim().toLowerCase();
  if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp') return mime;
  return 'image/png';
}

async function errorMessage(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return 'The xAI API key was rejected. Check the key and try again.';
  }

  const text = await response.text();
  try {
    const payload = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const nested = payload.error;
    const message =
      typeof nested === 'string' ? nested : nested?.message || payload.message;
    if (message?.trim()) return message.trim();
  } catch {
    // The upstream body was not JSON.
  }

  return text.trim().slice(0, 240) || `Image generation failed (${response.status}).`;
}

export async function POST(request: Request) {
  if (!(await hasValidSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    prompt?: unknown;
    n?: unknown;
    aspectRatio?: unknown;
    resolution?: unknown;
    quality?: unknown;
    productImage?: unknown;
    referenceImage?: unknown;
    mode?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const count = Number(body.n);
  const aspectRatio = typeof body.aspectRatio === 'string' ? body.aspectRatio : '1:1';
  const resolution = typeof body.resolution === 'string' ? body.resolution : '1k';
  const quality = typeof body.quality === 'string' ? body.quality : 'auto';
  const mockup = body.mode === 'mockup';
  const apiKey = process.env.XAI_API_KEY || '';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'XAI_API_KEY is missing from the server environment.' },
      { status: 500 },
    );
  }
  if (!prompt || prompt.length > 4000) {
    return NextResponse.json(
      { error: 'Each prompt needs text, with a maximum of 4000 characters.' },
      { status: 400 },
    );
  }
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: 'Choose between 1 and 10 images.' }, { status: 400 });
  }
  if (!ASPECT_RATIOS.has(aspectRatio) || !RESOLUTIONS.has(resolution) || !QUALITIES.has(quality)) {
    return NextResponse.json({ error: 'Choose a supported size and quality.' }, { status: 400 });
  }

  let product: ReturnType<typeof sourceImage>;
  let reference: ReturnType<typeof sourceImage>;
  try {
    product = sourceImage(body.productImage, 'The product image');
    reference = sourceImage(body.referenceImage, 'The reference image');
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Upload a PNG, JPEG, or WebP image.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const sources = [product, reference].filter((image) => image !== null);
  if (mockup && sources.length < 2) {
    return NextResponse.json(
      { error: 'A mockup needs both the product photo and a background photo.' },
      { status: 400 },
    );
  }
  const requestBody = {
    model: 'grok-imagine-image-2.0',
    prompt: sources.length ? editPrompt(prompt, Boolean(product), Boolean(reference), mockup) : prompt,
    n: count,
    aspect_ratio: aspectRatio,
    resolution,
    quality,
    response_format: 'b64_json' as const,
    ...(sources.length === 1 ? { image: sources[0] } : {}),
    ...(sources.length > 1 ? { images: sources } : {}),
  };

  let upstream: Response;
  try {
    upstream = await fetch(
      sources.length ? 'https://api.x.ai/v1/images/edits' : 'https://api.x.ai/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: request.signal,
      },
    );
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the Grok image API.' },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: await errorMessage(upstream) }, { status: upstream.status });
  }

  const payload = (await upstream.json()) as { data?: ImageItem[] };
  const items = Array.isArray(payload.data) ? payload.data : [];
  if (!items.length) {
    return NextResponse.json({ error: 'Grok returned no images.' }, { status: 502 });
  }

  try {
    const images = await Promise.all(
      items.map(async (item) => {
        if (item.b64_json) {
          return { b64: item.b64_json, mime: mimeFromBase64(item.b64_json) };
        }
        if (!item.url) throw new Error('Grok returned an empty image.');

        const imageResponse = await fetch(item.url, { signal: request.signal });
        if (!imageResponse.ok) throw new Error('Could not download a generated image.');
        const bytes = Buffer.from(await imageResponse.arrayBuffer());
        return {
          b64: bytes.toString('base64'),
          mime: mimeFromHeader(imageResponse.headers.get('content-type')),
        };
      }),
    );

    return NextResponse.json({ images });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Could not save the generated images.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
