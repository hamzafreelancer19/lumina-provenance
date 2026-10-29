import { NextResponse } from 'next/server';
import { hasValidSession } from '@/lib/auth';

export const maxDuration = 60;

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/;
const TITLE_MIN = 121;
const TITLE_MAX = 139;
const TAG_LIMIT = 13;
const TAG_MAX = 20;

type Competitor = {
  title: string;
  description: string;
  tags: string;
};

type Listing = {
  title: string;
  description: string;
  tags: string[];
};

function clip(value: unknown, max: number) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text.slice(0, max);
}

function imageUrl(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('The product image must be a PNG, JPEG, or WebP image.');
  }
  const match = value.match(DATA_URL);
  if (!match) {
    throw new Error('The product image must be a PNG, JPEG, or WebP image.');
  }
  const encoded = match[2].replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 6 * 1024 * 1024) {
    throw new Error('The product image must be under 6 MB.');
  }
  return `data:${match[1]};base64,${encoded}`;
}

function readCompetitors(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new Error('Add between 1 and 8 competitor listings.');
  }

  return value.map((item, index) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const title = clip(row.title, 200);
    if (title.length < 8) {
      throw new Error(`Competitor ${index + 1} needs a title.`);
    }
    return {
      title,
      description: clip(row.description, 4000),
      tags: clip(row.tags, 500),
    };
  });
}

function parseTitle(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return '';
  try {
    const payload = JSON.parse(text.slice(start, end + 1)) as { title?: unknown };
    return typeof payload.title === 'string' ? payload.title.replace(/\s+/g, ' ').trim() : '';
  } catch {
    return '';
  }
}

function parseListing(text: string): Listing | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    const payload = JSON.parse(text.slice(start, end + 1)) as {
      title?: unknown;
      description?: unknown;
      tags?: unknown;
    };
    const title = typeof payload.title === 'string' ? payload.title.replace(/\s+/g, ' ').trim() : '';
    const description = typeof payload.description === 'string' ? payload.description.trim() : '';
    const tags = Array.isArray(payload.tags)
      ? payload.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
      : [];
    if (!title || !description || tags.length === 0) return null;
    return { title, description, tags };
  } catch {
    return null;
  }
}

function cleanTag(value: string) {
  const cleaned = value
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= TAG_MAX) return cleaned;
  const cut = cleaned.slice(0, TAG_MAX);
  const space = cut.lastIndexOf(' ');
  return (space > 8 ? cut.slice(0, space) : cut).trim();
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const tag of tags) {
    const cleaned = cleanTag(tag);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    next.push(cleaned);
    if (next.length === TAG_LIMIT) break;
  }
  return next;
}

function withShopName(description: string, shopName: string) {
  if (!shopName) return description;
  if (description.toLowerCase().includes(shopName.toLowerCase())) return description;
  return `${description}\n\nFrom ${shopName}.`;
}

async function grok(apiKey: string, body: unknown, signal: AbortSignal) {
  const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!upstream.ok) {
    throw new Error('Grok could not write the listing. Try again.');
  }

  const payload = (await upstream.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return payload.choices?.[0]?.message?.content || '';
}

function listingPrompt(competitors: Competitor[], shopName: string) {
  const listings = competitors
    .map((item, index) =>
      [
        `Competitor ${index + 1}`,
        `Title: ${item.title}`,
        `Description: ${item.description || '(none)'}`,
        `Tags: ${item.tags || '(none)'}`,
      ].join('\n'),
    )
    .join('\n\n');

  return [
    'The image is our product. Use only what is visible: product type, material, color, style, and use.',
    'Study the competitor titles, descriptions, and tags for buyer keywords. Do not copy a competitor title, sentence, or tag list.',
    shopName
      ? `Shop name: ${shopName}. Use this exact shop name once, naturally, inside the description. Do not put the shop name in the title or tags.`
      : 'No shop name was provided. Do not invent a shop name.',
    listings,
    'Return JSON only: {"title":"...","description":"...","tags":["..."]}',
    `Title rules: ${TITLE_MIN} to ${TITLE_MAX} characters inclusive, counting spaces and punctuation. Put the strongest search keywords at the front. Use commas between phrases. No emoji, quotes, ALL CAPS, or the same word more than twice.`,
    'Description rules: 140 to 220 words. The first two sentences must include the main keywords in normal sentences. Then cover what is visible, who it is for, and how it is used. Do not invent measurements, materials, or claims that are not in the photo.',
    `Tag rules: exactly ${TAG_LIMIT} tags. Each tag is ${TAG_MAX} characters or fewer, multi-word when possible, with no punctuation. Do not repeat a word across tags. Cover product type, material, style, recipient, and occasion only when they fit this product.`,
  ].join('\n\n');
}

async function fitTitle(apiKey: string, listing: Listing, signal: AbortSignal) {
  if (listing.title.length >= TITLE_MIN && listing.title.length <= TITLE_MAX) return listing.title;

  const text = await grok(
    apiKey,
    {
      model: 'grok-4',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You rewrite Etsy listing titles. Reply with JSON only: {"title":"..."}',
        },
        {
          role: 'user',
          content: [
            `Rewrite this title so its length is between ${TITLE_MIN} and ${TITLE_MAX} characters inclusive.`,
            `Current title (${listing.title.length} characters): ${listing.title}`,
            `Keep these keywords and the same product meaning. Description for context: ${listing.description.slice(0, 500)}`,
            'No emoji, quotes, or ALL CAPS. Return JSON only.',
          ].join('\n'),
        },
      ],
    },
    signal,
  );

  const title = parseTitle(text);
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    throw new Error('The title could not be fit between 121 and 139 characters. Try again.');
  }
  return title;
}

export async function POST(request: Request) {
  if (!(await hasValidSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { productImage?: unknown; shopName?: unknown; competitors?: unknown };
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

  let product = '';
  let shopName = '';
  let competitors: Competitor[] = [];
  try {
    product = imageUrl(body.productImage);
    shopName = clip(body.shopName, 80);
    competitors = readCompetitors(body.competitors);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Check the product image and competitor listings.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const text = await grok(
      apiKey,
      {
        model: 'grok-4',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'You write Etsy SEO listings from a product photo and competitor listings. Reply with JSON only. Never copy a competitor listing. Never invent details that are not visible in the photo.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: listingPrompt(competitors, shopName) },
              { type: 'image_url', image_url: { url: product, detail: 'high' } },
            ],
          },
        ],
      },
      request.signal,
    );

    const listing = parseListing(text);
    if (!listing) {
      return NextResponse.json({ error: 'Grok did not return a usable listing. Try again.' }, { status: 502 });
    }

    const title = await fitTitle(apiKey, listing, request.signal);
    const tags = uniqueTags(listing.tags);
    if (tags.length < 8) {
      return NextResponse.json({ error: 'Grok did not return enough tags. Try again.' }, { status: 502 });
    }

    return NextResponse.json({
      title,
      description: withShopName(listing.description, shopName),
      tags,
    });
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') {
      return NextResponse.json({ error: 'Stopped.' }, { status: 499 });
    }
    const message = reason instanceof Error ? reason.message : 'Listing SEO failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
