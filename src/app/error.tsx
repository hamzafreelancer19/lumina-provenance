'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 text-[hsl(var(--foreground))]">
      <div className="glass-card max-w-md w-full rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--destructive)/.18)] text-[hsl(var(--destructive))]">
          <AlertCircle size={24} />
        </div>
        <h2 className="display text-2xl font-bold">Something went wrong</h2>
        <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          An unexpected error occurred during execution.
        </p>
        {process.env.NODE_ENV !== 'production' && (
          <pre className="mt-4 overflow-x-auto rounded bg-[hsl(0_0%_0%/.3)] p-3 text-left mono text-[11px] text-[hsl(var(--destructive))]">
            {error.message || String(error)}
          </pre>
        )}
        <button
          onClick={reset}
          className="focus-ring mt-6 w-full rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
