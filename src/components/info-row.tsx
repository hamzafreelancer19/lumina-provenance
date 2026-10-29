interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function InfoRow({ label, value, mono = false }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800/60 last:border-0 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span
        data-testid={`text-file-${label.toLowerCase().replaceAll(' ', '-')}`}
        className={`text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-[65%] text-right ${
          mono ? 'font-mono text-[11px] text-zinc-700 dark:text-zinc-300 tabular-nums' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
