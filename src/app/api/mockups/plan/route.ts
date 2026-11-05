import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { getGroqApiKeys, groqChat } from '@/lib/groq';

export const maxDuration = 60;

const MOCKUP_COUNT = 6;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

const SCENES = [
  'Place image 0 centered on a bright white studio tabletop with soft window daylight from the left, clean negative space, and a soft contact shadow.',
  'Place image 0 on a warm oak shelf in a cozy home interior with gentle bokeh lights and lifestyle atmosphere.',
  'Place image 0 on a polished marble countertop with elegant soft shadows and a premium boutique look.',
  'Place image 0 on a rustic wooden table beside a sunlit window with natural daylight and subtle plant blur in the background.',
  'Place image 0 in a gift-ready flat lay on linen fabric with soft even lighting and tasteful empty space around it.',
  'Place image 0 in a modern lifestyle corner on a matte ceramic surface with a softly blurred living-room background.',
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

function parseProduct(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const fallback = 'the product shown in image 0';
  if (start < 0 || end <= start) return fallback;

  try {
    const payload = JSON.parse(text.slice(start, end + 1)) as { product?: unknown };
    return clip(payload.product, fallback);
  } catch {
    return fallback;
  }
}

function mockupPrompt(product: string, scene: string) {
  return [
    `Keep ${product} from image 0 exactly the same — same design, colors, and details.`,
    scene,
    'Do not redesign, restyle, or invent a different product. Only change the scene, lighting, and camera around image 0.',
  ].join(' ');
}

export async function POST(request: Request) {
  const access = await authorizeTool(request, 'mockups');
  if (access.response) return access.response;

  let body: { productImage?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (!(await getGroqApiKeys()).length) {
    return NextResponse.json(
      {
        error: 'Add a Groq API key in Admin → Settings so mockups can read the product photo.',
      },
      { status: 500 },
    );
  }

  let product = '';
  try {
    product = imageUrl(body.productImage, 'The product image');
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Upload a PNG, JPEG, or WebP image.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let productDescription = 'the product shown in image 0';
  try {
    const text = await groqChat(
      {
        temperature: 0,
        max_completion_tokens: 220,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You describe a product photo for mockup generation. Reply with JSON only: {"product":"short noun phrase"}. Example: {"product":"blue ceramic mug with gold rim"}. Describe only what is visible.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Name the product in this photo in a short noun phrase.',
              },
              { type: 'image_url', image_url: { url: product } },
            ],
          },
        ],
      },
      request.signal,
    );
    productDescription = parseProduct(text);
  } catch {
    // Generation can still continue with the fallback description.
  }

  const jobs = SCENES.slice(0, MOCKUP_COUNT).map((scene, index) => ({
    index,
    label: `Mockup ${index + 1}`,
    prompt: mockupPrompt(productDescription, scene),
  }));

  return NextResponse.json({ jobs, product: productDescription });
}
