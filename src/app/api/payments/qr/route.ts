import { requireUser } from '@/lib/access';
import { readPaymentQrImage } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const result = await requireUser(request);
  if (result.response) return result.response;

  const image = await readPaymentQrImage();
  if (!image) return new Response('QR image not found.', { status: 404 });

  return new Response(image.bytes, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
