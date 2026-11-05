export const GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';

let roundRobin = 0;

/** Accepts one or many keys from GROQ_API_KEY / GROQ_API_KEYS (comma, space, newline, or ;). */
export function getGroqApiKeys() {
  const raw = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(',');

  const keys = raw
    .split(/[\n\r,;|]+/)
    .map((key) => key.trim())
    .filter((key) => key.length > 8);

  return [...new Set(keys)];
}

export function getGroqApiKey() {
  return getGroqApiKeys()[0] || '';
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 401 || status === 403 || status >= 500;
}

async function callGroq(apiKey: string, body: Record<string, unknown>, signal?: AbortSignal) {
  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      ...body,
    }),
    signal,
  });

  const payload = (await upstream.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string | null } }[];
  };

  if (!upstream.ok) {
    const error = new Error(payload.error?.message || 'Groq request failed. Try again.') as Error & {
      status?: number;
    };
    error.status = upstream.status;
    throw error;
  }

  return payload.choices?.[0]?.message?.content || '';
}

/**
 * Chat with Groq using round-robin across all configured keys.
 * On rate-limit / auth / server errors, tries the next key.
 */
export async function groqChat(body: Record<string, unknown>, signal?: AbortSignal) {
  const keys = getGroqApiKeys();
  if (!keys.length) {
    throw new Error('Add GROQ_API_KEY to .env.local. Free key: https://console.groq.com/keys');
  }

  const start = roundRobin % keys.length;
  roundRobin = (start + 1) % keys.length;

  let lastError: Error | undefined;
  for (let offset = 0; offset < keys.length; offset += 1) {
    const key = keys[(start + offset) % keys.length];
    try {
      return await callGroq(key, body, signal);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') throw reason;
      lastError = reason instanceof Error ? reason : new Error('Groq request failed.');
      const status = (reason as { status?: number })?.status;
      const canRetry =
        typeof status === 'number' && isRetryableStatus(status) && offset < keys.length - 1;
      if (!canRetry) throw lastError;
    }
  }

  throw lastError || new Error('Groq request failed. Try again.');
}
