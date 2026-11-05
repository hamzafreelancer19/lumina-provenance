import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { getSettings, normalizeUserTools } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;
  const settings = await getSettings();
  const userTools = normalizeUserTools(result.user.tools);
  const isAdmin = result.user.role === 'admin';

  return NextResponse.json({
    id: result.user.id,
    username: result.user.username,
    displayName: result.user.displayName,
    role: result.user.role,
    studioName: settings.studioName,
    maintenance: settings.maintenanceMode,
    tools: {
      watermark: isAdmin || (settings.watermarkEnabled && userTools.watermark),
      mockups: isAdmin || (settings.mockupsEnabled && userTools.mockups),
      seo: isAdmin || (settings.seoEnabled && userTools.seo),
      keywords: isAdmin || (settings.keywordsEnabled !== false && userTools.keywords),
    },
  });
}
