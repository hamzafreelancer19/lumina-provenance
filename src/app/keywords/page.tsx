import type { Metadata } from 'next';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { KeywordFinder } from '@/components/keyword-finder';

export const metadata: Metadata = {
  title: 'Keywords',
  description: 'Analyze a product thumbnail and extract the main search keyword.',
};

export default function KeywordsPage() {
  return (
    <div className="app-shell min-h-[100dvh] text-zinc-900 flex flex-col justify-between">
      <div>
        <Header />
        <KeywordFinder />
      </div>
      <Footer
        label="Keywords"
        note="Thumbnail-only keyword extraction powered by Cloudflare Workers AI (Qwen vision)."
      />
    </div>
  );
}
