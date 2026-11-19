import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/access';
import { logActivity, updateOwnProfile } from '@/lib/store';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;

  let body: {
    displayName?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (
    (body.displayName !== undefined && typeof body.displayName !== 'string') ||
    (body.currentPassword !== undefined && typeof body.currentPassword !== 'string') ||
    (body.newPassword !== undefined && typeof body.newPassword !== 'string')
  ) {
    return NextResponse.json({ error: 'Check the profile details and try again.' }, { status: 400 });
  }
  if (body.displayName === undefined && body.newPassword === undefined) {
    return NextResponse.json({ error: 'Make a profile change before saving.' }, { status: 400 });
  }

  try {
    const user = await updateOwnProfile(result.user.id, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      currentPassword:
        typeof body.currentPassword === 'string' ? body.currentPassword : undefined,
      newPassword: typeof body.newPassword === 'string' ? body.newPassword : undefined,
    });
    await logActivity(result.user.username, 'profile.update', 'Updated own profile');
    return NextResponse.json({
      displayName: user.displayName,
      passwordUpdated: body.newPassword !== undefined,
    });
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : 'Could not update the profile.' },
      { status: 400 },
    );
  }
}
