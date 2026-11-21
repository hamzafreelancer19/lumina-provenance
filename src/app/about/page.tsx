import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Lock, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'About Lumina',
  description:
    'Learn about Lumina, a private browser-based image provenance and metadata cleaning studio.',
};

export default function AboutPage() {
  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 flex flex-col justify-between">
      <div>
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          <section className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-400">
              <ShieldCheck size={13} />
              About Lumina
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
              Cleaner images. Clearer provenance.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Lumina is a private image studio for inspecting AI provenance, removing supported metadata, cleaning raster copies, and preparing marketplace-ready product images.
            </p>
          </section>

          <section className="mt-12 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
              <Lock size={20} className="text-emerald-600" />
              <h2 className="mt-4 font-display text-lg font-bold text-zinc-950 dark:text-zinc-100">
                Privacy comes first
              </h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                Supported image processing happens locally in your browser. Original files are not required to be uploaded to a Lumina server.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
              <Zap size={20} className="text-amber-500" />
              <h2 className="mt-4 font-display text-lg font-bold text-zinc-950 dark:text-zinc-100">
                Built for speed
              </h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                Inspect, clean, name, and export an image in one focused workflow without leaving the studio.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
              <Sparkles size={20} className="text-indigo-500" />
              <h2 className="mt-4 font-display text-lg font-bold text-zinc-950 dark:text-zinc-100">
                Practical outputs
              </h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                Lumina is designed for polished mockups, product photography, and repeatable marketplace exports.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
              <ShieldCheck size={20} className="text-teal-600" />
              <h2 className="mt-4 font-display text-lg font-bold text-zinc-950 dark:text-zinc-100">
                Responsible use
              </h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                Keep original files and process only images you own or are authorized to edit. Removing provenance does not create ownership.
              </p>
            </div>
          </section>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Open Lumina
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
            >
              Contact us
            </Link>
          </div>
        </main>
      </div>
      <Footer label="About Lumina" note="Private tools for cleaner, safer image workflows." />
    </div>
  );
}
