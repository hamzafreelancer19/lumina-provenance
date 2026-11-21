import Link from 'next/link';

export function Footer({
  label = 'Private image metadata studio',
  note = 'Processed on your device. Your files are never uploaded.',
}: {
  label?: string;
  note?: string;
}) {
  return (
    <footer className="mt-16 border-t border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-950/60 py-6 text-xs text-zinc-500 transition-colors duration-150">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-300 font-semibold tracking-wider">
            LUMINA
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
          <Link href="/about" className="transition hover:text-zinc-800 dark:hover:text-zinc-200">About</Link>
          <Link href="/contact" className="transition hover:text-zinc-800 dark:hover:text-zinc-200">Contact</Link>
          <p>{note}</p>
        </div>
      </div>
    </footer>
  );
}
