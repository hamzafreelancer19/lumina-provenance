import type { Metadata } from 'next';
import { RegisterForm } from '@/components/register-form';
import { safeNext } from '@/lib/auth';
import { getSettings } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();
  return <RegisterForm next={safeNext(params.next)} enabled={settings.registrationEnabled} />;
}
