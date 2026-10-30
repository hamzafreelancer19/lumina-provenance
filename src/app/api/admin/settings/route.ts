import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { clearApiKey, logActivity, saveApiKey, saveSettings } from '@/lib/store';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let body: {
    studioName?: unknown;
    watermarkEnabled?: unknown;
    mockupsEnabled?: unknown;
    seoEnabled?: unknown;
    registrationEnabled?: unknown;
    xaiApiKey?: unknown;
    clearApiKey?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  try {
    if (body.clearApiKey === true) {
      const xai = await clearApiKey();
      await logActivity(result.user.username, 'settings.update', 'Removed the xAI API key');
      return NextResponse.json({ xai });
    }

    if (typeof body.xaiApiKey === 'string') {
      const xai = await saveApiKey(body.xaiApiKey);
      await logActivity(result.user.username, 'settings.update', 'Saved the xAI API key');
      return NextResponse.json({ xai });
    }

    const settings = await saveSettings({
      studioName: typeof body.studioName === 'string' ? body.studioName : undefined,
      watermarkEnabled: typeof body.watermarkEnabled === 'boolean' ? body.watermarkEnabled : undefined,
      mockupsEnabled: typeof body.mockupsEnabled === 'boolean' ? body.mockupsEnabled : undefined,
      seoEnabled: typeof body.seoEnabled === 'boolean' ? body.seoEnabled : undefined,
      registrationEnabled: typeof body.registrationEnabled === 'boolean' ? body.registrationEnabled : undefined,
    });
    await logActivity(result.user.username, 'settings.update', 'Updated studio settings');
    return NextResponse.json({ settings });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Could not save settings.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
