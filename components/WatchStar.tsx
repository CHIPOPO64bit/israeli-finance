'use client';

import { useEffect, useState } from 'react';

const KEY = 'borsa:watchlist';

function readSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSet(s: Set<string>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...s]));
    window.dispatchEvent(new Event('borsa:watchlist:update'));
  } catch {
    /* localStorage full or denied — silently degrade */
  }
}

export function WatchStar({ symbol, size = 'sm' }: { symbol: string; size?: 'sm' | 'md' }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const apply = () => setActive(readSet().has(symbol.toUpperCase()));
    apply();
    window.addEventListener('borsa:watchlist:update', apply);
    return () => window.removeEventListener('borsa:watchlist:update', apply);
  }, [symbol]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const s = readSet();
    const key = symbol.toUpperCase();
    if (s.has(key)) s.delete(key);
    else s.add(key);
    writeSet(s);
    setActive(s.has(key));
  }

  return (
    <button
      onClick={toggle}
      aria-label={active ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      title={active ? 'In your watchlist' : 'Add to watchlist'}
      className={`inline-flex items-center justify-center border transition-colors ${
        size === 'md' ? 'w-7 h-7 text-[14px]' : 'w-5 h-5 text-[11px]'
      } ${
        active
          ? 'border-[var(--amber)] text-[var(--amber-bright)] bg-[var(--amber)]/10'
          : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:border-[var(--amber)] hover:text-[var(--amber-bright)]'
      }`}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
