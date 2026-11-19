import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { findPaymentRequest, readPaymentProof } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;
  const { id } = await context.params;
  const payment = await findPaymentRequest(id);
  if (!payment?.proofFileName) {
    return NextResponse.json({ error: 'Payment screenshot not found.' }, { status: 404 });
  }

  try {
    const image = readPaymentProof(payment.proofFileName);
    const extension = payment.proofFileName.split('.').pop();
    const type = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
    return new Response(image, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'The payment screenshot is unavailable.' }, { status: 404 });
  }
}
