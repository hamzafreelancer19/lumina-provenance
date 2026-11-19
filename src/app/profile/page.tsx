import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Header } from '@/components/header';
import { ProfilePage } from '@/components/profile-page';
import { SESSION_COOKIE, readSession } from '@/lib/auth';
import { findUser, getLatestApprovedPlan } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Your Profile',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function UserProfilePage() {
  const jar = await cookies();
  const session = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login?next=/profile');
  const user = await findUser(session);
  if (!user || user.disabled) redirect('/login?next=/profile');
  const activePlan = await getLatestApprovedPlan(user.id);

  return (
    <div className="admin-shell min-h-[100dvh] text-zinc-900">
      <Header />
      <ProfilePage
        profile={{
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          createdAt: user.createdAt,
          credits: user.credits,
          dailyCreditsRemaining: user.dailyCreditsRemaining,
          bonusCredits: user.bonusCredits,
          unlimitedCredits: user.unlimitedCredits,
          activePlan,
        }}
      />
    </div>
  );
}
