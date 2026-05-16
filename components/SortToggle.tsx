'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export type SortKey = 'cap' | 'diamond' | '1y' | 'small';

const LABELS: Record<SortKey, string> = {
  cap:     'BY MARKET CAP',
  diamond: 'BY ◆ DIAMOND',
  '1y':    'BY 1Y GAIN',
  small:   'SMALLEST FIRST',
};

export function SortToggle({ current }: { current: SortKey }) {
  const params = useSearchParams();
  const make = (key: SortKey) => {
    const u = new URLSearchParams(params.toString());
    if (key === 'cap') u.delete('sort');
    else u.set('sort', key);
    u.delete('limit');
    const s = u.toString();
    return s ? `/?${s}` : '/';
  };
  return (
    <div className="flex gap-1 flex-wrap">
      {(Object.keys(LABELS) as SortKey[]).map(k => (
        <Link
          key={k}
          href={make(k)}
          scroll={false}
          className={`px-2.5 py-1 text-[10.5px] font-mono tracking-[0.16em] border transition-colors ${
            current === k
              ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
              : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-5)]'
          }`}
        >
          {LABELS[k]}
        </Link>
      ))}
    </div>
  );
}
