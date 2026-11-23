import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { Mark } from './mark';

export function Footer({
  label = 'Private image metadata studio',
  note = 'Processed on your device. Your files are never uploaded.',
}: {
  label?: string;
  note?: string;
}) {
  return (
  <footer className="mt-16 border-t border-zinc-200/80 bg-white/75 text-zinc-500 transition-colors duration-150 dark:border-zinc-800/80 dark:bg-zinc-950/60">
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="max-w-sm">
          <Link href="/" aria-label="Lumina home" className="inline-flex items-center gap-2.5 rounded-lg focus-ring">
            <Mark size={30} />
            <span className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Lumina
            </span>
          </Link>
          <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{label}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
            <LockKeyhole className="h-3.5 w-3.5" />
            Private by design
          </div>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:pt-1">
          <Link
            href="/about"
            className="inline-flex items-center gap-1 font-semibold text-zinc-600 transition hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-400"
          >
            About
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1 font-semibold text-zinc-600 transition hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-400"
          >
            Contact
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 font-semibold text-zinc-600 transition hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-400"
          >
            Pricing
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 font-semibold text-zinc-600 transition hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-400"
          >
            Blog
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
        </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-zinc-200/80 pt-4 text-[11px] text-zinc-400 dark:border-zinc-800/80 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Lumina. Built for private workflows.</p>
        <p className="inline-flex items-center gap-1.5">
          <LockKeyhole className="h-3 w-3" />
          {note}
        </p>
        </div>
      </div>
    </footer>
  );
}
