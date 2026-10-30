import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    maintenance: settings.maintenanceMode,
    registrationEnabled: settings.registrationEnabled,
    tools: {
      watermark: settings.watermarkEnabled,
      mockups: settings.mockupsEnabled,
      seo: settings.seoEnabled,
    },
  });
}
