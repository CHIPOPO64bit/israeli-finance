'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'borsa:watchlist';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function WatchlistBar() {
  const [list, setList] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const apply = () => setList(read());
    apply();
    window.addEventListener('borsa:watchlist:update', apply);
    return () => window.removeEventListener('borsa:watchlist:update', apply);
  }, []);

  if (!mounted || list.length === 0) return null;

  return (
    <div className="border-b border-[var(--ink-4)] bg-[var(--ink-1)]/70 backdrop-blur-sm">
      <div className="mx-auto max-w-[1680px] px-6 py-2 flex items-center gap-3 flex-wrap text-[11px] font-mono">
        <span className="eyebrow text-[var(--amber-bright)] shrink-0">★ YOUR WATCHLIST</span>
        <div className="flex gap-1.5 flex-wrap">
          {list.map(s => (
            <Link
              key={s}
              href={`/c/${encodeURIComponent(s)}`}
              className="px-2 py-0.5 border border-[var(--ink-4)] text-[var(--bone-dim)] hover:border-[var(--amber)] hover:text-[var(--bone)] tracking-wider"
            >
              {s}
            </Link>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-[var(--bone-faint)]">{list.length} saved · stored on this device</span>
      </div>
    </div>
  );
}
