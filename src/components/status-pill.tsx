import type { GroupStatus } from '@/lib/types';

export function StatusPill({ status }: { status: GroupStatus }) {
  const config: Record<GroupStatus, { label: string; className: string }> = {
    found: {
      label: 'Found',
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/20',
    },
    detected: {
      label: 'Detected',
      className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 dark:border-sky-500/20',
    },
    verified: {
      label: 'Verified',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/20',
    },
    invalid: {
      label: 'Invalid',
      className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 dark:border-rose-500/20',
    },
    unverified: {
      label: 'Needs review',
      className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 dark:border-orange-500/20',
    },
    clear: {
      label: 'Clear',
      className: 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/50',
    },
    none: {
      label: 'No credentials',
      className: 'bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/40',
    },
    unavailable: {
      label: 'N/A',
      className: 'bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-500 dark:border-zinc-800/50',
    },
  };

  const item = config[status] ?? config.unavailable;

  return (
    <span
      data-testid={`status-meta-${status}`}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide ${item.className}`}
    >
      {item.label}
    </span>
  );
}
