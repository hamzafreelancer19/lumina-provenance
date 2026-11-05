import type { Metadata } from 'next';
import { BulkCreator } from '@/components/bulk-creator';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Etsy Mockups',
  description: 'Upload a product photo to make 6 Etsy mockups with Flux.',
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
        note="Mockups keep your product reference with Cloudflare Flux 2 Dev for higher detail and change only the scene."
      />
    </div>
  );
}
