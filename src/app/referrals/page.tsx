import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
import { ReferralsPage } from '@/components/referrals-page';
import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { findUser } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Referrals',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ReferralDashboardPage() {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=/referrals');
  const user = await findUser(session);
  if (!user || user.disabled) redirect('/login?next=/referrals');

  return (
    <div className="admin-shell min-h-[100dvh] text-zinc-900">
      <Header />
      <ReferralsPage />
    </div>
  );
}
