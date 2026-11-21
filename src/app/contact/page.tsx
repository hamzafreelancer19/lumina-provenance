import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact-form';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact Lumina for product support, account help, billing questions, or partnership inquiries.',
};

export default function ContactPage() {
  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 flex flex-col justify-between">
      <div>
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          <section className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                Contact Lumina
              </span>
              <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
                How can we help?
              </h1>
              <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                Send a question about Lumina, account access, pricing, or partnerships. We normally respond within one business day.
              </p>
              <div className="mt-6 rounded-xl border border-zinc-200/80 bg-white/70 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
                Please do not include passwords, payment credentials, private keys, or sensitive image files in your message.
              </div>
            </div>
            <ContactForm />
          </section>
        </main>
      </div>
      <Footer label="Contact Lumina" note="Questions, feedback, and partnership inquiries." />
    </div>
  );
}
