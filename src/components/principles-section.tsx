'use client';

import { Lock, ScanSearch, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const PRINCIPLES = [
  {
    icon: Lock,
    title: 'Zero Network Uploads',
    copy: 'All metadata extraction, C2PA manifest parsing, and canvas re-encoding run 100% in your browser.',
    badge: 'Private',
  },
  {
    icon: Zap,
    title: 'Instant WASM Verification',
    copy: 'Reads official Content Credentials using WebAssembly to validate signatures and claims in milliseconds.',
    badge: 'Fast',
  },
  {
    icon: ShieldCheck,
    title: 'Non-Destructive Output',
    copy: 'Generates a separate sanitized derivative raster copy without ever touching or modifying your original file.',
    badge: 'Lossless',
  },
];

export function PrinciplesSection() {
  return (
    <section className="mt-14 grid gap-4 sm:grid-cols-3">
      {PRINCIPLES.map(({ icon: Icon, title, copy, badge }, index) => (
        <div
          data-testid={`card-principle-${index}`}
          key={title}
          className="rounded-2xl border border-violet-200/70 bg-white/75 p-5 sm:p-6 shadow-sm dark:border-indigo-400/20 dark:bg-[#10162c]/60 dark:shadow-none transition-all duration-200 hover:border-violet-300 dark:hover:border-indigo-400/40"
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              <Icon size={18} />
            </div>
            <span className="rounded-md border border-zinc-200/80 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
              {badge}
            </span>
          </div>
          <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {copy}
          </p>
        </div>
      ))}
    </section>
  );
}
