import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { blogPosts } from '@/lib/blog-posts';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) notFound();

  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 flex flex-col justify-between">
      <div>
        <Header />
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 transition hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <ArrowLeft size={14} />
            Back to Blog
          </Link>

          <header className="mt-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-400">
              <ShieldCheck size={12} />
              {post.category}
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
              {post.title}
            </h1>
            <div className="mt-5 flex items-center gap-4 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} />
                {post.date}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                {post.readTime}
              </span>
            </div>
          </header>

          <img
            src={post.image}
            alt=""
            className="mt-8 aspect-video w-full rounded-2xl border border-zinc-200/70 object-cover shadow-sm dark:border-zinc-800"
          />

          <article className="mx-auto mt-10 max-w-2xl">
            <p className="text-base leading-8 text-zinc-700 dark:text-zinc-300">
              {post.intro}
            </p>
            {post.sections.map((section) => (
              <section key={section.heading} className="mt-9">
                <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <div className="mt-12 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Want to inspect or clean an image?
              </p>
              <p className="mt-1 text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                Lumina processes supported images locally in your browser without uploading your source file.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                Open Lumina
              </Link>
            </div>
          </article>
        </main>
      </div>
      <Footer label="Lumina Blog" note="Clear guidance for private image workflows." />
    </div>
  );
}
