import type { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';
import { safeNext } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm next={safeNext(params.next)} />;
}
