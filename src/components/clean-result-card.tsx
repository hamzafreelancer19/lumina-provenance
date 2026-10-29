'use client';

import { useState } from 'react';
import { ArrowDownToLine, Check, Copy, FileCheck2, ShieldCheck, Sparkles } from 'lucide-react';
import { formatBytes } from '@/lib/audit';
import type { CleanResult } from '@/lib/types';

interface CleanResultCardProps {
  cleaned: CleanResult;
  onReset?: () => void;
}

export function CleanResultCard({ cleaned, onReset }: CleanResultCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      let imageBlob = cleaned.blob;
      // Convert to PNG for clipboard compatibility if not PNG
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
    <section
      data-testid="section-clean-result"
      className="fade-up mt-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] dark:border-emerald-500/20 dark:from-emerald-500/[0.05] dark:to-transparent p-5 sm:p-7 shadow-sm dark:shadow-none transition-all"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                <Sparkles size={11} />
                Clean Derivative Ready
              </span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Sanitized Raster Copy Created
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
              Original file remains 100% untouched. {cleaned.removed > 0
                ? `${cleaned.removed} detected metadata & C2PA marker group${cleaned.removed === 1 ? '' : 's'} removed from the output copy.`
                : 'All invisible provenance tags and headers excluded.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyToClipboard}
            className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-300/80 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition shadow-xs"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Image</span>
              </>
            )}
          </button>

          <a
            data-testid="link-download-clean-image"
            href={cleaned.url}
            download={cleaned.name}
            className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition shadow-sm hover:shadow"
          >
            <ArrowDownToLine size={15} />
            <span>Download {cleaned.name}</span>
          </a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 pt-5 text-xs">
        <div className="rounded-xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-900/40 p-3">
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Output File
          </span>
          <p data-testid="text-clean-output" className="mt-1 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {cleaned.name}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-900/40 p-3">
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Clean Size
          </span>
          <p data-testid="text-clean-size" className="mt-1 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatBytes(cleaned.size)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800/70 dark:bg-zinc-900/40 p-3">
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Sanitization Guarantee
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck size={14} />
            <span>100% Metadata-Free</span>
          </div>
        </div>
      </div>
    </section>
  );
}
