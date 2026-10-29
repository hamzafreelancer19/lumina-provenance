import type { Metadata } from 'next';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { SeoWriter } from '@/components/seo-writer';

export const metadata: Metadata = {
  title: 'Listing SEO',
  description: 'Write an Etsy title, description, and tags from a product photo and competitor listings.',
};

export default function SeoPage() {
  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 flex flex-col justify-between">
      <div>
        <Header />
        <SeoWriter />
      </div>
      <Footer
        label="Listing SEO"
        note="Listings are written with Grok and billed to your xAI account."
      />
    </div>
  );
}
