'use client';

import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CreditCard,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

type Profile = {
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  createdAt: number;
  credits: number;
  dailyCreditsRemaining: number;
  bonusCredits: number;
  unlimitedCredits: boolean;
  activePlan: { name: string; credits: number; activatedAt: number } | null;
};

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || 'Could not update your profile.';
}

export function ProfilePage({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const passwordChangeRequested = Boolean(currentPassword || newPassword || confirmPassword);
  const initials = displayName.trim().charAt(0).toUpperCase() || profile.username[0].toUpperCase();

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (passwordChangeRequested && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    const body: { displayName: string; currentPassword?: string; newPassword?: string } = {
      displayName,
    };
    if (passwordChangeRequested) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readError(response));
      const updated = (await response.json()) as { displayName: string };

      setDisplayName(updated.displayName);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Your profile has been updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update your profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to studio
      </Link>

      <section className="overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white/90 shadow-[0_24px_70px_-44px_rgba(6,78,59,0.35)] dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-6 py-8 text-white sm:px-9 sm:py-10">
          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-3xl font-extrabold shadow-inner">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Account profile
              </p>
              <h1 className="mt-1 truncate font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-300">@{profile.username}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold capitalize text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              {profile.role}
            </span>
          </div>
        </div>

        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                Your studio
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                Account overview
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Watermark credits</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {profile.role === 'admin' || profile.unlimitedCredits ? 'Unlimited' : profile.credits}
                    </p>
                  </div>
                </div>
                {profile.role !== 'admin' && !profile.unlimitedCredits && (
                  <p className="mt-3 text-xs text-zinc-500">
                    Purchased, referral, or admin-granted credits. No automatic daily refill.
                  </p>
                )}
                {profile.activePlan && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Latest activated plan
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-emerald-950 dark:text-emerald-100">
                      {profile.activePlan.name}
                    </p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      {profile.activePlan.credits.toLocaleString()} credits added · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(profile.activePlan.activatedAt)}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Member since</p>
                    <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(profile.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <p className="text-xs leading-5 text-emerald-900/80 dark:text-emerald-200/80">
                  Your original images stay on your device while you use the watermark cleaner.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit your profile</h2>
                <p className="text-xs text-zinc-500">Update your display name or sign-in password.</p>
              </div>
            </div>

            {error && (
              <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                {notice}
              </p>
            )}

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Display name</span>
              <input
                type="text"
                required
                maxLength={60}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950"
              />
            </label>

            <div className="mb-3 mt-6 flex items-center gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <KeyRound className="h-4 w-4 text-zinc-500" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Change password</h3>
              <span className="text-xs text-zinc-400">(optional)</span>
            </div>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Required to set a new password"
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950"
              />
            </label>
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={200}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat new password"
                  className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {busy ? 'Saving changes…' : 'Save profile'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
