import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
import { PricingPage } from '@/components/pricing-page';
import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { findUser } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Credit Plans',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CreditPricingPage() {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=/pricing');
  const user = await findUser(session);
  if (!user || user.disabled) redirect('/login?next=/pricing');

  return (
    <div className="admin-shell min-h-[100dvh] text-zinc-900">
      <Header />
      <PricingPage />
    </div>
  );
}
