'use client';

import { useRef, useState } from 'react';
import { Check, Download, ImagePlus, Loader2, Pencil, Sparkles, Square, X } from 'lucide-react';

type GeneratedImage = {
  id: string;
  label: string;
  src: string;
  name: string;
};

type SourceImage = {
  name: string;
  dataUrl: string;
};

const MAX_SOURCE_EDGE = 1536;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

function extensionFor(mime: string) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

function downloadImage(src: string, name: string) {
  const link = document.createElement('a');
  link.href = src;
  link.download = name;
  link.click();
}

function sanitizeDownloadName(value: string, fallback: string) {
  const extensionMatch = fallback.match(/(\.[a-z0-9]+)$/i);
  const extension = extensionMatch?.[1] ?? '.png';
  const withoutExt = value.trim().replace(/\.[^/.]+$/, '');
  const cleaned = withoutExt
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .slice(0, 120);

  return `${cleaned || 'etsy-mockup'}${extension}`;
}

function readSourceImage(file: File) {
  return new Promise<SourceImage>((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(new Error('Upload a PNG, JPEG, or WebP image.'));
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new Error('Each image must be under 12 MB.'));
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, MAX_SOURCE_EDGE / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that image.'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      let dataUrl = '';
      if (file.type === 'image/png') {
        const png = canvas.toDataURL('image/png');
        if (png.length < 4_000_000) dataUrl = png;
      }
      if (!dataUrl) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      }
      resolve({ name: file.name, dataUrl });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

function SourceSlot({
  label,
  hint,
  image,
  disabled,
  onChange,
  onClear,
}: {
  label: string;
  hint: string;
  image: SourceImage | null;
  disabled: boolean;
  onChange: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <span className="text-xs font-semibold text-zinc-800">{label}</span>
      {image ? (
        <div className="relative mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          <img src={image.dataUrl} alt={label} className="h-44 w-full object-contain" />
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute right-2 top-2 rounded-lg bg-white/95 p-1 text-zinc-700 shadow-sm hover:bg-white disabled:opacity-60"
          >
            <X size={14} />
          </button>
          <p className="truncate px-2 py-1.5 text-[11px] text-zinc-500">{image.name}</p>
        </div>
      ) : (
        <label className="mt-2 flex h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 text-center hover:border-emerald-500">
          <ImagePlus size={16} className="text-zinc-500" />
          <span className="mt-1.5 text-[11px] leading-snug text-zinc-500">{hint}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onChange(file);
            }}
          />
        </label>
      )}
    </div>
  );
}

export function BulkCreator() {
  const [quality, setQuality] = useState<'auto' | 'low' | 'medium' | 'high'>('high');
  const [productImage, setProductImage] = useState<SourceImage | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const renameImage = (id: string, name: string) => {
    setImages((current) =>
      current.map((image) =>
        image.id === id ? { ...image, name: sanitizeDownloadName(name, image.name) } : image,
      ),
    );
    setEditingId(null);
    setDraftName('');
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const chooseImage = async (file: File) => {
    setError('');
    try {
      setProductImage(await readSourceImage(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read that image.');
    }
  };

  const generate = async () => {
    if (!productImage) {
      setError('Upload the main product photo.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError('');
    setStatus('Reading the product photo');
    const nextImages: GeneratedImage[] = [];

    try {
      const planResponse = await fetch('/api/mockups/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          productImage: productImage.dataUrl,
        }),
      });
      const plan = (await planResponse.json()) as {
        error?: string;
        jobs?: { index: number; label: string; prompt: string }[];
      };
      if (!planResponse.ok || !plan.jobs?.length) {
        throw new Error(plan.error || 'Could not read the product photo.');
      }

      for (let index = 0; index < plan.jobs.length; index += 1) {
        if (controller.signal.aborted) break;
        const job = plan.jobs[index];
        setStatus(`Generating mockup ${index + 1}/${plan.jobs.length}`);

        const response = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: 'mockup',
            prompt: job.prompt,
            n: 1,
            quality,
            productImage: productImage.dataUrl,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          images?: { b64: string; mime: string }[];
        };

        if (!response.ok) {
          throw new Error(payload.error || 'Image generation failed.');
        }

        const image = payload.images?.[0];
        if (!image) throw new Error('Flux returned no images.');
        const sequence = String(index + 1).padStart(2, '0');
        nextImages.push({
          id: `${index}-${sequence}`,
          label: job.label || `Mockup ${index + 1}`,
          src: `data:${image.mime};base64,${image.b64}`,
          name: `etsy-mockup-${sequence}.${extensionFor(image.mime)}`,
        });
        setImages([...nextImages]);
      }
      setStatus(nextImages.length ? `${nextImages.length} mockups ready` : '');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') {
        setStatus(nextImages.length ? `Stopped. ${nextImages.length} mockups ready` : 'Stopped.');
      } else {
        setError(reason instanceof Error ? reason.message : 'Image generation failed.');
        setStatus('');
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-16">
      <section className="max-w-3xl mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
          Etsy Mockups
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Upload the product photo. Flux 2 Dev keeps that product as the reference and builds sharper lifestyle mockups.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
          <SourceSlot
            label="Product photo"
            hint="Upload the main product image"
            image={productImage}
            disabled={busy}
            onChange={(file) => void chooseImage(file)}
            onClear={() => setProductImage(null)}
          />

          <div className="mt-5">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-800">Quality</span>
              <select
                value={quality}
                onChange={(event) =>
                  setQuality(event.target.value as 'auto' | 'low' | 'medium' | 'high')
                }
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="high">High (1536px, best)</option>
                <option value="medium">Medium (1280px)</option>
                <option value="auto">Auto (1408px)</option>
                <option value="low">Low (faster)</option>
              </select>
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {busy ? 'Generating' : 'Generate'}
            </button>
            {busy && (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                <Square size={13} />
                Stop
              </button>
            )}
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            {status || 'Add the product photo, then generate 6 mockups.'}
          </p>
        </div>

        <div className="lg:col-span-7">
          {images.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
              <div>
                <p className="font-display text-sm font-semibold text-zinc-800">No mockups yet</p>
                <p className="mt-1 text-xs text-zinc-500">Mockups will show up here, one at a time.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {images.map((image) => (
                <figure key={image.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <img src={image.src} alt={image.label} className="aspect-square w-full object-cover" />
                  <figcaption className="space-y-2 p-3">
                    <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600">{image.label}</p>
                    {editingId === image.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              renameImage(image.id, draftName);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              setEditingId(null);
                              setDraftName('');
                            }
                          }}
                          autoFocus
                          spellCheck={false}
                          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1 font-mono text-[11px] text-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => renameImage(image.id, draftName)}
                          title="Save name"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setDraftName('');
                          }}
                          title="Cancel"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-mono text-[11px] text-zinc-500" title={image.name}>
                          {image.name}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(image.id);
                              setDraftName(image.name);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadImage(image.src, image.name)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            <Download size={12} />
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
