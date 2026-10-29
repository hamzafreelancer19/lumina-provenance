import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumina — Image Provenance & Metadata Studio',
    short_name: 'Lumina',
    description:
      'Inspect image metadata, EXIF, IPTC, XMP, and verified C2PA Content Credentials locally in your browser. Generate clean derivative copies without ordinary metadata.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
