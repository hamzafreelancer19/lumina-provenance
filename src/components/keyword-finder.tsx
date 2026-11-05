'use client';

import { useState } from 'react';
import { Check, Copy, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';

type SourceImage = {
  name: string;
  dataUrl: string;
};

type KeywordResult = {
  keyword: string;
  keywords: string[];
};

function readThumbnail(file: File) {
  return new Promise<SourceImage>((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('Upload a PNG, JPEG, or WebP thumbnail.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('The thumbnail must be under 8 MB.'));
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that thumbnail.'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.88) });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that thumbnail.'));
    };
    image.src = url;
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function KeywordFinder() {
  const [thumbnail, setThumbnail] = useState<SourceImage | null>(null);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const findKeywords = async () => {
    setError('');
    if (!thumbnail) {
      setError('Upload a product thumbnail first.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: thumbnail.dataUrl }),
      });
      const payload = (await response.json()) as KeywordResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Keyword lookup failed.');
      setResult({
        keyword: payload.keyword,
        keywords: Array.isArray(payload.keywords) ? payload.keywords : [],
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Keyword lookup failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-16">
      <section className="max-w-3xl mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
          Keywords
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Upload only a product thumbnail. The AI reads that image and returns your main keyword.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
            <span className="text-xs font-semibold text-zinc-800">Thumbnail</span>
            {thumbnail ? (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                <img src={thumbnail.dataUrl} alt="Thumbnail" className="h-56 w-full object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setThumbnail(null);
                    setResult(null);
                  }}
                  disabled={busy}
                  aria-label="Remove thumbnail"
                  className="absolute right-2 top-2 rounded-lg bg-white/95 p-1 text-zinc-700 shadow-sm hover:bg-white disabled:opacity-60"
                >
                  <X size={14} />
                </button>
                <p className="truncate px-2 py-1.5 text-[11px] text-zinc-500">{thumbnail.name}</p>
              </div>
            ) : (
              <label className="mt-2 flex h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 text-center hover:border-emerald-500">
                <ImagePlus size={16} className="text-zinc-500" />
                <span className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                  Upload product thumbnail only
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setError('');
                    setResult(null);
                    readThumbnail(file)
                      .then(setThumbnail)
                      .catch((reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : 'Could not read that thumbnail.');
                      });
                  }}
                />
              </label>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={findKeywords}
            disabled={busy || !thumbnail}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {busy ? 'Reading thumbnail' : 'Find main keyword'}
          </button>
        </div>

        <div className="lg:col-span-7">
          {!result ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
              <div>
                <p className="font-display text-sm font-semibold text-zinc-800">No keyword yet</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Add a thumbnail and the agent will return the main product keyword.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <article className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Main keyword
                    </p>
                    <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-zinc-900">
                      {result.keyword}
                    </p>
                  </div>
                  <CopyButton value={result.keyword} />
                </div>
              </article>

              {result.keywords.length > 0 && (
                <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-zinc-800">Related keywords</p>
                    <CopyButton value={result.keywords.join(', ')} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.keywords.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(item)}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </article>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
