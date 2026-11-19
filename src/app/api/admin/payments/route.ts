import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { logActivity, updatePaymentRequestStatus } from '@/lib/store';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  if (typeof body.id !== 'string' || (body.status !== 'approved' && body.status !== 'rejected')) {
    return NextResponse.json({ error: 'Choose a payment request and a valid decision.' }, { status: 400 });
  }

  try {
    const payment = await updatePaymentRequestStatus(body.id, result.user.username, body.status);
    await logActivity(
      result.user.username,
      `payment.${body.status}`,
      `${body.status === 'approved' ? 'Approved' : 'Rejected'} ${payment.planName} payment for ${payment.username}`,
    );
    return NextResponse.json({ payment });
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : 'Could not review the payment.' },
      { status: 400 },
    );
  }
}
