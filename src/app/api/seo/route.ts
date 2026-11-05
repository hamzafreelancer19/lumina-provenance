import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { cloudflareAiConfigured, cloudflareChat } from '@/lib/cloudflare-ai';
import { logActivity } from '@/lib/store';

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
    const description =
      typeof payload.description === 'string' ? normalizeDescription(payload.description) : '';
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

function normalizeDescription(value: string) {
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return '';

  // Keep intentional paragraph breaks; collapse single newlines inside a paragraph.
  let paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // If the model returned one block, split into short paragraphs on sentence groups.
  if (paragraphs.length === 1) {
    const sentences = paragraphs[0]
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (sentences.length >= 4) {
      const chunks: string[] = [];
      for (let index = 0; index < sentences.length; index += 2) {
        chunks.push(sentences.slice(index, index + 2).join(' '));
      }
      paragraphs = chunks;
    }
  }

  return paragraphs.join('\n\n');
}

function withShopName(description: string, shopName: string) {
  if (!shopName) return description;
  if (description.toLowerCase().includes(shopName.toLowerCase())) return description;
  return `${description}\n\nFrom ${shopName}.`;
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
    'Process in this order:',
    '1) Look at OUR product photo first. Note only what is visible: product type, material, color, style, finish, and likely use.',
    '2) Analyze the competitor titles, descriptions, and tags for buyer search keywords and listing structure. Do not copy any competitor title, sentence, paragraph, or tag list.',
    '3) Write a fresh Etsy listing for OUR photo using those keyword ideas.',
    shopName
      ? `Shop name: ${shopName}. Use this exact shop name once, naturally, inside the description. Do not put the shop name in the title or tags.`
      : 'No shop name was provided. Do not invent a shop name.',
    listings,
    'Return JSON only: {"title":"...","description":"...","tags":["..."]}',
    [
      'Title rules:',
      `- ${TITLE_MIN} to ${TITLE_MAX} characters inclusive, counting spaces and punctuation.`,
      '- Put the strongest search keywords at the front. Use commas between phrases.',
      '- No keyword stuffing. Any meaningful word (3+ letters) may appear at most TWICE in the whole title. Prefer once.',
      '- Do not repeat the same phrase. No emoji, quotes, or ALL CAPS.',
    ].join('\n'),
    [
      'Description rules:',
      '- Write 160 to 260 words total.',
      '- MUST use 4 short paragraphs separated by a blank line (\\n\\n). Never return one single paragraph.',
      '- Paragraph 1: opening with main keywords and what the product is.',
      '- Paragraph 2: visible details from OUR photo (color, material, style, look).',
      '- Paragraph 3: who it is for and how/when it is used.',
      '- Paragraph 4: soft close / gift or listing appeal. Include shop name here only if provided.',
      '- Do not invent measurements, materials, brands, or claims that are not visible in the photo.',
      '- No bullet lists, no markdown headings, no emoji.',
    ].join('\n'),
    `Tag rules: exactly ${TAG_LIMIT} tags. Each tag is ${TAG_MAX} characters or fewer, multi-word when possible, with no punctuation. Do not repeat a word across tags. Cover product type, material, style, recipient, and occasion only when they fit this product.`,
  ].join('\n\n');
}

function titleWordCounts(title: string) {
  const counts = new Map<string, number>();
  for (const word of title.toLowerCase().match(/[a-z0-9']+/g) || []) {
    if (word.length < 3) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return counts;
}

function titleHasStuffing(title: string) {
  return [...titleWordCounts(title).values()].some((count) => count > 2);
}

function titleIsReady(title: string) {
  return (
    title.length >= TITLE_MIN &&
    title.length <= TITLE_MAX &&
    !titleHasStuffing(title)
  );
}

async function fitTitle(listing: Listing, signal: AbortSignal) {
  if (titleIsReady(listing.title)) return listing.title;

  const stuffed = [...titleWordCounts(listing.title).entries()]
    .filter(([, count]) => count > 2)
    .map(([word]) => word);

  const text = await cloudflareChat(
    {
      temperature: 0,
      max_completion_tokens: 256,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You rewrite Etsy listing titles. No keyword stuffing. Reply with JSON only: {"title":"..."}',
        },
        {
          role: 'user',
          content: [
            `Rewrite this title so its length is between ${TITLE_MIN} and ${TITLE_MAX} characters inclusive.`,
            `Current title (${listing.title.length} characters): ${listing.title}`,
            stuffed.length
              ? `These words are overused and must appear at most twice (prefer once): ${stuffed.join(', ')}`
              : 'Do not repeat any meaningful word more than twice.',
            `Keep the product meaning. Description for context: ${listing.description.slice(0, 500)}`,
            'No emoji, quotes, or ALL CAPS. Return JSON only.',
          ].join('\n'),
        },
      ],
    },
    signal,
  );

  const title = parseTitle(text);
  if (!titleIsReady(title)) {
    throw new Error('The title could not be cleaned of keyword stuffing. Try again.');
  }
  return title;
}

export async function POST(request: Request) {
  const access = await authorizeTool(request, 'seo');
  if (access.response) return access.response;

  let body: { productImage?: unknown; shopName?: unknown; competitors?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (!(await cloudflareAiConfigured())) {
    return NextResponse.json(
      {
        error:
          'Add Cloudflare Account ID and Workers AI API token in Admin → Settings for listing SEO.',
      },
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
    const text = await cloudflareChat(
      {
        temperature: 0.4,
        max_completion_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You write Etsy SEO listings. First analyze the product photo, then study competitor keyword patterns, then write an original title, multi-paragraph description, and tags. Reply with JSON only. Never copy a competitor listing. Never invent details that are not visible in the photo. The description must contain blank-line paragraph breaks.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: listingPrompt(competitors, shopName) },
              { type: 'image_url', image_url: { url: product } },
            ],
          },
        ],
      },
      request.signal,
    );

    const listing = parseListing(text);
    if (!listing) {
      return NextResponse.json(
        { error: 'Cloudflare AI did not return a usable listing. Try again.' },
        { status: 502 },
      );
    }

    const title = await fitTitle(listing, request.signal);
    const tags = uniqueTags(listing.tags);
    if (tags.length < 8) {
      return NextResponse.json(
        { error: 'Cloudflare AI did not return enough tags. Try again.' },
        { status: 502 },
      );
    }

    await logActivity(access.user.username, 'seo', 'Wrote a listing');
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
