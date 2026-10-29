import { NextResponse } from 'next/server';

export const maxDuration = 60;

const MOCKUP_COUNT = 6;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

const FRAMES = [
  'Keep the product clearly visible on the surface that is already in the photo.',
  'Use the same photo, with the product sitting a little to the left.',
  'Use the same photo, with the product sitting a little to the right.',
  'Use the same photo, with the product a little closer to the camera.',
  'Use the same photo, with the product a little farther back.',
  'Use the same photo, with a little more of that same background visible around the product.',
];

function imageUrl(value: unknown, label: string) {
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
  return `data:${match[1]};base64,${encoded}`;
}

function clip(value: unknown, fallback: string) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return (text || fallback).slice(0, 280);
}

function parseAnalysis(text: string, count: number) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const fallback = {
    product: 'The product shown in the first image, unchanged.',
    backgrounds: Array.from(
      { length: count },
      () => 'The existing photo, including its surface, light, and camera angle.',
    ),
  };
  if (start < 0 || end <= start) return fallback;

  try {
    const payload = JSON.parse(text.slice(start, end + 1)) as {
      product?: unknown;
      backgrounds?: unknown;
    };
    const backgrounds = Array.isArray(payload.backgrounds) ? payload.backgrounds : [];
    return {
      product: clip(payload.product, fallback.product),
      backgrounds: fallback.backgrounds.map((item, index) => clip(backgrounds[index], item)),
    };
  } catch {
    return fallback;
  }
}

function mockupPrompt(product: string, background: string, frame: string) {
  return [
    'The first image is the product. Keep its exact shape, colors, print, logo, and material.',
    `Product: ${product}`,
    'The second image is the background photo. Keep that photo as it is.',
    `Background: ${background}`,
    'Place this same product into that existing background.',
    'Match the lighting, shadows, perspective, and scale already in the background photo.',
    'Do not replace the background, and do not add a new scene, props, text, people, or another product.',
    frame,
  ]
    .filter(Boolean)
    .join(' ');
}

async function readPhotos(productImage: unknown, backgroundImages: unknown) {
  if (!Array.isArray(backgroundImages) || backgroundImages.length < 1 || backgroundImages.length > MOCKUP_COUNT) {
    throw new Error('Add between 1 and 6 background photos.');
  }

  return {
    product: imageUrl(productImage, 'The product image'),
    backgrounds: backgroundImages.map((image, index) => imageUrl(image, `Background ${index + 1}`)),
  };
}

export async function POST(request: Request) {
  let body: { productImage?: unknown; backgroundImages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  const apiKey = process.env.XAI_API_KEY || '';
  if (!apiKey) {
    return NextResponse.json(
      { error: 'XAI_API_KEY is missing from the server environment.' },
      { status: 500 },
    );
  }

  let photos: { product: string; backgrounds: string[] };
  try {
    photos = await readPhotos(body.productImage, body.backgroundImages);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Upload a PNG, JPEG, or WebP image.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const content: Array<
    { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } }
  > = [
    {
      type: 'text',
      text: 'Image 1 is the product photo. Describe only what is visible. Do not suggest a new scene.',
    },
    { type: 'image_url', image_url: { url: photos.product, detail: 'low' } },
  ];

  photos.backgrounds.forEach((url, index) => {
    content.push({
      type: 'text',
      text: `Background ${index + 1}. Describe only the surface, light, and camera angle already in this photo.`,
    });
    content.push({ type: 'image_url', image_url: { url, detail: 'low' } });
  });

  content.push({
    type: 'text',
    text: `Return JSON only: {"product":"one factual sentence","backgrounds":[${photos.backgrounds
      .map(() => '"one factual sentence"')
      .join(',')}]} . ${photos.backgrounds.length} background sentences, in order. No new scene, styling idea, or props.`,
  });

  let analysis = parseAnalysis('', photos.backgrounds.length);
  try {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You describe product and background photos for compositing. Reply with JSON only. Describe only what is already visible. Never invent a location, mood, or scene.',
          },
          { role: 'user', content },
        ],
      }),
      signal: request.signal,
    });

    if (upstream.ok) {
      const payload = (await upstream.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      analysis = parseAnalysis(payload.choices?.[0]?.message?.content || '', photos.backgrounds.length);
    }
  } catch {
    // The photos are still enough to place the product. Generation uses the fallback description.
  }

  const jobs = Array.from({ length: MOCKUP_COUNT }, (_, index) => {
    const backgroundIndex = index % photos.backgrounds.length;
    const repeated = index >= photos.backgrounds.length;
    return {
      backgroundIndex,
      prompt: mockupPrompt(
        analysis.product,
        analysis.backgrounds[backgroundIndex],
        repeated ? FRAMES[index] : FRAMES[0],
      ),
    };
  });

  return NextResponse.json({ jobs });
}
