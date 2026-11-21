'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

export function ContactForm() {
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(false);
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const subject = String(form.get('subject') || 'Lumina inquiry').trim();
    const message = String(form.get('message') || '').trim();
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || 'Could not send your message.');
      event.currentTarget.reset();
      setSent(true);
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : 'Could not send your message.');
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950/70"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Name
          <input
            name="name"
            required
            autoComplete="name"
            className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <label className="mt-4 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        Subject
        <select
          name="subject"
          className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option>General question</option>
          <option>Account support</option>
          <option>Billing and pricing</option>
          <option>Partnership inquiry</option>
        </select>
      </label>
      <label className="mt-4 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        Message
        <textarea
          name="message"
          required
          rows={6}
          className="mt-2 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm font-normal leading-6 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
          {sent ? <CheckCircle2 size={12} className="text-emerald-600" /> : null}
          {sent ? 'Message sent successfully' : 'Your message is sent securely'}
        </span>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Send size={14} />
          {sent ? 'Opening email…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
