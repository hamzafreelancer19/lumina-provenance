'use client';

import { useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  Copy,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatBytes } from '@/lib/audit';
import type { CleanResult, Workflow } from '@/lib/types';

interface MobileActionBarProps {
  workflow: Workflow;
  file: File | null;
  cleaned: CleanResult | null;
  foundCount: number;
  onClean: () => void;
  onReset: () => void;
}

export function MobileActionBar({
  workflow,
  file,
  cleaned,
  foundCount,
  onClean,
  onReset,
}: MobileActionBarProps) {
  const [copied, setCopied] = useState(false);

  if (workflow === 'idle' || !file) {
    return null;
  }

  const copyImage = async () => {
    if (!cleaned) return;
    try {
      let imageBlob = cleaned.blob;
      if (imageBlob.type !== 'image/png') {
        const img = new Image();
        img.src = cleaned.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png'),
          );
          if (pngBlob) imageBlob = pngBlob;
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({ [imageBlob.type]: imageBlob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      data-testid="mobile-action-bar"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-violet-200/80 bg-[#f7f5ff]/95 dark:border-indigo-400/20 dark:bg-[#070714]/95 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_30px_rgba(76,29,149,0.12)] transition-all animate-in slide-in-from-bottom duration-200"
    >
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        {/* Left info summary */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {workflow === 'cleaned' && cleaned ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Check size={15} strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {cleaned.name}
                </p>
                <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                  {formatBytes(cleaned.size)} · Sanitized
                </p>
              </div>
            </div>
          ) : workflow === 'auditing' ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                <ScanSearch size={14} className="animate-spin" />
              </span>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                Inspecting image...
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                  foundCount > 0
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {foundCount > 0 ? (
                  <span className="font-mono text-xs font-bold">{foundCount}</span>
                ) : (
                  <ShieldCheck size={14} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {file.name}
                </p>
                <p className="font-mono text-[10px] text-zinc-500">
                  {foundCount > 0 ? `${foundCount} markers found` : 'Clear of markers'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {workflow === 'cleaned' && cleaned ? (
            <>
              <button
                type="button"
                onClick={copyImage}
                title="Copy clean image"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition shadow-2xs"
              >
                {copied ? (
                  <Check size={15} className="text-emerald-500" />
                ) : (
                  <Copy size={15} />
                )}
              </button>

              <a
                data-testid="button-mobile-download"
                href={cleaned.url}
                download={cleaned.name}
                className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition shadow-sm"
              >
                <ArrowDownToLine size={14} />
                <span>Download</span>
              </a>

              <button
                type="button"
                onClick={onReset}
                title="Reset / New image"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 transition"
              >
                <RotateCcw size={13} />
              </button>
            </>
          ) : workflow === 'auditing' ? (
            <div className="h-9 px-3.5 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-xs font-medium text-zinc-500">
              Scanning...
            </div>
          ) : (
            <>
              <button
                data-testid="button-mobile-clean"
                type="button"
                onClick={onClean}
                className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white active:scale-95 transition shadow-sm"
              >
                <Sparkles size={13} className="text-emerald-400 dark:text-emerald-600" />
                <span>Remove Watermark</span>
              </button>

              <button
                type="button"
                onClick={onReset}
                title="Reset / New image"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 transition"
              >
                <RotateCcw size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
