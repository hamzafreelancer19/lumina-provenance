import { NextResponse } from 'next/server';
import { sessionFromRequest, type SessionPayload } from '@/lib/auth';
import { findUser, getSettings, type PublicUser } from '@/lib/store';

export async function requireUser(request: Request): Promise<
  | { user: PublicUser; session: SessionPayload; response?: undefined }
  | { user?: undefined; session?: undefined; response: NextResponse }
> {
  const session = await sessionFromRequest(request);
  if (!session) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const user = await findUser(session);
  if (!user || user.disabled || (session.uid && user.id !== session.uid)) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (user.role !== session.role) {
    return { response: NextResponse.json({ error: 'Your access changed. Sign in again.' }, { status: 401 }) };
  }
  return { user, session };
}

export async function requireAdmin(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result;
  if (result.user.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}

export async function authorizeTool(request: Request, tool: 'watermark' | 'mockups' | 'seo') {
  const result = await requireUser(request);
  if (result.response) return result;
  const settings = await getSettings();
  const enabled =
    tool === 'watermark'
      ? settings.watermarkEnabled
      : tool === 'mockups'
        ? settings.mockupsEnabled
        : settings.seoEnabled;
  if (!enabled && result.user.role !== 'admin') {
    return {
      response: NextResponse.json({ error: 'This tool is turned off by an admin.' }, { status: 403 }),
    };
  }
  return result;
}
