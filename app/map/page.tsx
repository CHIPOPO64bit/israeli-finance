import { Suspense } from 'react';
import { SECTORS } from '@/lib/sectors';
import { getCatalog } from '@/lib/catalog';
import { getQuotes, type QuotePreview } from '@/lib/yahoo';
import { scoreLite } from '@/lib/screener';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WatchlistBar } from '@/components/WatchlistBar';
import { MarketMap, type MapDatum } from '@/components/MarketMap';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export const metadata = {
  title: 'Market Map · BORSA',
  description: 'A visual map of all Israeli public companies — clustered by sector, sized by market cap or other parameters.',
};

async function MapContent() {
  const catalog = await getCatalog();
  // Yahoo quotes are slow for the full 572-name universe. We split into chunks
  // inside getQuotes, but for the map we cap to ~500 by market cap to keep the
  // first paint reasonable. The catalog itself includes the full list — anyone
  // can still navigate to a name we didn't pre-quote.
  const top = [...catalog].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)).slice(0, 500);
  const quotes = await getQuotes(top.map(c => c.symbol)).catch((): Record<string, QuotePreview> => ({}));

  const data: MapDatum[] = top.map(c => {
    const q = quotes[c.symbol.toUpperCase()];
    const score = scoreLite(q, c);
    // Pick the currency from Yahoo; fall back to inferring from the ticker
    // (a .TA suffix means TASE in agorot; everything else we treat as USD).
    let ccy = (q?.currency ?? '').toUpperCase() || undefined;
    if (!ccy) ccy = c.symbol.toUpperCase().endsWith('.TA') ? 'ILA' : 'USD';
    const isAgorot = ccy === 'ILA';
    const isILS = isAgorot || ccy === 'ILS';
    const rawCap = q?.marketCap ?? c.marketCap ?? 0;
    // The "capUsd" field is for cross-currency screener sizing only — it must
    // never be shown verbatim to the user. TASE caps are reported in ILS
    // (NOT agorot) by Yahoo's marketCap field; we still need to convert to USD.
    const capUsd = isILS ? rawCap / 3.7 : rawCap;
    return {
      symbol: c.symbol,
      shortName: c.shortName,
      hebrewName: c.curated ? c.hebrewName : undefined,
      sector: c.sector,
      currency: ccy,
      marketCap: rawCap || undefined,
      capUsd: capUsd || undefined,
      pct52w: q?.changePercent52w ?? null,
      diamond: score.score,
      pe: q?.trailingPE ?? null,
      pb: q?.priceToBook ?? null,
      price: q?.price ?? null,
      changePct: q?.changePercent ?? null,
    };
  }).filter(d => (d.capUsd ?? 0) > 0);   // nodes need a positive size

  // Stats for the headline
  const totalCap = data.reduce((s, d) => s + (d.capUsd ?? 0), 0);

  return (
    <>
      <section className="mx-auto max-w-[1680px] px-6 pt-10 pb-4">
        <div className="eyebrow flex items-center gap-3">
          <span className="inline-block h-[1px] w-10 bg-[var(--amber)]" />
          MARKET MAP · LIVE FROM TASE
        </div>
        <h1 className="mt-3 font-display text-[clamp(40px,5.5vw,72px)] leading-[0.95] tracking-[-0.035em] text-[var(--bone)]">
          The whole market, at a glance.
        </h1>
        <p className="mt-3 max-w-[720px] text-[14px] leading-relaxed text-[var(--bone-dim)]">
          Every public Israeli company plotted as a bubble — clustered around its sector centroid,
          sized by the parameter you choose. Pinch into a sector by toggling chips. Switch the
          sizing metric to scan for unusual concentrations: a giant micro-cap on the
          <span className="text-[var(--bone)]"> 1-Year Momentum</span> view is exactly what a researcher hunts for.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 eyebrow text-[var(--bone-faint)]">
          <span>{data.length} BUBBLES</span>
          <span>·</span>
          <span>{SECTORS.length} SECTORS</span>
          <span>·</span>
          <span>TOTAL CAP ${(totalCap / 1e9).toFixed(0)}B</span>
          <span>·</span>
          <span>HOVER · CLICK · TOGGLE</span>
        </div>
      </section>

      <section className="mx-auto max-w-[1680px] px-6 pb-16">
        <MarketMap data={data} />
      </section>
    </>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-[1680px] px-6 py-16">
      <div className="card p-8 shimmer h-[600px]" />
    </div>
  );
}

export default function MapPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <WatchlistBar />
      <Suspense fallback={<Loading />}>
        <MapContent />
      </Suspense>
      <Footer />
    </main>
  );
}
