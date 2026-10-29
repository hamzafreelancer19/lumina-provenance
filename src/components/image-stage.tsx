'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Columns2,
  Copy,
  Expand,
  Eye,
  Layers,
  Maximize2,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Split,
  X,
  Zap,
} from 'lucide-react';
import type { CleanResult } from '@/lib/types';

interface ImageStageProps {
  file: File | null;
  cleaned: CleanResult | null;
  onClean?: () => void;
  isBusy?: boolean;
}

type ViewMode = 'slider' | 'source' | 'clean' | 'side';

export function ImageStage({
  file,
  cleaned,
  onClean,
  isBusy,
}: ImageStageProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('clean');
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) {
      setSourceUrl('');
      setViewMode('source');
      setNaturalDimensions(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSourceUrl(url);

    const img = new Image();
    img.onload = () => {
      setNaturalDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (cleaned) {
      setViewMode('slider');
    }
  }, [cleaned]);

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

  const handlePointerMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(100, Math.max(0, pos)));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  return (
    <>
      <div className="relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-violet-200/70 bg-white/80 dark:border-indigo-400/20 dark:bg-[#10162c]/80 p-4 sm:p-5 shadow-sm dark:shadow-none transition-all duration-200">
        {file && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/60 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
              {cleaned ? 'Visual Comparison' : 'Source Preview'}
            </span>
            {naturalDimensions && (
              <span className="hidden sm:inline-flex rounded border border-zinc-200/90 bg-zinc-100/90 dark:border-zinc-800 dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                {naturalDimensions.width} × {naturalDimensions.height}
              </span>
            )}
          </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {cleaned && (
                <>
                  <div className="flex items-center rounded-lg border border-zinc-200/90 bg-zinc-100/90 p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-900 shadow-inner">
                    <button
                      onClick={() => setViewMode('slider')}
                      title="Split comparison slider"
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                        viewMode === 'slider'
                          ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Sliders size={12} />
                      <span className="hidden sm:inline">Split</span>
                    </button>
                    <button
                      onClick={() => setViewMode('side')}
                      title="Side-by-side view"
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                        viewMode === 'side'
                          ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Columns2 size={12} />
                      <span className="hidden sm:inline">Side by Side</span>
                    </button>
                    <button
                      onClick={() => setViewMode('clean')}
                      title="View clean derivative"
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                        viewMode === 'clean'
                          ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      Clean
                    </button>
                  </div>

                  {/* Immediate Download & Copy Button on Stage */}
                  <a
                    href={cleaned.url}
                    download={cleaned.name}
                    title={`Download ${cleaned.name}`}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                  >
                    <ArrowDownToLine size={13} />
                    <span>Download</span>
                  </a>

                  <button
                    onClick={copyImage}
                    title="Copy to clipboard"
                    className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition"
                  >
                    {copied ? (
                      <Check size={13} className="text-emerald-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </>
              )}

              {!cleaned && onClean && (
                <button
                  disabled={isBusy}
                  onClick={onClean}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition shadow-2xs"
                >
                  <Sparkles size={12} className="text-emerald-400 dark:text-emerald-600" />
                  <span>Remove Watermark</span>
                </button>
              )}

              <button
                onClick={() => setIsFullscreen(true)}
                title="Fullscreen inspector"
                className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
              >
                <Maximize2 size={13} />
              </button>
            </div>
        </div>
        )}

        {/* Main stage canvas */}
        <div
          ref={containerRef}
          onMouseMove={(e) => {
            if (isDragging || viewMode === 'slider') {
              if (e.buttons === 1 || isDragging) {
                handlePointerMove(e.clientX);
              }
            }
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsDragging(false)}
          className="relative flex flex-1 select-none items-center justify-center overflow-hidden rounded-xl bg-zinc-100/70 dark:bg-zinc-900/40 p-3 sm:p-4 border border-zinc-200/70 dark:border-zinc-800/50 min-h-[300px]"
        >
          {file ? (
            <div className="relative flex h-full max-h-[330px] w-full items-center justify-center">
              {/* Split Slider Mode */}
              {cleaned && viewMode === 'slider' ? (
                <div
                  className="relative h-full max-h-[310px] w-full max-w-[480px] overflow-hidden rounded-lg shadow-md cursor-ew-resize flex items-center justify-center"
                  onMouseDown={(e) => {
                    setIsDragging(true);
                    handlePointerMove(e.clientX);
                  }}
                  onTouchStart={(e) => {
                    setIsDragging(true);
                    if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
                  }}
                >
                  {/* Clean image (underneath full canvas) */}
                  <img
                    src={cleaned.url}
                    alt="Cleaned derivative"
                    className="h-full w-full object-contain pointer-events-none"
                  />

                  {/* Source image (clipped overlay) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                  >
                    <img
                      src={sourceUrl}
                      alt="Original source"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* Split Divider Handle */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-zinc-900/90 text-white shadow-lg backdrop-blur-sm">
                      <Split size={13} />
                    </div>
                  </div>

                  {/* Top-left & Top-right labels */}
                  <div className="absolute top-2 left-2 rounded-md bg-zinc-900/80 px-2 py-0.5 text-[10px] font-mono text-zinc-200 backdrop-blur-sm pointer-events-none">
                    Original
                  </div>
                  <div className="absolute top-2 right-2 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-sm pointer-events-none">
                    Sanitized
                  </div>
                </div>
              ) : cleaned && viewMode === 'side' ? (
                /* Side-by-Side Mode */
                <div className="grid grid-cols-2 gap-3 w-full h-full max-h-[310px] items-center">
                  <div className="relative flex flex-col items-center justify-center rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 p-2 h-full">
                    <img
                      src={sourceUrl}
                      alt="Original source"
                      className="max-h-[240px] w-auto max-w-full rounded object-contain"
                    />
                    <span className="absolute bottom-2 left-2 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[9px] font-mono text-zinc-200">
                      Original
                    </span>
                  </div>
                  <div className="relative flex flex-col items-center justify-center rounded-lg border border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.04] p-2 h-full">
                    <img
                      src={cleaned.url}
                      alt="Cleaned derivative"
                      className="max-h-[240px] w-auto max-w-full rounded object-contain"
                    />
                    <span className="absolute bottom-2 left-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-mono text-white">
                      Clean
                    </span>
                  </div>
                </div>
              ) : (
                /* Single Image Mode (Source or Clean) */
                <div className="relative flex h-full max-h-[310px] w-full items-center justify-center">
                  <img
                    src={
                      viewMode === 'clean' && cleaned ? cleaned.url : sourceUrl
                    }
                    alt={
                      viewMode === 'clean'
                        ? 'Cleaned derivative preview'
                        : 'Selected source preview'
                    }
                    className="max-h-[290px] w-auto max-w-full rounded-lg object-contain shadow-md"
                  />
                  <div className="absolute bottom-2 left-2 rounded-md border border-zinc-200/90 bg-white/95 px-2.5 py-1 text-[10px] font-mono text-zinc-700 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-300">
                    {viewMode === 'clean' && cleaned
                      ? '✨ Sanitized Raster (Metadata-Free)'
                      : '📄 Original Source'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty / Idle State Diagram */
            <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm">
              <div className="relative mb-4">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 blur-sm" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200/90 bg-white text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <Eye size={22} strokeWidth={1.8} />
                </div>
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
                Live Visual Stage
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                Upload or paste any ChatGPT or AI image to inspect cryptographic
                provenance credentials and verify clean raster copies.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 w-full pt-4 border-t border-zinc-200/80 dark:border-zinc-800/50">
                <div className="rounded-lg border border-zinc-200/80 bg-white/70 p-2 text-left dark:border-zinc-800/60 dark:bg-zinc-900/40">
                  <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Input
                  </span>
                  <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                    C2PA & EXIF
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200/80 bg-white/70 p-2 text-left dark:border-zinc-800/60 dark:bg-zinc-900/40">
                  <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Output
                  </span>
                  <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                    Clean Raster
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="mt-3.5 flex items-center justify-between text-[11px] text-zinc-500 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck
              size={14}
              className="text-emerald-500 dark:text-emerald-400"
            />
            <span>Zero network transfer · 100% Client-Side</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
            <Zap size={11} className="text-amber-500" />
            <span>WASM Pre-warmed</span>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal Dialog */}
      {isFullscreen && file && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md">
          <div className="relative flex flex-col max-h-[90vh] max-w-4xl w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">
                  Full View Inspector
                </span>
                {cleaned && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-500/30">
                    Sanitized
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {cleaned && (
                  <a
                    href={cleaned.url}
                    download={cleaned.name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    <ArrowDownToLine size={14} />
                    <span>Download Clean Copy</span>
                  </a>
                )}
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-4 max-h-[70vh]">
              <img
                src={cleaned ? cleaned.url : sourceUrl}
                alt="Fullscreen view"
                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
