'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Info,
  Gift,
  LogOut,
  Mail,
  Menu,
  Shield,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { Mark } from './mark';
import { useStudio } from './studio-gate';

const links = [
  { href: '/', label: 'Watermark', tool: 'watermark' as const },
  { href: '/keywords', label: 'Keywords', tool: 'keywords' as const },
  { href: '/referrals', label: 'Referrals', tool: null },
  { href: '/pricing', label: 'Pricing', tool: null },
  { href: '/blog', label: 'Blog', tool: null },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const studio = useStudio();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = studio.role === 'admin';
  const visibleLinks = isAdmin
    ? []
    : links.filter((link) => link.tool === null || studio.tools[link.tool]);
  const profileName = studio.displayName || studio.username || 'Profile';
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
      if (event.target instanceof Node && !aboutRef.current?.contains(event.target)) {
        setAboutOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setAboutOpen(false);
        setMobileMenuOpen(false);
      }
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
    setAboutOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setProfileOpen(false);
    setMobileMenuOpen(false);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }
      window.location.assign('/login');
    } catch (error) {
      console.error('Logout request failed', error);
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 dark:border-zinc-800/80 dark:bg-zinc-950/95">
      <div className="relative mx-auto grid h-[64px] max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link
          href="/"
          aria-label="Lumina Studio home"
          className="group flex shrink-0 items-center gap-2 rounded-lg focus-ring"
        >
          <span className="flex h-8 w-8 items-center justify-center">
            <Mark size={30} />
          </span>
          <div className="hidden items-baseline gap-2 sm:flex">
            <span className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Lumina
            </span>
          </div>
        </Link>

        {!isAdmin && <nav
          className={`mx-auto hidden h-full min-w-0 items-center justify-center gap-1 overflow-visible sm:flex sm:gap-5 ${visibleLinks.length === 0 ? 'sm:hidden' : ''}`}
          aria-label="Tools"
        >
          {visibleLinks.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex h-full shrink-0 items-center px-1.5 text-[11px] font-semibold transition-colors sm:px-1 sm:text-xs ${
                  active
                    ? 'text-emerald-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-500 dark:text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="relative h-full" ref={aboutRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={aboutOpen}
              onClick={() => setAboutOpen((open) => !open)}
              className={`relative inline-flex h-full shrink-0 cursor-pointer items-center gap-1 px-1.5 text-[11px] font-semibold transition-colors sm:px-1 sm:text-xs ${
                pathname === '/about' || pathname === '/contact'
                  ? 'text-emerald-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-500 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              About
              <ChevronDown className={`h-3 w-3 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
            </button>
            {aboutOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[68px] z-[70] w-48 overflow-hidden rounded-xl border border-zinc-200/90 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(24,24,27,.22)] dark:border-zinc-800 dark:bg-zinc-950"
              >
                <Link
                  href="/about"
                  role="menuitem"
                  onClick={() => setAboutOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                >
                  <Info size={14} />
                  About Lumina
                </Link>
                <Link
                  href="/contact"
                  role="menuitem"
                  onClick={() => setAboutOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                >
                  <Mail size={14} />
                  Contact Us
                </Link>
              </div>
            )}
          </div>
        </nav>}

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="justify-self-end rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus-ring dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
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
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? 'Signing out...' : 'Log out'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="absolute left-3 right-3 top-[calc(100%+8px)] z-50 max-h-[calc(100dvh-80px)] overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white/95 p-2.5 shadow-[0_18px_45px_-18px_rgba(24,24,27,.35)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden"
          >
            <div className="grid gap-2">
              {studio.ready && studio.role && (
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      {studio.displayName || studio.username ? profileInitial : <UserRound className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{profileName}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {isAdmin ? 'Administrator' : 'Lumina member'}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <Sparkles className="h-3 w-3" />
                      {isAdmin || studio.unlimitedCredits ? 'Unlimited' : studio.credits}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-zinc-200/80 pt-2.5 dark:border-zinc-800">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Admin
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      Profile
                    </Link>
                    <Link
                      href="/referrals"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Referrals
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {loggingOut ? 'Signing out...' : 'Log out'}
                    </button>
                  </div>
                </div>
              )}
              {!isAdmin && <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                  Workspace
                </p>
                <div className="grid gap-0.5">
                  {visibleLinks.map((link) => {
                    const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>}
              {!isAdmin && <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                  More
                </p>
                <div className="grid gap-0.5">
                  <Link
                    href="/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      pathname === '/about'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    About Lumina
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      pathname === '/contact'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Contact Us
                  </Link>
                </div>
              </div>}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
