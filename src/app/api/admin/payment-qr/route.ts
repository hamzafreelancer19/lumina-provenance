import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { logActivity, savePaymentQrImage, setPaymentQrImageUrl } from '@/lib/store';

export const runtime = 'nodejs';

const imageTypes = {
  'image/png': {
    extension: 'png',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  'image/jpeg': {
    extension: 'jpg',
    matches: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/webp': {
    extension: 'webp',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
  },
} as const;

export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read the uploaded QR image.' }, { status: 400 });
  }

  const file = form.get('qrImage');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose a QR image to upload.' }, { status: 400 });
  }
  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: 'QR image must be 3 MB or smaller.' }, { status: 400 });
  }

  const imageType = imageTypes[file.type as keyof typeof imageTypes];
  if (!imageType) {
    return NextResponse.json({ error: 'QR image must be PNG, JPEG, or WebP.' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType.matches(bytes)) {
    return NextResponse.json({ error: 'The file contents do not match a supported image format.' }, { status: 400 });
  }

  try {
    await savePaymentQrImage(imageType.extension, bytes);
    await setPaymentQrImageUrl('/api/payments/qr');
    await logActivity(result.user.username, 'settings.update', 'Uploaded payment QR image');
    return NextResponse.json({ paymentQrImageUrl: '/api/payments/qr' });
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : 'Could not save the QR image.' },
      { status: 500 },
    );
  }
}
