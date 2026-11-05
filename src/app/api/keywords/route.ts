import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { cloudflareAiConfigured, cloudflareChat } from '@/lib/cloudflare-ai';
import { logActivity } from '@/lib/store';

export const maxDuration = 60;

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;

function imageDataUrl(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Upload a PNG, JPEG, or WebP thumbnail.');
  }
  const match = value.match(DATA_URL);
  if (!match) {
    throw new Error('Upload a PNG, JPEG, or WebP thumbnail.');
  }
  const encoded = match[2].replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
    throw new Error('The thumbnail must be under 4 MB.');
  }
  return `data:${match[1]};base64,${encoded}`;
}

function cleanPhrase(value: unknown) {
  const text = typeof value === 'string' ? value : '';
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function parseKeywords(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const payload = JSON.parse(text.slice(start, end + 1)) as {
      keyword?: unknown;
      keywords?: unknown;
    };
    const main = cleanPhrase(payload.keyword);
    const related = Array.isArray(payload.keywords)
      ? payload.keywords
          .map(cleanPhrase)
          .filter(Boolean)
          .filter(
            (item, index, list) =>
              list.findIndex((row) => row.toLowerCase() === item.toLowerCase()) === index,
          )
          .filter((item) => item.toLowerCase() !== main.toLowerCase())
          .slice(0, 5)
      : [];
    if (!main) return null;
    return { keyword: main, keywords: related };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const access = await authorizeTool(request, 'keywords');
  if (access.response) return access.response;

  if (!(await cloudflareAiConfigured())) {
    return NextResponse.json(
      {
        error:
          'Add Cloudflare Account ID and Workers AI API token in Admin → Settings for Keywords.',
      },
      { status: 500 },
    );
  }

  let image = '';
  try {
    const body = (await request.json()) as { image?: unknown };
    image = imageDataUrl(body.image);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Upload a thumbnail image.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const text = await cloudflareChat(
      {
        temperature: 0.1,
        max_completion_tokens: 120,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You extract Etsy search keywords from one product thumbnail only. Reply with JSON only: {"keyword":"main keyword","keywords":["related1","related2"]}. The main keyword is the primary product buyer would search. Keep phrases short (1 to 4 words). No hashtags, no sentences.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze only this thumbnail. What is the one main product keyword? Also give up to 5 short related keywords. Example: {"keyword":"ceramic mug","keywords":["coffee cup","handmade mug"]}',
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

    const result = parseKeywords(text);
    if (!result) {
      return NextResponse.json(
        { error: 'Could not read a keyword from that thumbnail. Try again.' },
        { status: 502 },
      );
    }

    await logActivity(access.user.username, 'keywords', `Found ${result.keyword}`);
    return NextResponse.json(result);
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') {
      return NextResponse.json({ error: 'Stopped.' }, { status: 499 });
    }
    const message = reason instanceof Error ? reason.message : 'Keyword lookup failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
