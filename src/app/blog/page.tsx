import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { blogPosts } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Practical guides about image metadata, AI watermarks, Etsy mockups, and safer product image workflows.',
};

export default function BlogPage() {
  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 flex flex-col justify-between">
      <div>
        <Header />
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          <section className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-400">
              <ShieldCheck size={13} />
              Lumina Journal
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
              Guides for cleaner, safer images
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Practical articles about image provenance, AI metadata, marketplace mockups, and private browser-based workflows.
            </p>
          </section>

          <section className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article
                key={post.slug}
                className="group flex min-h-72 flex-col rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-emerald-900"
              >
                <Link href={`/blog/${post.slug}`} className="relative block h-40 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <img src={post.image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-md border border-white/80 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-300">
                      {post.category}
                    </span>
                  </div>
                </Link>
                <h2 className="mt-5 font-display text-lg font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={12} />
                      {post.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {post.readTime}
                    </span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    aria-label={`Read ${post.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700 dark:border-zinc-700 dark:group-hover:border-emerald-900 dark:group-hover:bg-emerald-950/30 dark:group-hover:text-emerald-400"
                  >
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
      <Footer label="Lumina Blog" note="Clear guidance for private image workflows." />
    </div>
  );
}
