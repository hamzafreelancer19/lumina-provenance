import { inspectC2pa } from './c2pa';
import type { Audit, GroupStatus, MetaGroup } from './types';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB safety limit

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const readText = (bytes: Uint8Array): string =>
  new TextDecoder('latin1').decode(bytes);

export const contains = (haystack: string, needles: string[]): boolean =>
  needles.some((needle) => haystack.toLowerCase().includes(needle.toLowerCase()));

export const signalStatuses: GroupStatus[] = [
  'found',
  'detected',
  'verified',
  'invalid',
  'unverified',
];

export const isSignalStatus = (status: GroupStatus): boolean =>
  signalStatuses.includes(status);

/**
 * Fast binary header dimension parser (<0.05ms) without decoding full bitmap.
 */
function parseDimensionsFromHeader(buffer: Uint8Array): { width: number; height: number } | null {
  if (buffer.length < 16) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (buffer.length >= 24) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      if (width > 0 && height > 0) return { width, height };
    }
  }

  // 2. GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    if (buffer.length >= 10) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const width = view.getUint16(6, true);
      const height = view.getUint16(8, true);
      if (width > 0 && height > 0) return { width, height };
    }
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 30 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const chunkType = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
    if (chunkType === 'VP8 ' && buffer.length >= 30) {
      if (buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
        const width = (buffer[26] | (buffer[27] << 8)) & 0x3fff;
        const height = (buffer[28] | (buffer[29] << 8)) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      }
    } else if (chunkType === 'VP8L' && buffer.length >= 25) {
      if (buffer[20] === 0x2f) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        if (width > 0 && height > 0) return { width, height };
      }
    } else if (chunkType === 'VP8X' && buffer.length >= 30) {
      const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      if (width > 0 && height > 0) return { width, height };
    }
  }

  // 4. JPEG: FF D8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    const len = buffer.length;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    while (offset < len - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      while (offset < len && buffer[offset] === 0xff) {
        offset++;
      }
      if (offset >= len) break;
      const marker = buffer[offset++];

      if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
      if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue;

      if (offset + 2 > len) break;
      const segmentLength = view.getUint16(offset, false);

      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSof && offset + 7 <= len) {
        const height = view.getUint16(offset + 3, false);
        const width = view.getUint16(offset + 5, false);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }

      offset += segmentLength;
    }
  }

  return null;
}

async function fallbackImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Fallback to Image element if createImageBitmap fails on specific format
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file could not be decoded as a valid image.'));
    };
    image.src = url;
  });
}

export async function imageDimensions(
  file: File,
  initialBuffer?: Uint8Array,
): Promise<{ width: number; height: number }> {
  try {
    const buffer =
      initialBuffer ??
      new Uint8Array(await file.slice(0, Math.min(file.size, 65536)).arrayBuffer());
    const dims = parseDimensionsFromHeader(buffer);
    if (dims && dims.width > 0 && dims.height > 0) {
      return dims;
    }
  } catch {
    // Proceed to fallback
  }

  return fallbackImageDimensions(file);
}

export async function auditFile(file: File): Promise<Audit> {
  if (!file) {
    throw new Error('Please select an image file.');
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes).');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${formatBytes(file.size)}) exceeds the maximum 50 MB safety limit.`,
    );
  }

  const isImageMime = file.type.startsWith('image/');
  const hasImageExt = Boolean(
    file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|avif)$/),
  );

  if (!isImageMime && !hasImageExt) {
    throw new Error('Please choose a valid image file (JPEG, PNG, WebP, or GIF).');
  }

  // Slice header sample (up to 512KB is plenty for all metadata markers and header parsing)
  const sampleSlice = file.slice(0, Math.min(file.size, 524_288));
  const sampleBuffer = new Uint8Array(await sampleSlice.arrayBuffer());
  const sample = readText(sampleBuffer);

  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  const isJpeg =
    file.type === 'image/jpeg' || Boolean(file.name.toLowerCase().match(/\.(jpg|jpeg)$/));
  const exif = isJpeg && (sample.includes('Exif') || sample.includes('EXIF'));
  const iptc =
    isJpeg &&
    (sample.includes('Photoshop 3.0') ||
      sample.includes('8BIM') ||
      contains(sample, ['IPTC', 'Iptc']));
  const xmp = contains(sample, ['http://ns.adobe.com/xap/1.0/', '<x:xmpmeta', 'xmpmeta']);
  const pngText = isPng && contains(sample, ['tEXt', 'iTXt', 'zTXt']);

  // Run header dimensions and C2PA inspection concurrently with zero latency
  const [{ width, height }, c2pa] = await Promise.all([
    imageDimensions(file, sampleBuffer),
    inspectC2pa(file),
  ]);

  const c2paStatus: GroupStatus =
    c2pa.state === 'trusted' || c2pa.state === 'valid'
      ? 'verified'
      : c2pa.state === 'invalid'
        ? 'invalid'
        : c2pa.state === 'unverified'
          ? 'unverified'
          : c2pa.state === 'none'
            ? 'none'
            : 'unavailable';

  const groups: MetaGroup[] = [
    {
      id: 'c2pa',
      label: 'C2PA Content Credentials & AI Provenance',
      status: c2paStatus,
      detail: c2pa.detail,
      fields: c2pa.fields,
    },
    {
      id: 'exif',
      label: 'EXIF Metadata',
      status: exif ? 'found' : 'clear',
      detail: exif
        ? 'Camera, device, and capture fields detected.'
        : 'No EXIF markers found in file header.',
      fields: exif
        ? [
            'Capture date or device details may be present',
            'Location / GPS fields may be present',
          ]
        : [],
    },
    {
      id: 'iptc',
      label: 'IPTC Editorial Metadata',
      status: iptc ? 'found' : 'clear',
      detail: iptc
        ? 'Editorial, byline, and descriptive fields detected.'
        : 'No IPTC markers found in file sample.',
      fields: iptc
        ? ['Caption, byline, or rights fields may be present']
        : [],
    },
    {
      id: 'xmp',
      label: 'Adobe XMP Packet',
      status: xmp ? 'found' : 'clear',
      detail: xmp
        ? 'An Adobe XMP metadata packet was detected.'
        : 'No XMP packet found in file sample.',
      fields: xmp
        ? ['Embedded workflow, software, or AI generator notes may be present']
        : [],
    },
    {
      id: 'png-text',
      label: 'PNG Text Chunks',
      status: pngText ? 'found' : isPng ? 'clear' : 'unavailable',
      detail: isPng
        ? pngText
          ? 'PNG text chunk markers detected.'
          : 'No common text chunk markers found.'
        : 'Only applicable to PNG files.',
      fields: pngText
        ? ['Textual comments, prompt info, or software notes may be present']
        : [],
    },
  ];

  return {
    name: file.name,
    type: file.type || 'image/unknown',
    size: file.size,
    width,
    height,
    groups,
  };
}
