'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Gift, Loader2, Users } from 'lucide-react';

type ReferralSummary = {
  referralCode: string;
  referralCount: number;
  rewardedReferrals: number;
  creditsEarned: number;
  rewardCredits: number;
};

export function ReferralsPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/referrals', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load your referral details. Please refresh the page.');
        const data = (await response.json()) as ReferralSummary;
        if (!cancelled) setSummary(data);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load referral details.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyInviteLink() {
    if (!summary) return;
    const url = `${window.location.origin}/register?ref=${encodeURIComponent(summary.referralCode)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Invite link copied. You and your friend receive credits after signup.');
    } catch {
      setError('Could not copy the invite link. Please try again in a secure browser context.');
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Back to studio
      </Link>

      <section className="overflow-hidden rounded-[30px] border border-zinc-200/80 bg-white/90 shadow-[0_24px_70px_-44px_rgba(6,78,59,0.35)] dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-6 py-10 text-center text-white sm:px-10 sm:py-14">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
            <Gift className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Invite friends, earn credits</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-300">
            Share your personal invite link. When a new user signs up with it, both of you receive {summary?.rewardCredits ?? 300} bonus credits.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {!summary ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />Loading your referral details…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="flex items-center gap-2 text-sm font-medium text-zinc-500"><Users className="h-4 w-4" />Successful referrals</p>
                  <p className="mt-2 text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">{summary.rewardedReferrals}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="flex items-center gap-2 text-sm font-medium text-zinc-500"><Gift className="h-4 w-4" />Credits earned</p>
                  <p className="mt-2 text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">{summary.creditsEarned.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/25">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Your referral code</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider text-emerald-800 dark:text-emerald-300">{summary.referralCode}</p>
                <button
                  type="button"
                  onClick={() => void copyInviteLink()}
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  <Copy className="h-4 w-4" />Copy invite link
                </button>
                {notice && <p role="status" className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">{notice}</p>}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
