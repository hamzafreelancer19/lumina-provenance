import { requireUser } from '@/lib/access';
import { readPaymentQrImage, readPlanPaymentQrImage } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;

  const planId = new URL(request.url).searchParams.get('planId');
  const image = planId ? await readPlanPaymentQrImage(planId) : await readPaymentQrImage();
  if (!image) return new Response('QR image not found.', { status: 404 });

  return new Response(image.bytes, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
