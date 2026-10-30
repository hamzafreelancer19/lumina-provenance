import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminPanel } from '@/components/admin-panel';
import { Header } from '@/components/header';
import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { findUser } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=/admin');
  const user = await findUser(session);
  if (!user || user.disabled || user.role !== 'admin') redirect('/');

  return (
    <div className="min-h-[100dvh] bg-[#f6f7f4] text-zinc-900">
      <Header />
      <AdminPanel />
    </div>
  );
}
