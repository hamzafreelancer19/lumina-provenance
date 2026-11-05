import sharp from 'sharp';
import { getCloudflareAiCredentials } from '@/lib/store';

/** Flux 2 Dev: multi-reference mockups with adjustable steps for higher quality. */
export const FLUX_MOCKUP_MODEL = '@cf/black-forest-labs/flux-2-dev';

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

export async function cloudflareAiConfigured() {
  const credentials = await getCloudflareAiCredentials();
  return Boolean(credentials);
}

async function referenceBlob(dataUrl: string) {
  const match = dataUrl.match(DATA_URL);
  if (!match) throw new Error('The product image must be a PNG, JPEG, or WebP image.');
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!bytes.length) throw new Error('The product image is empty.');

  // Cloudflare Flux 2 requires each reference image under 512x512.
  // Pad to a square canvas so the product fills the reference cleanly.
  const resized = await sharp(bytes)
    .rotate()
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return new Blob([new Uint8Array(resized)], { type: 'image/png' });
}

function extractImage(payload: unknown, contentType: string | null) {
  if (Buffer.isBuffer(payload)) {
    return {
      b64: payload.toString('base64'),
      mime: contentType?.startsWith('image/') ? contentType.split(';')[0] : 'image/jpeg',
    };
  }

  if (typeof payload === 'string' && payload.length > 80) {
    return {
      b64: payload.replace(/^data:image\/[a-z+]+;base64,/i, ''),
      mime: 'image/jpeg',
    };
  }

  const body = payload as {
    result?: { image?: string } | string;
    image?: string;
  } | null;

  const image =
    (typeof body?.result === 'object' && body?.result?.image) ||
    (typeof body?.result === 'string' ? body.result : '') ||
    body?.image ||
    '';

  if (!image) return null;
  return {
    b64: image.replace(/^data:image\/[a-z+]+;base64,/i, ''),
    mime: 'image/jpeg' as const,
  };
}

export async function runFluxMockup(input: {
  prompt: string;
  productImage: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  signal?: AbortSignal;
}) {
  const credentials = await getCloudflareAiCredentials();
  if (!credentials) {
    throw new Error(
      'Add Cloudflare Account ID and Workers AI API token in Admin → Settings.',
    );
  }

  const prompt = input.prompt.trim().slice(0, 2048);
  if (!prompt) throw new Error('Each prompt needs text.');

  const form = new FormData();
  form.append('prompt', prompt);
  form.append('input_image_0', await referenceBlob(input.productImage), 'product.png');
  form.append('width', String(input.width ?? 1280));
  form.append('height', String(input.height ?? 1280));
  form.append('steps', String(input.steps ?? 28));
  form.append('guidance', String(input.guidance ?? 4));

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    credentials.accountId,
  )}/ai/run/${FLUX_MOCKUP_MODEL}`;

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.apiToken}`,
    },
    body: form,
    signal: input.signal,
  });

  const contentType = upstream.headers.get('content-type') || '';
  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => null)) as {
      errors?: { message?: string }[];
    } | null;
    const message =
      payload?.errors?.map((item) => item.message).filter(Boolean).join(' ') ||
      `Cloudflare Workers AI failed (${upstream.status}).`;
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    const payload = await upstream.json();
    const image = extractImage(payload, contentType);
    if (!image) throw new Error('Flux returned no image.');
    return image;
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());
  const image = extractImage(bytes, contentType);
  if (!image) throw new Error('Flux returned no image.');
  return image;
}
