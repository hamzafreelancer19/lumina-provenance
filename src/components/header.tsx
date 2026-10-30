'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Shield } from 'lucide-react';
import { Mark } from './mark';

const links = [
  { href: '/', label: 'Watermark' },
  { href: '/create', label: 'Mockups' },
  { href: '/seo', label: 'SEO' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch('/api/auth/me')
      .then(async (response) => {
        if (cancel) return;
        if (response.status === 401) {
          await fetch('/api/auth/logout', { method: 'POST' });
          if (cancel) return;
          router.replace('/login');
          router.refresh();
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as { role?: string };
        if (!cancel) setIsAdmin(data.role === 'admin');
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/85 dark:border-zinc-800/80 dark:bg-zinc-950/85 backdrop-blur-md transition-colors duration-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-15">
        <div className="flex items-center gap-2.5">
          <Mark size={30} />
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Lumina
            </span>
            <span className="hidden text-[10px] text-emerald-600 dark:text-emerald-400 font-mono tracking-wider uppercase font-semibold sm:inline-block">
              Studio
            </span>
          </div>
        </div>

        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 sm:gap-1" aria-label="Tools">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                  active
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          {isAdmin && (
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 ${
                pathname.startsWith('/admin')
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
              <span className="sr-only sm:hidden">Admin</span>
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log out</span>
            <span className="sr-only sm:hidden">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
