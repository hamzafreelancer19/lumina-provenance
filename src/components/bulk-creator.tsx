'use client';

import { useRef, useState } from 'react';
import { Download, ImagePlus, Loader2, Sparkles, Square, X } from 'lucide-react';

const MAX_BACKGROUNDS = 6;

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
          <img src={image.dataUrl} alt={label} className="h-28 w-full object-contain" />
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
        <label className="mt-2 flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 text-center hover:border-emerald-500">
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
  const [quality, setQuality] = useState<'auto' | 'low' | 'medium'>('auto');
  const [productImage, setProductImage] = useState<SourceImage | null>(null);
  const [backgrounds, setBackgrounds] = useState<SourceImage[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = () => {
    abortRef.current?.abort();
  };

  const chooseImage = async (file: File, setImage: (image: SourceImage | null) => void) => {
    setError('');
    try {
      setImage(await readSourceImage(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read that image.');
    }
  };

  const addBackgrounds = async (files: File[]) => {
    setError('');
    const room = MAX_BACKGROUNDS - backgrounds.length;
    if (room <= 0) {
      setError(`Use up to ${MAX_BACKGROUNDS} background photos.`);
      return;
    }

    const next = [...backgrounds];
    for (const file of files.slice(0, room)) {
      try {
        next.push(await readSourceImage(file));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not read that image.');
        break;
      }
    }
    if (files.length > room) {
      setError(`Only the first ${MAX_BACKGROUNDS} background photos are used.`);
    }
    setBackgrounds(next);
  };

  const generate = async () => {
    if (!productImage) {
      setError('Upload the main product photo.');
      return;
    }
    if (!backgrounds.length) {
      setError('Upload at least one background photo.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError('');
    setStatus('Looking at the product and backgrounds');
    const nextImages: GeneratedImage[] = [];

    try {
      const planResponse = await fetch('/api/mockups/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          productImage: productImage.dataUrl,
          backgroundImages: backgrounds.map((image) => image.dataUrl),
        }),
      });
      const plan = (await planResponse.json()) as {
        error?: string;
        jobs?: { backgroundIndex: number; prompt: string }[];
      };
      if (!planResponse.ok || !plan.jobs?.length) {
        throw new Error(plan.error || 'Could not read the photos.');
      }

      for (let index = 0; index < plan.jobs.length; index += 1) {
        if (controller.signal.aborted) break;
        const job = plan.jobs[index];
        const background = backgrounds[job.backgroundIndex] ?? backgrounds[0];
        setStatus('Generating');

        const response = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: 'mockup',
            prompt: job.prompt,
            n: 1,
            aspectRatio: '1:1',
            resolution: '2k',
            quality,
            productImage: productImage.dataUrl,
            referenceImage: background.dataUrl,
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
        if (!image) throw new Error('Grok returned no images.');
        const sequence = String(index + 1).padStart(2, '0');
        nextImages.push({
          id: `${index}-${sequence}`,
          label: `Mockup ${index + 1} · ${background.name}`,
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
          Upload the product photo and the background photos. The tool reads both and makes the mockups.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
          <SourceSlot
            label="Product photo"
            hint="Upload the main product image"
            image={productImage}
            disabled={busy}
            onChange={(file) => chooseImage(file, setProductImage)}
            onClear={() => setProductImage(null)}
          />

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-800">Background photos</span>
              <span className="text-[11px] text-zinc-500">
                {backgrounds.length}/{MAX_BACKGROUNDS}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {backgrounds.map((image, index) => (
                <div key={`${image.name}-${index}`} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  <img src={image.dataUrl} alt={image.name} className="h-20 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBackgrounds((current) => current.filter((_, item) => item !== index))}
                    disabled={busy}
                    aria-label={`Remove ${image.name}`}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-white/95 p-1 text-zinc-700 shadow-sm hover:bg-white disabled:opacity-60"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {backgrounds.length < MAX_BACKGROUNDS && (
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-2 text-center hover:border-emerald-500">
                  <ImagePlus size={15} className="text-zinc-500" />
                  <span className="mt-1 text-[11px] leading-snug text-zinc-500">Add backgrounds</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    disabled={busy}
                    className="sr-only"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = '';
                      if (files.length) void addBackgrounds(files);
                    }}
                  />
                </label>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              The product is placed into these photos. The background is not swapped for a new scene.
            </p>
          </div>

          <div className="mt-5">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-800">Quality</span>
              <select
                value={quality}
                onChange={(event) => setQuality(event.target.value as 'auto' | 'low' | 'medium')}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="auto">Auto</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
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
            {status || 'Add the product photo and at least one background.'}
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
                  <figcaption className="flex items-start justify-between gap-3 p-3">
                    <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600">{image.label}</p>
                    <button
                      type="button"
                      onClick={() => downloadImage(image.src, image.name)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      <Download size={12} />
                      Save
                    </button>
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
