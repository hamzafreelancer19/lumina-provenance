import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { getGroqApiKeys, GROQ_VISION_MODEL, groqChat } from '@/lib/groq';
import { logActivity } from '@/lib/store';

export const maxDuration = 30;

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

/** Short readable name: 2–3 Title Case words, spaces only, no hyphens. */
function clipName(value: unknown) {
  const words = String(value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  const name = words.join(' ').slice(0, 28).trim();
  return name || 'Product';
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
      // fall through
    }
  }

  const line = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith('<') && !part.startsWith('{'));
  return clipName(line || text);
}

export async function POST(request: Request) {
  const access = await authorizeTool(request, 'watermark');
  if (access.response) return access.response;

  if (!getGroqApiKeys().length) {
    return NextResponse.json(
      {
        error:
          'Add GROQ_API_KEY to .env.local. Free key: https://console.groq.com/keys',
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { image?: unknown };
    const image = imageDataUrl(body.image);

    const content = await groqChat(
      {
        temperature: 0.1,
        max_completion_tokens: 60,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You name product photo files. Reply with JSON only: {"name":"..."}. Use 2 or 3 short English words in Title Case, separated by spaces. No hyphens, no underscores, no extension, no quotes. Keep it under 28 characters. Example: {"name":"Blue Ceramic Mug"}',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Name this product file in 2 or 3 short words only. Prefer product type plus one color or material. Bad: long-hyphenated-descriptive-slug. Good: {"name":"Gold Rim Mug"}',
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
