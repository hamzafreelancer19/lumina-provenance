import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUser } from '@/lib/access';
import {
  createPaymentRequest,
  deletePaymentProof,
  getCreditPlan,
  getPaymentConfig,
  listPaymentRequests,
  savePaymentProof,
} from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;
  return NextResponse.json({ requests: await listPaymentRequests(result.user.id) });
}

export async function POST(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;

  const config = await getPaymentConfig();
  if (!config.paymentMethodName || !config.paymentRecipientName || !config.paymentAccountNumber) {
    return NextResponse.json({ error: 'Payment details are not available yet. Please contact an admin.' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'The payment submission could not be read.' }, { status: 400 });
  }

  const planId = form.get('planId');
  const transactionId = form.get('transactionId');
  const proof = form.get('proof');
  if (typeof planId !== 'string' || typeof transactionId !== 'string') {
    return NextResponse.json({ error: 'Choose a plan and provide payment details.' }, { status: 400 });
  }
  const activePlan = await getCreditPlan(planId);
  if (!activePlan?.active) {
    return NextResponse.json({ error: 'That plan is no longer available. Refresh and choose an active plan.' }, { status: 400 });
  }

  let proofFileName: string | null = null;
  if (proof instanceof File && proof.size > 0) {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensions[proof.type];
    if (!extension || proof.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Payment screenshot must be a PNG, JPEG, or WebP under 5 MB.' },
        { status: 400 },
      );
    }
    proofFileName = `${randomUUID()}.${extension}`;
  }

  try {
    if (proof instanceof File && proof.size > 0 && proofFileName) {
      savePaymentProof(proofFileName, new Uint8Array(await proof.arrayBuffer()));
    }
    const payment = await createPaymentRequest({
      userId: result.user.id,
      username: result.user.username,
      planId,
      transactionId: transactionId.trim(),
      proofFileName,
    });
    const { proofFileName: _hidden, ...publicPayment } = payment;
    return NextResponse.json({ payment: publicPayment }, { status: 201 });
  } catch (reason) {
    if (proofFileName) {
      try {
        deletePaymentProof(proofFileName);
      } catch {
        // Keep the original request error; the proof uses a random, private file name.
      }
    }
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : 'Could not submit the payment.' },
      { status: 400 },
    );
  }
}
