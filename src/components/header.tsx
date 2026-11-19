'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gift, LogOut, Shield, Sparkles, UserRound } from 'lucide-react';
import { Mark } from './mark';
import { useStudio } from './studio-gate';

const links = [
  { href: '/', label: 'Watermark', tool: 'watermark' as const },
  { href: '/create', label: 'Mockups', tool: 'mockups' as const },
  { href: '/seo', label: 'SEO', tool: 'seo' as const },
  { href: '/keywords', label: 'Keywords', tool: 'keywords' as const },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const studio = useStudio();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const isAdmin = studio.role === 'admin';
  const visibleLinks = links.filter((link) => isAdmin || studio.tools[link.tool]);
  const profileName = studio.displayName || studio.username || 'Profile';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

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

        <nav className={`flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 sm:gap-1 ${visibleLinks.length === 0 ? 'hidden' : ''}`} aria-label="Tools">
          {visibleLinks.map((link) => {
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
          {studio.ready && studio.role && (
            <span
              title={
                isAdmin || studio.unlimitedCredits
                  ? 'Unlimited credits'
                  : 'Credits do not refill automatically. Watermark removal costs 5 credits per image.'
              }
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-emerald-800"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isAdmin || studio.unlimitedCredits ? (
                <span>Unlimited</span>
              ) : (
                <>
                  {studio.credits}
                  <span className="hidden sm:inline">credits</span>
                </>
              )}
            </span>
          )}
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
          {studio.ready && studio.role && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:gap-2 sm:pr-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  {studio.displayName || studio.username ? profileInitial : <UserRound className="h-4 w-4" />}
                </span>
                <span className="hidden max-w-28 truncate sm:inline">{profileName}</span>
                <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  aria-label="Profile"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {profileName}
                    </p>
                    {studio.username && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">@{studio.username}</p>
                    )}
                  </div>
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <UserRound className="h-4 w-4" />
                    Your profile
                  </Link>
                  <Link
                    href="/referrals"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Gift className="h-4 w-4" />
                    Referrals
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
