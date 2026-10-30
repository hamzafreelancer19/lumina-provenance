import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { overview } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;
  const data = await overview();
  return NextResponse.json({ ...data, me: { id: result.user.id, username: result.user.username } });
}
