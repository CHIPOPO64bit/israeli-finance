import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WatchlistBar } from '@/components/WatchlistBar';
import { YieldCurveChart } from '@/components/YieldCurveChart';
import { getMacro, buildYieldCurve, spreadBetween, ASSET_CLASS_ALLOCATION, type MacroQuote } from '@/lib/macro';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export const metadata = {
  title: 'Macro · BORSA',
  description: 'Sovereign bond yields, currencies, commodities and the global asset-class allocation — the regime context for any Israeli stock you research.',
};

function fmtValue(q: MacroQuote): string {
  if (q.value == null) return '—';
  switch (q.format) {
    case 'percent': return `${q.value.toFixed(2)}%`;
    case 'fx':      return q.value < 5 ? q.value.toFixed(4) : q.value.toFixed(2);
    case 'index':   return q.value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'price':
    default:
      return q.value >= 1000 ? q.value.toLocaleString(undefined, { maximumFractionDigits: 0 })
           : q.value.toFixed(2);
  }
}

function changeClass(p?: number | null): string {
  if (p == null) return 'text-[var(--bone-faint)]';
  return p >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]';
}

async function MacroContent() {
  const macro = await getMacro();
  const curve = buildYieldCurve(macro.yields);
  const spread210 = spreadBetween(macro.yields, '^FVX', '^TNX');     // 5y vs 10y (close-ish proxy for 2-10)
  const totalTrn = ASSET_CLASS_ALLOCATION.reduce((s, a) => s + a.trillionsUSD, 0);

  return (
    <>
      <section className="mx-auto max-w-[1680px] px-6 pt-10 pb-4">
        <div className="eyebrow flex items-center gap-3">
          <span className="inline-block h-[1px] w-10 bg-[var(--amber)]" />
          MACRO · REGIME CONTEXT
        </div>
        <h1 className="mt-3 font-display text-[clamp(40px,5.5vw,72px)] leading-[0.95] tracking-[-0.035em] text-[var(--bone)]">
          The world of money.
        </h1>
        <p className="mt-3 max-w-[760px] text-[14px] leading-relaxed text-[var(--bone-dim)]">
          Sovereign bond yields, the currency board, commodities and global indices — refreshed every 5 minutes.
          Real-estate names trade on the rate path; energy and shipping on the commodity cycle;
          Israeli tech earnings convert at the shekel rate. Read the regime first, the stock second.
        </p>
      </section>

      {/* Yield curve + 5y/10y spread */}
      <section className="mx-auto max-w-[1680px] px-6 mt-4 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <YieldCurveChart points={curve} />
        </div>
        <div className="col-span-12 lg:col-span-4 card p-5">
          <div className="eyebrow text-[var(--amber-bright)]">RATE SIGNALS</div>
          <div className="font-display text-[20px] text-[var(--bone)] mt-1 tracking-[-0.025em] mb-3">
            What the curve is saying
          </div>
          <table className="w-full text-[12px] font-mono">
            <tbody>
              {macro.yields.map(q => (
                <tr key={q.symbol} className="border-b border-[var(--ink-4)] last:border-b-0">
                  <td className="py-1.5 text-[var(--bone-dim)]">{q.label}</td>
                  <td className="py-1.5 text-right text-[var(--bone)]">{fmtValue(q)}</td>
                  <td className={`py-1.5 text-right pl-3 ${changeClass(q.changePct)}`}>
                    {q.changePct != null ? `${q.changePct >= 0 ? '+' : ''}${(q.changePct * 100).toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
              {spread210 != null && (
                <tr>
                  <td className="pt-3 text-[var(--bone-faint)]">5y ↔ 10y spread</td>
                  <td className="pt-3 text-right text-[var(--bone)] numeric">
                    {(spread210 >= 0 ? '+' : '') + (spread210 * 100).toFixed(0)} bps
                  </td>
                  <td className="pt-3 text-right"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quote groups */}
      {macro.groups.filter(g => g.key !== 'yields').map(group => (
        <section key={group.key} className="mx-auto max-w-[1680px] px-6 mt-10">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="eyebrow text-[var(--amber-bright)]">{group.title.toUpperCase()}</div>
              <div className="font-display text-[22px] text-[var(--bone)] mt-0.5 tracking-[-0.025em]">{group.title}</div>
            </div>
            <span className="eyebrow text-[var(--bone-faint)] max-w-[480px] text-right">{group.subtitle}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
            {group.quotes.map(q => (
              <div key={q.symbol} className="bg-[var(--ink-2)] p-4 flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="eyebrow">{q.label}</span>
                  <span className="font-mono text-[9.5px] text-[var(--bone-faint)]">{q.symbol}</span>
                </div>
                <div className="font-mono text-[20px] text-[var(--bone)] mt-0.5 tracking-tight">{fmtValue(q)}</div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px] text-[var(--bone-faint)]">{q.detail}</span>
                  <span className={`font-mono text-[11px] ${changeClass(q.changePct)}`}>
                    {q.changePct != null ? `${q.changePct >= 0 ? '+' : ''}${(q.changePct * 100).toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Asset class allocation */}
      <section className="mx-auto max-w-[1680px] px-6 mt-12">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="eyebrow text-[var(--amber-bright)]">WORLD-OF-MONEY ALLOCATION</div>
            <div className="font-display text-[22px] text-[var(--bone)] mt-0.5 tracking-[-0.025em]">
              Where the ${totalTrn.toFixed(0)}T sits
            </div>
            <p className="mt-1 max-w-[680px] text-[12.5px] text-[var(--bone-dim)] leading-relaxed">
              Approximate relative sizes of the major asset classes globally.
              The numbers move slowly — they're the answer to <span className="text-[var(--bone)]">"is bond-land bigger than stock-land?"</span>
              (it is, by ~25%).
            </p>
          </div>
        </div>

        {/* Stacked horizontal bar */}
        <div className="card p-5">
          <div className="flex w-full h-10 border border-[var(--ink-4)] overflow-hidden">
            {ASSET_CLASS_ALLOCATION.map(a => (
              <div
                key={a.key}
                style={{
                  width: `${(a.trillionsUSD / totalTrn) * 100}%`,
                  background: a.hue,
                }}
                className="flex items-center justify-center text-[10px] font-mono text-[var(--ink-0)] font-bold uppercase tracking-wider"
                title={`${a.label} · $${a.trillionsUSD}T (${((a.trillionsUSD / totalTrn) * 100).toFixed(1)}%)`}
              >
                {a.trillionsUSD >= 15 ? `${((a.trillionsUSD / totalTrn) * 100).toFixed(0)}%` : ''}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--ink-4)] mt-5 border border-[var(--ink-4)]">
            {ASSET_CLASS_ALLOCATION.map(a => (
              <div key={a.key} className="bg-[var(--ink-2)] p-3 flex flex-col">
                <div className="flex items-center gap-2 eyebrow">
                  <span aria-hidden style={{ color: a.hue }}>●</span>
                  {a.label}
                </div>
                <div className="numeric text-[22px] text-[var(--bone)] mt-1.5 leading-none">
                  ${a.trillionsUSD < 10 ? a.trillionsUSD.toFixed(1) : a.trillionsUSD.toFixed(0)}T
                </div>
                <div className="text-[11px] text-[var(--bone-faint)] mt-1 leading-snug">
                  {((a.trillionsUSD / totalTrn) * 100).toFixed(1)}% · {a.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[11px] text-[var(--muted)] leading-snug">
            Estimates as of mid-2025 from BIS (bonds), World Federation of Exchanges (equities),
            World Gold Council (gold), Savills (real estate) and CoinMarketCap (crypto).
            Approximate — used to frame the relative scale of each asset class, not for precision allocation.
          </div>
        </div>
      </section>

      {/* Data attribution */}
      <section className="mx-auto max-w-[1680px] px-6 mt-12">
        <div className="card p-4 text-[11px] text-[var(--muted)] leading-relaxed">
          <div className="eyebrow text-[var(--bone-faint)] mb-1">DATA · {new Date(macro.asOf).toLocaleString()}</div>
          Live quotes: Yahoo Finance.
          Asset-class scale: BIS · WFE · WGC · Savills · CoinMarketCap (annual aggregates).
          Refresh: every 5 minutes.
          Macro is for context, not market timing.
        </div>
      </section>
    </>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-[1680px] px-6 py-16">
      <div className="card p-8 shimmer h-[400px]" />
    </div>
  );
}

export default function MacroPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <WatchlistBar />
      <Suspense fallback={<Loading />}>
        <MacroContent />
      </Suspense>
      <Footer />
    </main>
  );
}
