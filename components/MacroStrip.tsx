/**
 * Compact, single-row macro strip for the home page hero.
 *
 * Shows the regime snapshot in one glance — what bond yields, the shekel,
 * gold, oil and the two equity benchmarks (TA-35 + S&P) are doing right now.
 * Links through to /macro for the full picture.
 *
 * Server component; uses the same getMacro() loader (5-min revalidate).
 */

import Link from 'next/link';
import { getMacro } from '@/lib/macro';

function fmt(v: number | null | undefined, kind: 'percent' | 'fx' | 'price' | 'index'): string {
  if (v == null) return '—';
  switch (kind) {
    case 'percent': return `${v.toFixed(2)}%`;
    case 'fx':      return v < 5 ? v.toFixed(4) : v.toFixed(2);
    case 'index':   return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'price':
    default:        return v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : v.toFixed(2);
  }
}

function changeClass(p?: number | null): string {
  if (p == null) return 'text-[var(--bone-faint)]';
  return p >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]';
}

export async function MacroStrip() {
  const macro = await getMacro().catch(() => null);
  if (!macro) return null;

  // Pick the 8 highest-signal readings — the regime in a single row.
  const find = (sym: string) => {
    const all = [
      ...macro.yields, ...macro.fx, ...macro.commodities, ...macro.indices, ...macro.crypto,
    ];
    return all.find(q => q.symbol === sym);
  };

  const wanted = [
    { sym: 'TA125.TA',  label: 'TA-125',  kind: 'index' as const },
    { sym: '^GSPC',     label: 'S&P 500', kind: 'index' as const },
    { sym: '^TNX',      label: 'US 10Y',  kind: 'percent' as const },
    { sym: 'USDILS=X',  label: 'USD/ILS', kind: 'fx' as const },
    { sym: 'GC=F',      label: 'Gold',    kind: 'price' as const },
    { sym: 'CL=F',      label: 'WTI',     kind: 'price' as const },
    { sym: 'DX-Y.NYB',  label: 'DXY',     kind: 'fx' as const },
    { sym: 'BTC-USD',   label: 'BTC',     kind: 'price' as const },
  ];

  const rows = wanted
    .map(w => ({ ...w, q: find(w.sym) }))
    .filter(r => r.q?.value != null);

  if (rows.length === 0) return null;

  return (
    <Link
      href="/macro"
      className="block border-y border-[var(--ink-4)] bg-[var(--ink-1)] hover:bg-[var(--ink-2)] transition-colors"
      aria-label="View full macro dashboard"
    >
      <div className="mx-auto max-w-[1680px] px-6 py-2.5">
        <div className="flex items-center gap-5 overflow-x-auto whitespace-nowrap">
          <span className="eyebrow text-[var(--amber-bright)] shrink-0">
            <span className="live-dot mr-2" />REGIME
          </span>
          <div className="flex items-center gap-5 flex-1">
            {rows.map(r => (
              <div key={r.sym} className="flex items-baseline gap-2 shrink-0">
                <span className="eyebrow text-[var(--bone-faint)]">{r.label}</span>
                <span className="font-mono text-[12px] text-[var(--bone)]">{fmt(r.q!.value, r.kind)}</span>
                <span className={`font-mono text-[10.5px] ${changeClass(r.q!.changePct)}`}>
                  {r.q!.changePct != null
                    ? `${r.q!.changePct >= 0 ? '+' : ''}${(r.q!.changePct * 100).toFixed(2)}%`
                    : '—'}
                </span>
              </div>
            ))}
          </div>
          <span className="eyebrow text-[var(--bone-faint)] hidden lg:inline-block shrink-0">
            FULL MACRO ↗
          </span>
        </div>
      </div>
    </Link>
  );
}
