'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Loader2 } from 'lucide-react';
import { Mark } from '@/components/mark';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error || 'Sign-in failed. Try again.');
        setPending(false);
        return;
      }
      router.replace(next || '/');
      router.refresh();
    } catch {
      setError('Could not reach the server. Try again.');
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f6f7f4] text-zinc-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-[-8%] h-72 w-72 rounded-full bg-emerald-300/40 blur-3xl" />
        <div className="absolute right-[-8%] top-1/3 h-80 w-80 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute bottom-[-12%] left-1/3 h-72 w-72 rounded-full bg-emerald-100 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-10">
        <section className="w-full rounded-[28px] border border-white/80 bg-white/90 p-7 shadow-[0_24px_80px_-32px_rgba(6,78,59,0.35)] backdrop-blur-md sm:p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <Mark size={52} />
            <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Lumina Studio
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
              Sign in to open the studio. Nothing here is available without a session.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Username</span>
              <input
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Password</span>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 pr-12 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(5,150,105,0.9)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {pending ? 'Signing in' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
