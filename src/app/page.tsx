'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CircleHelp,
  FileCheck2,
  Info,
  Lock,
  RotateCcw,
  ScanSearch,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import { auditFile, formatBytes, isSignalStatus } from '@/lib/audit';
import { cleanImage, sanitizeImageRaster, type CleanedRasterResult } from '@/lib/cleaner';
import { preloadC2pa } from '@/lib/c2pa';
import type { Audit, CleanResult, Workflow } from '@/lib/types';

import { ErrorBoundary } from '@/components/error-boundary';
import { Header } from '@/components/header';
import { FileDrop } from '@/components/file-drop';
import { ImageStage } from '@/components/image-stage';
import { InfoRow } from '@/components/info-row';
import { MetadataCard } from '@/components/metadata-card';
import { CleanResultCard } from '@/components/clean-result-card';
import { EducationSection } from '@/components/education-section';
import { PrinciplesSection } from '@/components/principles-section';
import { FaqSection } from '@/components/faq-section';
import { Footer } from '@/components/footer';
import { MobileActionBar } from '@/components/mobile-action-bar';

function StudioApp() {
  const [file, setFile] = useState<File | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [cleaned, setCleaned] = useState<CleanResult | null>(null);
  const [workflow, setWorkflow] = useState<Workflow>('idle');
  const [error, setError] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [showEducation, setShowEducation] = useState(false);

  const educationRef = useRef<HTMLDivElement>(null);
  const auditCounterRef = useRef<number>(0);
  const cleanedUrlRef = useRef<string | null>(null);
  const preCleanedResultRef = useRef<CleanedRasterResult | null>(null);
  const cleanPromiseRef = useRef<Promise<CleanedRasterResult | null> | null>(null);

  // Pre-warm WASM SDK immediately on mount
  useEffect(() => {
    preloadC2pa();
  }, []);

  const handleFile = useCallback(async (nextFile: File) => {
    // Increment counter to ignore stale out-of-order async promises
    const currentAuditId = ++auditCounterRef.current;

    // Revoke previous clean URL if any
    if (cleanedUrlRef.current) {
      URL.revokeObjectURL(cleanedUrlRef.current);
      cleanedUrlRef.current = null;
    }
    if (preCleanedResultRef.current?.url) {
      URL.revokeObjectURL(preCleanedResultRef.current.url);
      preCleanedResultRef.current = null;
    }

    setFile(nextFile);
    setAudit(null);
    setCleaned(null);
    setError('');
    setWorkflow('auditing');
    setOpenGroup(null);

    // Parallel Pipeline: Pre-sanitize raster in background while inspecting metadata
    const cleanPromise = sanitizeImageRaster(nextFile)
      .then((res) => {
        if (auditCounterRef.current === currentAuditId) {
          preCleanedResultRef.current = res;
        } else {
          URL.revokeObjectURL(res.url);
        }
        return res;
      })
      .catch(() => null);

    cleanPromiseRef.current = cleanPromise;

    try {
      const result = await auditFile(nextFile);
      if (auditCounterRef.current === currentAuditId) {
        setAudit(result);
        setWorkflow('audited');
      }
    } catch (reason) {
      if (auditCounterRef.current === currentAuditId) {
        setError(
          reason instanceof Error ? reason.message : 'Could not inspect this file.',
        );
        setWorkflow('error');
      }
    }
  }, []);

  const handleClean = async () => {
    if (!file || !audit || workflow === 'cleaning') return;
    setWorkflow('cleaning');
    setError('');

    try {
      const access = await fetch('/api/studio/access?tool=watermark');
      if (!access.ok) {
        const data = (await access.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || 'This tool is turned off.');
        setWorkflow(access.status === 401 ? 'idle' : 'error');
        if (access.status === 401) window.location.assign('/login');
        return;
      }

      let raster = preCleanedResultRef.current;
      if (!raster && cleanPromiseRef.current) {
        raster = await cleanPromiseRef.current;
      }
      if (!raster) {
        raster = await sanitizeImageRaster(file);
      }

      if (cleanedUrlRef.current && cleanedUrlRef.current !== raster.url) {
        URL.revokeObjectURL(cleanedUrlRef.current);
      }
      cleanedUrlRef.current = raster.url;

      const removed = audit.groups.filter((group) => isSignalStatus(group.status)).length;
      const result: CleanResult = {
        ...raster,
        removed,
      };

      setCleaned(result);
      setWorkflow('cleaned');
      void fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'watermark', detail: `Cleaned ${file.name}` }),
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not create a cleaned copy.',
      );
      setWorkflow('error');
    }
  };

  const reset = () => {
    auditCounterRef.current++;
    if (cleanedUrlRef.current) {
      URL.revokeObjectURL(cleanedUrlRef.current);
      cleanedUrlRef.current = null;
    }
    if (preCleanedResultRef.current?.url) {
      URL.revokeObjectURL(preCleanedResultRef.current.url);
      preCleanedResultRef.current = null;
    }
    cleanPromiseRef.current = null;
    setFile(null);
    setAudit(null);
    setCleaned(null);
    setWorkflow('idle');
    setError('');
    setOpenGroup(null);
  };

  const foundCount = useMemo(
    () =>
      audit?.groups.filter((group) => isSignalStatus(group.status)).length ?? 0,
    [audit],
  );

  const clearCount = useMemo(
    () =>
      audit?.groups.filter(
        (group) => group.status === 'clear' || group.status === 'none',
      ).length ?? 0,
    [audit],
  );

  const isBusy = workflow === 'auditing' || workflow === 'cleaning';

  useEffect(() => {
    return () => {
      if (cleanedUrlRef.current) {
        URL.revokeObjectURL(cleanedUrlRef.current);
        cleanedUrlRef.current = null;
      }
      if (preCleanedResultRef.current?.url) {
        URL.revokeObjectURL(preCleanedResultRef.current.url);
        preCleanedResultRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-zinc-800 dark:selection:text-zinc-100 flex flex-col justify-between transition-colors duration-150">
      <div>
        <Header />

        <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-28 lg:pb-16">
          {/* Hero Header */}
          <section className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3.5 py-1 text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 mb-5 tracking-wide shadow-2xs backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Etsy Mockups</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15]">
              <span className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-300 dark:via-emerald-400 dark:to-teal-300">
                Etsy Mockups
              </span>
              <br />
              <span className="text-zinc-950 dark:text-zinc-50">AI Watermark Remover</span>
            </h1>

            <p className="mt-4 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto">
              Remove AI watermarks and hidden metadata from Etsy mockups in your browser. Your files stay on this device and are never uploaded.
            </p>

            {/* Quick Feature Badges */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 shadow-2xs">
                <Zap size={13} className="text-amber-500" />
                <span>Instant results</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 shadow-2xs">
                <Lock size={13} className="text-emerald-500" />
                <span>Private by design</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/80 px-2.5 py-1 text-zinc-700 dark:text-zinc-300 shadow-2xs">
                <Sparkles size={13} className="text-indigo-500" />
                <span>Quality preserved</span>
              </span>
            </div>
          </section>

          {/* Primary Workspace Grid */}
          <section className="grid gap-6 lg:grid-cols-12 items-stretch">
            {/* Left: Upload Card */}
            <div className="lg:col-span-6 rounded-2xl border border-zinc-200/80 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-950/70 p-5 sm:p-6 flex flex-col justify-between shadow-sm dark:shadow-none transition-all duration-200">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200/80 dark:border-zinc-800/60">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Step 01
                  </span>
                </div>

                <FileDrop
                  onFiles={(files) => {
                    const nextFile = files[0];
                    if (nextFile) void handleFile(nextFile);
                  }}
                  busy={isBusy}
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/60">
                <CircleHelp size={13} className="text-zinc-400 shrink-0" />
                <span>Zero server transfers. All pixel re-encoding happens right in your browser.</span>
              </div>
            </div>

            {/* Right: Stage Canvas */}
            <div className="lg:col-span-6">
              <ImageStage
                file={file}
                cleaned={cleaned}
                onClean={handleClean}
                isBusy={isBusy}
              />
            </div>
          </section>

          {/* Error Banner */}
          {error && (
            <div
              data-testid="status-error"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300"
            >
              <AlertCircle
                className="mt-0.5 shrink-0 text-rose-500 dark:text-rose-400"
                size={16}
              />
              <div className="flex-1">
                <p className="font-semibold text-rose-700 dark:text-rose-200">Audit inspection failed</p>
                <p className="mt-0.5 text-rose-600/80 dark:text-rose-300/80">{error}</p>
              </div>
              <button
                data-testid="button-dismiss-error"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="focus-ring rounded text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Auditing Progress */}
          {workflow === 'auditing' && (
            <div
              data-testid="status-auditing"
              className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/80 p-5 shadow-sm dark:shadow-none"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <ScanSearch size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Inspecting ChatGPT metadata & C2PA manifest...
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Scanning for OpenAI DALL·E provenance headers, EXIF structures, and cryptographic seals
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className="scan-line h-full w-1/3 rounded-full bg-emerald-500" />
              </div>
            </div>
          )}

          {/* Audit Results Section */}
          {audit && workflow !== 'auditing' && (
            <section data-testid="section-audit-results" className="fade-up mt-8">
              {/* Summary Score Card */}
              <div
                className={`mb-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between shadow-2xs ${
                  foundCount > 0
                    ? 'border-amber-500/30 bg-amber-500/[0.06] dark:border-amber-500/20 dark:bg-amber-500/[0.03]'
                    : 'border-emerald-500/30 bg-emerald-500/[0.06] dark:border-emerald-500/20 dark:bg-emerald-500/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                      foundCount > 0
                        ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {foundCount > 0 ? <Info size={20} /> : <Check size={20} />}
                  </div>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                      Audit Inspection Complete
                    </span>
                    <h2 className="font-display text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {foundCount > 0
                        ? `${foundCount} metadata & provenance marker group${foundCount === 1 ? '' : 's'} detected`
                        : 'No ordinary metadata markers detected'}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t border-zinc-200 dark:border-zinc-800/80 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <div>
                    <p className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {foundCount}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                      Signals
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {clearCount}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                      Clear
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Grid */}
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Left: File Record Card */}
                <div className="lg:col-span-5 rounded-2xl border border-zinc-200/80 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-950/70 p-5 sm:p-6 flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-150">
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/60 pb-3.5 mb-3.5">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          Step 02
                        </span>
                        <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                          Asset Record
                        </h3>
                      </div>
                      <button
                        data-testid="button-start-over"
                        onClick={reset}
                        className="focus-ring flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-100/90 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 shadow-2xs"
                        title="Upload another image"
                      >
                        <RotateCcw size={13} />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800/60 dark:bg-zinc-900/40 px-4 py-1.5 my-3">
                      <InfoRow label="File Name" value={audit.name} />
                      <InfoRow label="MIME Type" value={audit.type} mono />
                      <InfoRow
                        label="File Size"
                        value={formatBytes(audit.size)}
                        mono
                      />
                      <InfoRow
                        label="Dimensions"
                        value={`${audit.width} × ${audit.height} px`}
                        mono
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
                    Standard metadata markers are evaluated with lightweight client-side parsers; C2PA claims utilize the official WebAssembly verification engine.
                  </p>
                </div>

                {/* Right: Signals & Clean Action */}
                <div className="lg:col-span-7 rounded-2xl border border-zinc-200/80 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-950/70 p-5 sm:p-6 flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-150">
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/60 pb-3.5 mb-3.5">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          Step 03
                        </span>
                        <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                          Provenance & Metadata Readout
                        </h3>
                      </div>
                      <span
                        data-testid="text-marker-count"
                        className={`rounded-md px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide border ${
                          foundCount > 0
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-500/20 dark:text-amber-400'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/20 dark:text-emerald-400'
                        }`}
                      >
                        {foundCount} found
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/60">
                      {audit.groups.map((group) => (
                        <MetadataCard
                          key={group.id}
                          group={group}
                          open={openGroup === group.id}
                          onToggle={() =>
                            setOpenGroup(
                              openGroup === group.id ? null : group.id,
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Clean Copy Callout & Action */}
                  <div className="mt-6 flex flex-col gap-3.5 rounded-xl border border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
                    <div>
                      <p className="font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        Remove ChatGPT Metadata & Watermarks
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Re-encodes canvas pixels locally. All C2PA manifests and metadata are stripped.
                      </p>
                    </div>
                    <button
                      data-testid="button-clean-image"
                      disabled={isBusy}
                      onClick={handleClean}
                      className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition disabled:opacity-50 shadow-sm"
                    >
                      {workflow === 'cleaning' ? (
                        <ScanSearch size={14} className="scan-line" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {workflow === 'cleaning'
                        ? 'Removing Watermark...'
                        : 'Remove Watermark'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Clean Output Section */}
          {cleaned && audit && (
            <CleanResultCard cleaned={cleaned} onReset={reset} />
          )}

          {/* Education & Guides */}
          <EducationSection
            ref={educationRef}
            showEducation={showEducation}
            onToggleEducation={() => setShowEducation((value) => !value)}
          />

          {/* Guarantees & Principles */}
          <PrinciplesSection />

          {/* Crawlable FAQ Section */}
          <FaqSection />
        </main>
      </div>

      {/* Floating Action Bar for Mobile Viewports */}
      <MobileActionBar
        workflow={workflow}
        file={file}
        cleaned={cleaned}
        foundCount={foundCount}
        onClean={handleClean}
        onReset={reset}
      />

      <Footer />
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary>
      <StudioApp />
    </ErrorBoundary>
  );
}
