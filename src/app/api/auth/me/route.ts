import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { getSettings } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;
  const settings = await getSettings();
  return NextResponse.json({
    id: result.user.id,
    username: result.user.username,
    displayName: result.user.displayName,
    role: result.user.role,
    studioName: settings.studioName,
    tools: {
      watermark: settings.watermarkEnabled || result.user.role === 'admin',
      mockups: settings.mockupsEnabled || result.user.role === 'admin',
      seo: settings.seoEnabled || result.user.role === 'admin',
    },
  });
}
