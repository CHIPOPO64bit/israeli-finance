'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Pick, RailKey } from '@/lib/screener';
import { DiamondChip } from './DiamondChip';
import { formatChange, formatMoney, normalisePriceUnit } from '@/lib/format';

type Rail = {
  key: RailKey;
  label: string;
  hint: string;
};

const RAILS: Rail[] = [
  { key: 'top',      label: '◆ Top Diamonds',     hint: 'Highest composite Diamond-Lite score' },
  { key: 'micro',    label: '🔍 Hidden Gems',      hint: 'Sub-$300M cap, high Diamond score' },
  { key: 'momentum', label: '↑ Momentum',          hint: 'Best 1-year price change' },
  { key: 'value',    label: '↘ Cheap',             hint: 'P/E < 12, hasn’t cratered' },
  { key: 'quality',  label: '◮ Quality',           hint: 'Profitable + growing' },
];

type Props = {
  picks: Record<RailKey, Pick[]>;
};

export function FeaturedRail({ picks }: Props) {
  const [active, setActive] = useState<RailKey>('top');
  const rail = RAILS.find(r => r.key === active)!;
  const items = picks[active] ?? [];

  return (
    <section className="border-y border-[var(--ink-4)] py-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <div>
          <div className="eyebrow text-[var(--amber-bright)]">RESEARCHER SHORTLISTS · LIVE</div>
          <div className="font-display text-[24px] text-[var(--bone)] tracking-[-0.025em]">
            Hidden-diamond hunting ground
          </div>
          <div className="mt-0.5 text-[12.5px] text-[var(--bone-dim)]">{rail.hint}</div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {RAILS.map(r => (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.16em] uppercase border transition-colors ${
                active === r.key
                  ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
                  : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-5)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-[12.5px] text-[var(--bone-faint)] py-8 text-center">
          No matches in this lane right now — try another tab.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
          {items.map(p => {
            const c = p.company;
            const change = formatChange(p.quote?.changePercent);
            const cls =
              change.sign === 'up' ? 'text-[var(--gain)]' :
              change.sign === 'down' ? 'text-[var(--loss)]' : 'text-[var(--bone-faint)]';
            const change52 = p.quote?.changePercent52w;
            const priceN = normalisePriceUnit(p.quote?.price ?? null, p.quote?.currency);
            return (
              <Link
                key={c.symbol}
                href={`/c/${encodeURIComponent(c.symbol)}`}
                className="card p-3 hover:bg-[var(--ink-3)] transition-colors flex flex-col gap-2 min-h-[140px]"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-mono text-[10.5px] text-[var(--bone-faint)] tracking-wider truncate flex-1 min-w-0">{c.symbol}</span>
                  <DiamondChip score={p.score} />
                </div>
                <div className="font-display text-[15px] tracking-[-0.025em] text-[var(--bone)] leading-tight line-clamp-2">
                  {c.shortName}
                </div>
                <div className="mt-auto flex items-baseline justify-between gap-2 text-[11px] font-mono">
                  <span className="text-[var(--bone-dim)]">
                    {priceN ? `${priceN.symbol}${priceN.value.toFixed(2)}` : formatMoney(p.quote?.marketCap, p.quote?.currency)}
                  </span>
                  <span className={cls}>{change.text}</span>
                </div>
                {change52 != null && (
                  <div className="text-[10px] font-mono text-[var(--bone-faint)] flex justify-between">
                    <span>1Y</span>
                    <span className={change52 >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}>
                      {(change52 >= 0 ? '+' : '')}{(change52 * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-3 text-[11px] text-[var(--muted)]">
        Diamond-Lite is a fast screener score from live batched-quote metrics (1Y change, P/E, P/B, market cap, EPS).
        Click any name to open the full breakdown with SEC-XBRL-sourced fundamentals where available.
      </div>
    </section>
  );
}
