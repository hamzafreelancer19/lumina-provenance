'use client';

import { useState } from 'react';
import { AlertCircle, Check, ChevronDown, Copy, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { StatusPill } from './status-pill';
import { isSignalStatus } from '@/lib/audit';
import type { MetaGroup } from '@/lib/types';

interface MetadataCardProps {
  group: MetaGroup;
  open: boolean;
  onToggle: () => void;
}

export function MetadataCard({ group, open, onToggle }: MetadataCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const isFound = isSignalStatus(group.status);
  const isInvalid = group.status === 'invalid';

  const copyField = (e: React.MouseEvent, field: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(field);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div
      data-testid={`card-metadata-${group.id}`}
      className="border-b border-zinc-200/80 dark:border-zinc-800/60 last:border-0 transition-colors"
    >
      <button
        data-testid={`button-toggle-${group.id}`}
        onClick={onToggle}
        className="focus-ring flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-900/40 px-2.5 rounded-xl"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
            group.status === 'found' || isInvalid
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : group.status === 'detected' || group.status === 'verified'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : group.status === 'clear' || group.status === 'none'
                  ? 'border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700/50 dark:bg-zinc-800/60 dark:text-zinc-400'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500'
          }`}
        >
          {isInvalid ? (
            <AlertCircle size={14} />
          ) : isFound ? (
            <Info size={14} />
          ) : group.status === 'clear' || group.status === 'none' ? (
            <Check size={14} />
          ) : (
            <span className="text-[11px]">—</span>
          )}
        </span>

        <span className="flex-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          {group.label}
        </span>

        <StatusPill status={group.status} />

        <ChevronDown
          size={15}
          className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180 text-zinc-700 dark:text-zinc-300' : ''
          }`}
        />
      </button>

      {open && (
        <div className="fade-up pb-4 pt-1 pl-11 pr-2.5">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {group.detail}
          </p>
          {group.fields.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800/80 dark:bg-zinc-900/50 p-3">
              {group.fields.map((field) => (
                <div
                  key={field}
                  className="group/field flex items-center justify-between gap-2 font-mono text-[11px] text-zinc-800 dark:text-zinc-200 leading-normal"
                >
                  <div className="flex items-start gap-2 truncate">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/70 dark:bg-emerald-400/70" />
                    <span className="truncate">{field}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => copyField(e, field)}
                    title="Copy value"
                    className="opacity-0 group-hover/field:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0"
                  >
                    {copiedField === field ? (
                      <Check size={11} className="text-emerald-500" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
