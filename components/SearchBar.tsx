'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/lib/companies';
import type { SectorKey } from '@/lib/sectors';
import { SECTOR_BY_KEY } from '@/lib/sectors';

type Props = {
  companies: Company[];
  size?: 'hero' | 'compact';
  autoFocus?: boolean;
  placeholder?: string;
};

export function SearchBar({ companies, size = 'hero', autoFocus, placeholder }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // global "/" focus shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return companies.slice(0, 8);
    const scored = companies
      .map(c => {
        const symHit = c.symbol.toLowerCase().startsWith(s) ? 5 : c.symbol.toLowerCase().includes(s) ? 3 : 0;
        const enHit = c.englishName.toLowerCase().startsWith(s) ? 4 : c.englishName.toLowerCase().includes(s) ? 2 : 0;
        const shortHit = c.shortName.toLowerCase().includes(s) ? 1 : 0;
        const heHit = c.hebrewName.includes(q.trim()) ? 2 : 0;
        const taHit = c.symbolTA?.toLowerCase().includes(s) ? 2 : 0;
        return { c, score: symHit + enHit + shortHit + heHit + taHit };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return scored.map(x => x.c);
  }, [q, companies]);

  function select(c: Company) {
    router.push(`/c/${encodeURIComponent(c.symbol)}`);
  }

  const isHero = size === 'hero';

  return (
    <div className="relative w-full" onFocus={() => setOpen(true)} onBlur={e => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
    }}>
      <div className={`relative flex items-center border ${isHero ? 'border-[var(--ink-5)]' : 'border-[var(--ink-4)]'} bg-[var(--ink-2)]/60 transition-colors focus-within:border-[var(--amber)] focus-within:bg-[var(--ink-2)]`}>
        {/* prefix label */}
        <div className={`eyebrow shrink-0 pl-4 pr-3 border-r border-[var(--ink-4)] ${isHero ? 'py-5' : 'py-3'} self-stretch flex items-center`}>
          {isHero ? 'SEARCH' : 'FIND'}
        </div>
        <input
          ref={ref}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter' && results[active]) { e.preventDefault(); select(results[active]); }
            else if (e.key === 'Escape') { setOpen(false); ref.current?.blur(); }
          }}
          placeholder={placeholder ?? (isHero ? 'Try “Check Point”, “TEVA”, or “חברה” …' : 'Search any Israeli public company')}
          className={`flex-1 bg-transparent ${isHero ? 'py-5 px-4 text-[20px]' : 'py-3 px-3 text-[14px]'} text-[var(--bone)] placeholder:text-[var(--bone-faint)] outline-none`}
          aria-autocomplete="list"
        />
        <kbd className="hidden md:flex mr-3 px-2 py-1 text-[10px] font-mono text-[var(--bone-faint)] border border-[var(--ink-4)] rounded-none">
          /
        </kbd>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 card max-h-[420px] overflow-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          {results.map((c, i) => {
            const sec = SECTOR_BY_KEY[c.sector as SectorKey];
            return (
              <button
                key={c.symbol}
                onMouseDown={e => { e.preventDefault(); select(c); }}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left flex items-center gap-4 px-4 py-3 border-b border-[var(--ink-4)] last:border-b-0 transition-colors ${active === i ? 'bg-[var(--ink-3)]' : 'hover:bg-[var(--ink-3)]/60'}`}
              >
                <span
                  className="font-mono text-[11px] tracking-widest"
                  style={{ color: sec?.hue }}
                  aria-hidden
                >
                  {sec?.glyph}
                </span>
                <span className="font-mono text-[12px] text-[var(--bone)] w-20 shrink-0">{c.symbol}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-[var(--bone)] truncate">{c.englishName}</div>
                  <div className="font-heb text-[12px] text-[var(--bone-faint)] truncate">{c.hebrewName}</div>
                </div>
                <span className="eyebrow shrink-0 hidden md:inline">{sec?.en}</span>
              </button>
            );
          })}
          {q.trim() && (
            <div className="px-4 py-2 eyebrow text-[var(--bone-faint)] border-t border-[var(--ink-4)]">
              ↵ Open · ↑↓ Navigate · Esc Close
            </div>
          )}
        </div>
      )}
    </div>
  );
}
