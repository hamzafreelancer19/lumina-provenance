'use client';

import { useState } from 'react';
import { Check, Copy, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';

const TITLE_MIN = 121;
const TITLE_MAX = 139;
const MAX_COMPETITORS = 8;

type SourceImage = {
  name: string;
  dataUrl: string;
};

type CompetitorDraft = {
  title: string;
  description: string;
  tags: string;
};

type Listing = {
  title: string;
  description: string;
  tags: string[];
};

const emptyCompetitor = (): CompetitorDraft => ({ title: '', description: '', tags: '' });

function readSourceImage(file: File) {
  return new Promise<SourceImage>((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('Upload a PNG, JPEG, or WebP image.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('The image must be under 12 MB.'));
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1536 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that image.'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.9) });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

function CopyButton({ value, label }: { value: string; label: string }) {
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
      {copied ? 'Copied' : label}
    </button>
  );
}

export function SeoWriter() {
  const [productImage, setProductImage] = useState<SourceImage | null>(null);
  const [shopName, setShopName] = useState('');
  const [competitors, setCompetitors] = useState<CompetitorDraft[]>([emptyCompetitor()]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateCompetitor = (index: number, field: keyof CompetitorDraft, value: string) => {
    setCompetitors((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  };

  const writeListing = async () => {
    setError('');
    if (!productImage) {
      setError('Upload a clear product image.');
      return;
    }
    if (competitors.some((item) => item.title.trim().length < 8)) {
      setError('Each competitor needs a title.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productImage: productImage.dataUrl,
          shopName,
          competitors: competitors.map((item) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            tags: item.tags.trim(),
          })),
        }),
      });
      const payload = (await response.json()) as Listing & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Listing SEO failed.');
      setListing({
        title: payload.title,
        description: payload.description,
        tags: payload.tags,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Listing SEO failed.');
    } finally {
      setBusy(false);
    }
  };

  const titleLength = listing?.title.length ?? 0;
  const titleFits = titleLength >= TITLE_MIN && titleLength <= TITLE_MAX;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-16">
      <section className="max-w-3xl mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
          Listing SEO
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Upload a clear product photo and competitor listings. Grok reads the product and writes a title, description, and tags.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
            <span className="text-xs font-semibold text-zinc-800">Product photo</span>
            {productImage ? (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                <img src={productImage.dataUrl} alt="Product" className="h-44 w-full object-contain" />
                <button
                  type="button"
                  onClick={() => setProductImage(null)}
                  disabled={busy}
                  aria-label="Remove product photo"
                  className="absolute right-2 top-2 rounded-lg bg-white/95 p-1 text-zinc-700 shadow-sm hover:bg-white disabled:opacity-60"
                >
                  <X size={14} />
                </button>
                <p className="truncate px-2 py-1.5 text-[11px] text-zinc-500">{productImage.name}</p>
              </div>
            ) : (
              <label className="mt-2 flex h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 text-center hover:border-emerald-500">
                <ImagePlus size={16} className="text-zinc-500" />
                <span className="mt-1.5 text-[11px] leading-snug text-zinc-500">Upload a clear product image</span>
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
                    readSourceImage(file).then(setProductImage).catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : 'Could not read that image.');
                    });
                  }}
                />
              </label>
            )}

            <label className="mt-5 block">
              <span className="text-xs font-semibold text-zinc-800">Shop name</span>
              <input
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                disabled={busy}
                maxLength={80}
                placeholder="Optional. Added inside the description."
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          {competitors.map((competitor, index) => (
            <div key={index} className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-800">Competitor {index + 1}</span>
                {competitors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompetitors((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={busy}
                    className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
              <label className="mt-3 block">
                <span className="text-[11px] font-semibold text-zinc-500">Title</span>
                <input
                  value={competitor.title}
                  onChange={(event) => updateCompetitor(index, 'title', event.target.value)}
                  disabled={busy}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[11px] font-semibold text-zinc-500">Description</span>
                <textarea
                  value={competitor.description}
                  onChange={(event) => updateCompetitor(index, 'description', event.target.value)}
                  disabled={busy}
                  rows={4}
                  className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[11px] font-semibold text-zinc-500">Tags</span>
                <input
                  value={competitor.tags}
                  onChange={(event) => updateCompetitor(index, 'tags', event.target.value)}
                  disabled={busy}
                  placeholder="Comma separated"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>
            </div>
          ))}

          {competitors.length < MAX_COMPETITORS && (
            <button
              type="button"
              onClick={() => setCompetitors((current) => [...current, emptyCompetitor()])}
              disabled={busy}
              className="w-full rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:border-emerald-500 disabled:opacity-60"
            >
              Add competitor
            </button>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={writeListing}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {busy ? 'Writing' : 'Write listing'}
          </button>
        </div>

        <div className="lg:col-span-7">
          {!listing ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
              <div>
                <p className="font-display text-sm font-semibold text-zinc-800">No listing yet</p>
                <p className="mt-1 text-xs text-zinc-500">
                  The title stays between {TITLE_MIN} and {TITLE_MAX} characters. A shop name is written into the description.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">Title</p>
                    <p className={`mt-1 font-mono text-[11px] ${titleFits ? 'text-emerald-600' : 'text-red-600'}`}>
                      {titleLength} characters · {TITLE_MIN}–{TITLE_MAX}
                    </p>
                  </div>
                  <CopyButton value={listing.title} label="Copy" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-800">{listing.title}</p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-zinc-800">Description</p>
                  <CopyButton value={listing.description} label="Copy" />
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{listing.description}</p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-zinc-800">Tags · {listing.tags.length}</p>
                  <CopyButton value={listing.tags.join(', ')} label="Copy" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {listing.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700">
                      {tag}
                      <span className="ml-1 text-zinc-400">{tag.length}</span>
                    </span>
                  ))}
                </div>
              </article>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
