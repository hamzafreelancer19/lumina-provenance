export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'image-metadata-product-photos',
    category: 'Image Privacy',
    title: 'What image metadata reveals about your product photos',
    excerpt:
      'Learn what EXIF, C2PA, provenance, and embedded software data can say about an image—and which details should be removed before publishing.',
    date: 'Nov 21, 2026',
    readTime: '5 min read',
    image: '/blog/image-metadata.svg',
    intro:
      'An image can contain more than the pixels visible on screen. Depending on how it was created or edited, an exported file may include technical details about the camera, software, editing history, location, or AI provenance.',
    sections: [
      {
        heading: 'Common metadata types',
        paragraphs: [
          'EXIF metadata often describes capture settings such as camera model, lens, exposure, date, time, and sometimes GPS location. This is useful for photographers, but it is usually unnecessary for a marketplace listing.',
          'XMP and IPTC fields can store captions, keywords, copyright information, editing records, and creator details. C2PA Content Credentials may also record provenance and edits made during an image’s history.',
        ],
      },
      {
        heading: 'Why it matters for product images',
        paragraphs: [
          'Most buyers do not need this technical information. Removing it can reduce accidental location sharing and prevent old file names, device details, or editing software information from leaking into public downloads.',
          'Metadata is not normally visible on a product listing, but it remains attached to the original downloaded file. Cleaning a copy before distribution creates a safer deliverable without changing the original asset.',
        ],
      },
      {
        heading: 'Keep the source, distribute the clean copy',
        paragraphs: [
          'For a safe workflow, keep a private archival original and publish a re-encoded clean derivative. Lumina performs this process in your browser, so the source image does not need to leave your device.',
        ],
      },
    ],
  },
  {
    slug: 'etsy-mockup-clean-image-workflow',
    category: 'Etsy Sellers',
    title: 'A clean image workflow for Etsy product mockups',
    excerpt:
      'A simple, repeatable process for checking, cleaning, naming, exporting, and archiving polished marketplace mockups.',
    date: 'Nov 18, 2026',
    readTime: '4 min read',
    image: '/blog/etsy-workflow.svg',
    intro:
      'A consistent export workflow makes every Etsy listing easier to manage and helps prevent old source files or hidden metadata from entering your customer-facing archive.',
    sections: [
      {
        heading: 'Start from an approved source',
        paragraphs: [
          'Organize source mockups by product, variation, and color. Keep an untouched master in an archive folder and only export a cleaned copy for listing or delivery.',
          'Check image dimensions and sharpening before cleaning. A clean export should preserve the visible quality of the approved mockup while removing invisible provenance data.',
        ],
      },
      {
        heading: 'Clean and rename in one pass',
        paragraphs: [
          'Use a descriptive file name that reflects the product and variation. Wait for automatic naming to finish before downloading so every listing, backup, and delivery link remains consistent.',
        ],
      },
      {
        heading: 'Archive the final export',
        paragraphs: [
          'Store the final cleaned raster copy in a named folder, record the export date, and repeat the same structure for future variations. This reduces mistakes without requiring a complex publishing system.',
        ],
      },
    ],
  },
  {
    slug: 'ai-watermarks-hidden-provenance',
    category: 'AI Images',
    title: 'Understanding AI watermarks and hidden provenance',
    excerpt:
      'A clear guide to visible markers, invisible content credentials, metadata records, and the limits of automatic removal.',
    date: 'Nov 12, 2026',
    readTime: '6 min read',
    image: '/blog/ai-provenance.svg',
    intro:
      'AI-generated images can carry multiple kinds of provenance signals. Some are visible on the pixels, while others live in metadata or content credential records.',
    sections: [
      {
        heading: 'Visible and invisible signals',
        paragraphs: [
          'Visible watermarks are drawn into the image and require pixel editing or an appropriate approved removal workflow. Hidden provenance is different: it can include embedded metadata, C2PA credentials, or software records.',
          'Metadata removal cannot make an image’s visible subject change. It creates a clean raster copy by re-encoding pixels and excluding hidden provenance fields.',
        ],
      },
      {
        heading: 'What a cleaner can verify',
        paragraphs: [
          'A scanner can inspect known signatures, EXIF fields, XMP packages, C2PA markers, and common provenance patterns. Detection quality depends on the file format and whether the original producer preserved recognizable records.',
        ],
      },
      {
        heading: 'Use provenance responsibly',
        paragraphs: [
          'Only remove markings from files you own or are authorized to process. Removing provenance can affect authenticity records, so preserve the original and keep clear records of why and how a derivative was made.',
        ],
      },
    ],
  },
];
