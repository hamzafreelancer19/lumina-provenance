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
    maintenance: settings.maintenanceMode,
    tools: {
      watermark: settings.watermarkEnabled,
      mockups: settings.mockupsEnabled,
      seo: settings.seoEnabled,
    },
  });
}
