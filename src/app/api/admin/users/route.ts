import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { createStudioUser, deleteStudioUser, logActivity, updateStudioUser, type Role } from '@/lib/store';

export const runtime = 'nodejs';

function message(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Could not update that user.';
}

export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let body: { username?: unknown; displayName?: unknown; password?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  try {
    const user = await createStudioUser({
      username: typeof body.username === 'string' ? body.username : '',
      displayName: typeof body.displayName === 'string' ? body.displayName : '',
      password: typeof body.password === 'string' ? body.password : '',
      role: body.role === 'admin' ? 'admin' : 'member',
    });
    await logActivity(result.user.username, 'user.create', `Added ${user.username} as ${user.role}`);
    return NextResponse.json({ user });
  } catch (reason) {
    return NextResponse.json({ error: message(reason) }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let body: {
    id?: unknown;
    displayName?: unknown;
    role?: unknown;
    disabled?: unknown;
    password?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'Choose a user.' }, { status: 400 });
  }

  const role: Role | undefined = body.role === 'admin' || body.role === 'member' ? body.role : undefined;
  try {
    const user = await updateStudioUser(body.id, result.user.id, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      role,
      disabled: typeof body.disabled === 'boolean' ? body.disabled : undefined,
      password: typeof body.password === 'string' ? body.password : undefined,
    });
    await logActivity(result.user.username, 'user.update', `Updated ${user.username}`);
    return NextResponse.json({ user });
  } catch (reason) {
    return NextResponse.json({ error: message(reason) }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'Choose a user.' }, { status: 400 });
  }

  try {
    const user = await deleteStudioUser(body.id, result.user.id);
    await logActivity(result.user.username, 'user.delete', `Removed ${user.username}`);
    return NextResponse.json({ ok: true });
  } catch (reason) {
    return NextResponse.json({ error: message(reason) }, { status: 400 });
  }
}
