import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { cloudflareAiConfigured, runFluxMockup } from '@/lib/cloudflare-ai';
import { logActivity } from '@/lib/store';

export const maxDuration = 300;

const QUALITIES = new Set(['low', 'medium', 'high', 'auto']);

function settingsForQuality(quality: string) {
  if (quality === 'high') {
    return { size: 1536, steps: 32, guidance: 4.5 };
  }
  if (quality === 'medium') {
    return { size: 1280, steps: 28, guidance: 4 };
  }
  if (quality === 'low') {
    return { size: 1024, steps: 20, guidance: 3.5 };
  }
  // auto → high-quality default for mockups
  return { size: 1408, steps: 28, guidance: 4 };
}

function mockupPrompt(prompt: string) {
  return [
    'Photorealistic product mockup. Use the exact product from image 0 as the hero subject.',
    'Preserve its shape, colors, print, logo, texture, and materials with high fidelity.',
    prompt.trim(),
    'Shot on a full-frame camera, 50mm lens, commercial catalog lighting, crisp detail, natural color, soft realistic shadows, shallow depth of field.',
    'Etsy listing ready, premium lifestyle photography, no text overlays, watermarks, collage borders, or extra products.',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 2048);
}

export async function POST(request: Request) {
  const access = await authorizeTool(request, 'mockups');
  if (access.response) return access.response;

  let body: {
    prompt?: unknown;
    n?: unknown;
    quality?: unknown;
    productImage?: unknown;
    mode?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (!(await cloudflareAiConfigured())) {
    return NextResponse.json(
      {
        error:
          'Add Cloudflare Account ID and Workers AI API token in Admin → Settings for Flux mockups.',
      },
      { status: 500 },
    );
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const count = Number(body.n);
  const quality = typeof body.quality === 'string' ? body.quality : 'auto';
  const mockup = body.mode === 'mockup';
  const productImage = typeof body.productImage === 'string' ? body.productImage : '';

  if (!prompt || prompt.length > 4000) {
    return NextResponse.json(
      { error: 'Each prompt needs text, with a maximum of 4000 characters.' },
      { status: 400 },
    );
  }
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: 'Choose between 1 and 10 images.' }, { status: 400 });
  }
  if (!QUALITIES.has(quality)) {
    return NextResponse.json({ error: 'Choose a supported quality.' }, { status: 400 });
  }
  if (mockup && !productImage) {
    return NextResponse.json({ error: 'A mockup needs the product photo.' }, { status: 400 });
  }
  if (!productImage) {
    return NextResponse.json(
      { error: 'Upload a product reference image for Flux mockups.' },
      { status: 400 },
    );
  }

  try {
    const finalPrompt = mockup ? mockupPrompt(prompt) : prompt.slice(0, 2048);
    const settings = settingsForQuality(quality);
    const images = [];

    for (let index = 0; index < count; index += 1) {
      if (request.signal.aborted) break;
      const image = await runFluxMockup({
        prompt: finalPrompt,
        productImage,
        width: settings.size,
        height: settings.size,
        steps: settings.steps,
        guidance: settings.guidance,
        signal: request.signal,
      });
      images.push({ b64: image.b64, mime: image.mime });
    }

    if (!images.length) {
      return NextResponse.json({ error: 'Flux returned no images.' }, { status: 502 });
    }

    if (mockup) {
      await logActivity(
        access.user.username,
        'mockups',
        `Generated ${images.length} Flux mockup image${images.length === 1 ? '' : 's'}`,
      );
    }
    return NextResponse.json({ images, provider: 'cloudflare-flux-2-dev' });
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') {
      return NextResponse.json({ error: 'Stopped.' }, { status: 499 });
    }
    const message = reason instanceof Error ? reason.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
