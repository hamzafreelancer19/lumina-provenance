'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mark } from './mark';

const links = [
  { href: '/', label: 'Watermark' },
  { href: '/create', label: 'Mockups' },
];

export function Header() {
  const pathname = usePathname();

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

        <nav className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1" aria-label="Tools">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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

        {pathname === '/' && (
        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-100/90 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 lg:inline-flex shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Client-Side Only
          </span>
        </div>
        )}
      </div>
    </header>
  );
}
