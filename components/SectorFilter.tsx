'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SECTORS } from '@/lib/sectors';

type Props = {
  counts: Record<string, number>;
  total: number;
};

export function SectorFilter({ counts, total }: Props) {
  const params = useSearchParams();
  const current = params.get('sector') ?? 'all';

  const make = (key: string) => {
    const u = new URLSearchParams(params.toString());
    if (key === 'all') u.delete('sector');
    else u.set('sector', key);
    const s = u.toString();
    return s ? `/?${s}#sectors` : '/#sectors';
  };

  return (
    <div id="sectors" className="scroll-mt-24 border-y border-[var(--ink-4)] py-6">
      <div className="flex items-center justify-between gap-4 mb-4 px-1">
        <div className="eyebrow">FILTER · BY MARKET</div>
        <div className="eyebrow text-[var(--bone-faint)]">
          {current === 'all'
            ? `${total} companies`
            : `${counts[current] ?? 0} of ${total}`}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip href={make('all')} active={current === 'all'} label="ALL" count={total} hue="var(--bone)" glyph="◯" />
        {SECTORS.map(s => (
          <Chip
            key={s.key}
            href={make(s.key)}
            active={current === s.key}
            label={s.en}
            count={counts[s.key] ?? 0}
            hue={s.hue}
            glyph={s.glyph}
            hebrew={s.he}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  href, active, label, count, hue, glyph, hebrew,
}: { href: string; active: boolean; label: string; count: number; hue: string; glyph: string; hebrew?: string }) {
  if (count === 0) {
    return (
      <span
        className="group flex items-center gap-2 border border-[var(--ink-4)] px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bone-faint)]/40 cursor-not-allowed"
      >
        <span aria-hidden style={{ color: hue, opacity: 0.4 }}>{glyph}</span>
        {label}
        <span className="text-[10px] opacity-60">·{count}</span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={`group flex items-center gap-2 border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] transition-colors ${
        active
          ? 'border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--bone)]'
          : 'border-[var(--ink-4)] text-[var(--bone-dim)] hover:border-[var(--ink-5)] hover:text-[var(--bone)] hover:bg-[var(--ink-2)]'
      }`}
    >
      <span aria-hidden style={{ color: hue }}>{glyph}</span>
      <span>{label}</span>
      {hebrew && <span className="hidden lg:inline font-heb text-[10px] text-[var(--bone-faint)] normal-case">{hebrew}</span>}
      <span className="text-[10px] text-[var(--bone-faint)]">·{count}</span>
    </Link>
  );
}
