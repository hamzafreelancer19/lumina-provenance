import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6 text-[hsl(var(--foreground))]">
      <div className="glass-card max-w-md w-full rounded-2xl p-8 text-center">
        <span className="mono text-4xl font-bold text-[hsl(var(--primary))]">
          404
        </span>
        <h2 className="display mt-3 text-2xl font-bold">Page Not Found</h2>
        <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          The requested page could not be located.
        </p>
        <Link
          href="/"
          className="focus-ring mt-6 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90"
        >
          <ArrowLeft size={16} /> Return to Studio
        </Link>
      </div>
    </div>
  );
}
