import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { getReferralSummary } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;

  const summary = await getReferralSummary(result.user.id);
  return NextResponse.json(summary);
}
