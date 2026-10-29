import { isSignalStatus } from './audit';
import type { Audit, CleanResult } from './types';

export interface CleanedRasterResult {
  blob: Blob;
  name: string;
  size: number;
  url: string;
}

/**
 * Fast-path raster sanitization using OffscreenCanvas where supported,
 * bypassing DOM synchronization.
 */
export async function sanitizeImageRaster(file: File): Promise<CleanedRasterResult> {
  if (typeof window === 'undefined') {
    throw new Error('Image cleaning must be run in the browser.');
  }

  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;

  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

  const type = isPng ? 'image/png' : isWebp ? 'image/webp' : 'image/jpeg';
  const quality = isPng ? undefined : 0.95;
  const extension = isPng ? 'png' : isWebp ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^/.]+$/, '');
  const name = `${base}-clean.${extension}`;

  let blob: Blob;

  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(width, height);
      const context = offscreen.getContext('2d', { alpha: true });
      if (!context) {
        throw new Error('Could not initialize OffscreenCanvas context.');
      }
      context.drawImage(bitmap, 0, 0);
      blob = await offscreen.convertToBlob({ type, quality });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', {
        alpha: true,
        willReadFrequently: false,
      });

      if (!context) {
        throw new Error('Your browser could not initialize a 2D rendering canvas.');
      }

      context.drawImage(bitmap, 0, 0);

      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => {
            if (value) {
              resolve(value);
            } else {
              reject(new Error('Could not encode sanitized image blob.'));
            }
          },
          type,
          quality,
        );
      });

      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    bitmap.close();
  }

  return {
    blob,
    name,
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}

export async function cleanImage(file: File, audit: Audit): Promise<CleanResult> {
  const raster = await sanitizeImageRaster(file);
  const removed = audit.groups.filter((group) => isSignalStatus(group.status)).length;

  return {
    ...raster,
    removed,
  };
}

