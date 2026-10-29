import type { Metadata } from 'next';
import { BulkCreator } from '@/components/bulk-creator';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Etsy Mockups',
  description: 'Upload a product photo and background photos to make 6 Etsy mockups.',
};

export default function CreatePage() {
  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 flex flex-col justify-between">
      <div>
        <Header />
        <BulkCreator />
      </div>
      <Footer
        label="Etsy mockups"
        note="Mockups are generated with Grok Imagine and billed to your xAI account."
      />
    </div>
  );
}
