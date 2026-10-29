'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQ_DATA } from '@/lib/faq-data';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="mt-16 border-t border-zinc-200 dark:border-zinc-800/80 pt-12 transition-colors duration-150">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <HelpCircle size={16} />
        </div>
        <div>
          <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-zinc-500">
            Common questions about metadata inspection, privacy, and C2PA
          </p>
        </div>
      </div>

      <div className="divide-y divide-violet-200/70 dark:divide-indigo-400/15 rounded-2xl border border-violet-200/70 bg-white/75 dark:border-indigo-400/20 dark:bg-[#10162c]/60 px-5 sm:px-6 shadow-sm dark:shadow-none">
        {FAQ_DATA.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={item.question} className="py-4">
              <button
                onClick={() => toggle(idx)}
                className="focus-ring flex w-full items-center justify-between text-left text-xs font-semibold text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-zinc-100 transition"
              >
                <span>{item.question}</span>
                <ChevronDown
                  size={15}
                  className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 shrink-0 ml-3 ${
                    isOpen ? 'rotate-180 text-zinc-700 dark:text-zinc-300' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <p className="fade-up mt-2.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pr-4">
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
