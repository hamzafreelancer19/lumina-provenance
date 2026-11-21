import sharp from 'sharp';
import { getCloudflareAiCredentials } from '@/lib/store';

/** Fast product-reference model — low neuron cost on the free Workers AI plan. */
export const FLUX_MOCKUP_MODEL_FAST = '@cf/black-forest-labs/flux-2-klein-4b';

/** Higher quality model — uses more neurons; needs Workers Paid after free quota. */
export const FLUX_MOCKUP_MODEL_QUALITY = '@cf/black-forest-labs/flux-2-dev';

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

export async function cloudflareAiConfigured() {
  const credentials = await getCloudflareAiCredentials();
  return Boolean(credentials);
}

export function isCloudflareQuotaError(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes('neurons') ||
    text.includes('free allocation') ||
    text.includes('daily free') ||
    text.includes('upgrade to cloudflare') ||
    text.includes('workers paid')
  );
}

export function friendlyCloudflareError(message: string) {
  if (isCloudflareQuotaError(message)) {
    return 'Cloudflare free Workers AI quota (10,000 neurons/day) is used up. For more mockups, upgrade to Workers Paid or try again after the daily reset.';
  }
  return message.replace(/^AiError:\s*/gi, '').replace(/^AiError:\s*/gi, '').trim() || message;
}

async function referenceBlob(dataUrl: string) {
  const match = dataUrl.match(DATA_URL);
  if (!match) throw new Error('The product image must be a PNG, JPEG, or WebP image.');
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!bytes.length) throw new Error('The product image is empty.');

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

async function runFluxModel(
  model: string,
  input: {
    prompt: string;
    productImage: string;
    width: number;
    height: number;
    steps?: number;
    guidance: number;
    signal?: AbortSignal;
  },
) {
  const credentials = await getCloudflareAiCredentials();
  if (!credentials) {
    throw new Error(
      'Add Cloudflare Account ID and Workers AI API token in Admin → Settings.',
    );
  }

  const form = new FormData();
  form.append('prompt', input.prompt);
  form.append('input_image_0', await referenceBlob(input.productImage), 'product.png');
  form.append('width', String(input.width));
  form.append('height', String(input.height));
  form.append('guidance', String(input.guidance));
  if (typeof input.steps === 'number') {
    form.append('steps', String(input.steps));
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    credentials.accountId,
  )}/ai/run/${model}`;

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
    throw new Error(friendlyCloudflareError(message));
  }

  if (contentType.includes('application/json')) {
    const payload = await upstream.json();
    const image = extractImage(payload, contentType);
    if (!image) throw new Error('Flux returned no image.');
    return { ...image, model };
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());
  const image = extractImage(bytes, contentType);
  if (!image) throw new Error('Flux returned no image.');
  return { ...image, model };
}

export async function runFluxMockup(input: {
  prompt: string;
  productImage: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  /** Prefer the cheaper Klein model to stay within free neurons. */
  preferFast?: boolean;
  signal?: AbortSignal;
}) {
  const prompt = input.prompt.trim().slice(0, 2048);
  if (!prompt) throw new Error('Each prompt needs text.');

  const width = input.width ?? 1024;
  const height = input.height ?? 1024;
  const guidance = input.guidance ?? 4;
  const preferFast = input.preferFast !== false;

  const fast = {
    prompt,
    productImage: input.productImage,
    width,
    height,
    guidance,
    signal: input.signal,
  };

  // Free-tier friendly path: Klein first (fixed 4 steps, much cheaper).
  if (preferFast) {
    return runFluxModel(FLUX_MOCKUP_MODEL_FAST, fast);
  }

  try {
    return await runFluxModel(FLUX_MOCKUP_MODEL_QUALITY, {
      ...fast,
      steps: input.steps ?? 28,
    });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : '';
    if (!isCloudflareQuotaError(message)) throw reason;
    // If Dev burns the quota mid-run, finish with the cheaper model.
    return runFluxModel(FLUX_MOCKUP_MODEL_FAST, fast);
  }
}
