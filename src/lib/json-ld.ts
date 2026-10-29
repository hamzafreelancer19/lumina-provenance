import { FAQ_DATA } from '@/lib/faq-data';

export function getStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://traceclear.app';

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lumina — ChatGPT Image Watermark Remover & C2PA Metadata Cleaner',
    url: baseUrl,
    description:
      'Private, browser-based ChatGPT image watermark remover and C2PA metadata cleaner. Inspect and remove invisible C2PA Content Credentials manifests, DALL-E 3 AI provenance markers, and EXIF tags with zero server uploads.',
    applicationCategory: 'SecurityApplication, MultimediaApplication, UtilityApplication',
    operatingSystem: 'Any modern web browser (Chrome, Firefox, Safari, Edge)',
    browserRequirements: 'Requires JavaScript and WebAssembly support',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'ChatGPT & DALL-E 3 Invisible Watermark Removal',
      'C2PA Content Credentials Manifest Validation & Stripping',
      'EXIF Camera & AI Generation Metadata Cleaner',
      'IPTC Editorial & Copyright Field Removal',
      'Adobe XMP Workflow Packet Sanitizer',
      'PNG Text Chunk Structure Scanner',
      'Local Canvas Pixel Re-encoding & Metadata Stripping',
      '100% Client-Side WebAssembly Architecture',
      'Zero Server Uploads & Zero Data Telemetry',
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lumina',
    url: baseUrl,
  };

  return [webAppSchema, faqSchema, websiteSchema];
}
