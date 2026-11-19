import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { getPaymentConfig, listCreditPlans } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;
  const [paymentConfig, plans] = await Promise.all([
    getPaymentConfig(),
    listCreditPlans(true),
  ]);
  return NextResponse.json({ ...paymentConfig, plans });
}
