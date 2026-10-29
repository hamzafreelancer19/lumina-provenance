import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { getStructuredData } from '@/lib/json-ld';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--app-font-sans',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--app-font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--app-font-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://traceclear.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#fafafa',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Lumina',
  title: {
    default: 'ChatGPT Image Watermark Remover — Clean C2PA & AI Metadata',
    template: '%s | Lumina',
  },
  description:
    'Free, private, browser-based ChatGPT image watermark remover. Remove invisible C2PA Content Credentials, DALL-E metadata, EXIF, and AI provenance tags locally with zero server uploads.',
  keywords: [
    'chatgpt image watermark remover',
    'remove chatgpt watermark',
    'chatgpt metadata remover',
    'dall e watermark remover',
    'dall e 3 c2pa remover',
    'remove c2pa watermark',
    'ai image watermark remover',
    'chatgpt image cleaner',
    'strip chatgpt metadata',
    'invisible ai watermark remover',
    'c2pa validator',
    'c2pa content credentials',
    'image provenance cleaner',
    'exif remover online',
    'ai image provenance checker',
  ],
  authors: [{ name: 'Lumina Team' }],
  creator: 'Lumina',
  publisher: 'Lumina',
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.svg' }],
  },
  openGraph: {
    title: 'ChatGPT Image Watermark Remover — Clean C2PA & AI Metadata',
    description:
      'Free, private, browser-based ChatGPT image watermark remover. Remove invisible C2PA Content Credentials, DALL-E metadata, and EXIF tags locally with zero server uploads.',
    url: siteUrl,
    siteName: 'Lumina',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatGPT Image Watermark Remover — Clean C2PA & AI Metadata',
    description:
      'Inspect and remove invisible ChatGPT C2PA watermarks, DALL-E metadata, and EXIF tags locally in your browser. 100% private, zero server uploads.',
  },
  verification: {
    google: '461kbpFQJ8S9Cl5NYEjK0GM0nnBDZjagXt4tLxNTmSI',
  },
};

const themeScript = `(function(){try{localStorage.setItem('traceclear-theme','light');document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = getStructuredData();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          href="/wasm/c2pa.wasm"
          as="fetch"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {structuredData.map((schema, idx) => (
          <script
            key={idx}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-zinc-50 text-zinc-900 dark:bg-[#09090b] dark:text-zinc-100 min-h-screen transition-colors duration-150"
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
