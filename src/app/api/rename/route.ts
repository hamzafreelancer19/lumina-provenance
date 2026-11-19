import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { getGroqApiKeys, GROQ_VISION_MODEL, groqChat } from '@/lib/groq';
import { logActivity } from '@/lib/store';

export const maxDuration = 30;

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

/** Readable, image-specific filename: 4–6 Title Case words, spaces only. */
function clipName(value: unknown) {
  const words = String(value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return words.length >= 4 ? words.join(' ') : '';
}

function imageDataUrl(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Send a PNG, JPEG, or WebP image.');
  }
  const match = value.match(DATA_URL);
  if (!match) {
    throw new Error('Send a PNG, JPEG, or WebP image.');
  }
  const encoded = match[2].replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
    throw new Error('The image must be under 4 MB for auto rename.');
  }
  return `data:${match[1]};base64,${encoded}`;
}

function parseName(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const payload = JSON.parse(text.slice(start, end + 1)) as { name?: unknown };
      const fromJson = clipName(payload.name);
      if (fromJson) return fromJson;
    } catch {
      return '';
    }
    return '';
  }

  return clipName(text.replace(/```(?:json)?|```/gi, '').replace(/^["'\s]+|["'\s]+$/g, ''));
}

export async function POST(request: Request) {
  const access = await authorizeTool(request, 'watermark');
  if (access.response) return access.response;

  if (!(await getGroqApiKeys()).length) {
    return NextResponse.json(
      {
        error:
          'Add a Groq API key in Admin → Settings. Free key: https://console.groq.com/keys',
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { image?: unknown };
    const image = imageDataUrl(body.image);

    const content = await groqChat(
      {
        temperature: 0.35,
        max_completion_tokens: 100,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an attentive product-photo analyst who creates useful, distinct filenames. Inspect the image itself before naming it: identify the main subject/product, its visible color or material, design details, and visual style or setting when relevant. Reply with JSON only: {"name":"..."}. The name must contain 4 to 6 specific English words in Title Case, separated by spaces. No generic names like Product Image or Item Photo, no claims about details that are not visible, no hyphens, underscores, extension, or extra explanation. Example: {"name":"Speckled Blue Ceramic Coffee Mug"}',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Carefully inspect the whole image and name the main visible subject with 4 to 6 words. Be specific enough to distinguish this image from other product photos: include the product type plus visible color, material, pattern, shape, or setting as appropriate. Do not invent details. Return only {"name":"Four To Six Specific Words"}.',
              },
              {
                type: 'image_url',
                image_url: { url: image },
              },
            ],
          },
        ],
      },
      request.signal,
    );

    const name = parseName(content);
    if (!name) {
      throw new Error('Groq did not return a usable filename.');
    }

    await logActivity(access.user.username, 'rename', `Auto-named ${name}`);
    return NextResponse.json({ name, model: GROQ_VISION_MODEL });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Auto rename failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
