'use client';

import React, { forwardRef } from 'react';
import { ChevronDown, FileCode2, ShieldAlert, Sparkles } from 'lucide-react';

interface EducationSectionProps {
  showEducation: boolean;
  onToggleEducation: () => void;
}

export const EducationSection = forwardRef<HTMLDivElement, EducationSectionProps>(
  ({ showEducation, onToggleEducation }, ref) => {
    return (
      <section
        ref={ref}
        className="mt-14 rounded-2xl border border-violet-200/70 bg-white/75 dark:border-indigo-400/20 dark:bg-[#10162c]/60 p-5 sm:p-7 shadow-sm dark:shadow-none transition-all duration-150"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <FileCode2 size={20} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                C2PA Content Credentials Guide
              </h3>
              <p className="text-xs text-zinc-500">
                Cryptographic provenance vs. ordinary image metadata
              </p>
            </div>
          </div>

          <button
            data-testid="button-learn-c2pa"
            onClick={onToggleEducation}
            className="focus-ring flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-transparent px-3.5 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            <span>{showEducation ? 'Hide Guide' : 'Read Explainer'}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                showEducation ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {showEducation && (
          <div className="fade-up mt-6 space-y-4 border-t border-zinc-200/80 dark:border-zinc-800/60 pt-5 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/40">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold mb-2">
                  <Sparkles size={15} className="text-emerald-500 dark:text-emerald-400" />
                  <span>What C2PA manifests verify</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-xs">
                  C2PA records cryptographically bind digital assets to their source device, editing history, or AI model declarations via digital signatures. They provide verifiable tamper-evident history.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/40">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold mb-2">
                  <ShieldAlert size={15} className="text-amber-500 dark:text-amber-400" />
                  <span>How cleaning affects provenance</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-xs">
                  Re-encoding raster pixels creates a new derivative image file without metadata or C2PA manifest containers. The output is a clean derivative copy — the original image remains unchanged.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  },
);

EducationSection.displayName = 'EducationSection';
