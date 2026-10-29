'use client';

import { useEffect, useRef, useState } from 'react';
import { Clipboard, Loader2, Upload } from 'lucide-react';
import { preloadC2pa } from '@/lib/c2pa';

interface FileDropProps {
  onFile: (file: File) => void;
  busy: boolean;
}

export function FileDrop({ onFile, busy }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const choose = () => {
    preloadC2pa();
    if (!busy) inputRef.current?.click();
  };

  const accept = (file?: File) => {
    if (file && !busy) onFile(file);
  };

  // Global clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (busy) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            preloadC2pa();
            onFile(pastedFile);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFile, busy]);

  return (
    <div
      data-testid="drop-zone-image"
      role="button"
      tabIndex={0}
      onPointerEnter={() => preloadC2pa()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          choose();
        }
      }}
      className={`group relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
        dragging
          ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-400 dark:bg-emerald-950/20 ring-4 ring-emerald-500/10'
          : 'border-violet-200/80 bg-violet-50/40 hover:border-violet-300 hover:bg-violet-50/70 dark:border-indigo-400/20 dark:bg-[#0c1228]/50 dark:hover:border-indigo-400/40 dark:hover:bg-[#141a36]/70'
      } ${busy ? 'pointer-events-none opacity-60' : ''}`}
      onClick={choose}
      onDragEnter={(event) => {
        event.preventDefault();
        preloadC2pa();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        data-testid="input-image-file"
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => accept(event.target.files?.[0])}
      />

      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 shadow-sm transition-transform duration-200 group-hover:scale-105">
        {busy ? (
          <Loader2 className="animate-spin text-emerald-500 dark:text-emerald-400" size={22} />
        ) : (
          <Upload size={21} className="text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors" />
        )}
      </div>

      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
        {busy ? 'Inspecting image & C2PA manifest...' : 'Drop image here, browse, or paste'}
      </p>

      <p className="mt-1 max-w-[300px] text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {busy
          ? 'Scanning cryptographic headers and OpenAI provenance manifests locally'
          : 'Supports JPEG, PNG, and WebP up to 50 MB'}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        {['JPEG', 'PNG', 'WEBP', 'GIF'].map((format) => (
          <span
            key={format}
            className="rounded-md border border-zinc-200/90 bg-white/90 dark:border-zinc-800 dark:bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-600 dark:text-zinc-400 shadow-2xs"
          >
            {format}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200/90 bg-zinc-100/90 dark:border-zinc-800 dark:bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
          <Clipboard size={10} />
          <span>Ctrl+V</span>
        </span>
      </div>

    </div>
  );
}
