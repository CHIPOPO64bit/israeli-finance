import { Suspense } from 'react';
import { COMPANIES } from '@/lib/companies';
import { SECTORS } from '@/lib/sectors';
import { getQuotes, type QuotePreview } from '@/lib/yahoo';
import { getCatalog, searchCatalog, type EnrichedCompany } from '@/lib/catalog';
import { scoreLite, pickRail, type RailKey, type Pick } from '@/lib/screener';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SearchBar } from '@/components/SearchBar';
import { SectorFilter } from '@/components/SectorFilter';
import { CompanyCard } from '@/components/CompanyCard';
import { Ticker } from '@/components/Ticker';
import { FeaturedRail } from '@/components/FeaturedRail';
import { SortToggle, type SortKey } from '@/components/SortToggle';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type SearchParams = Promise<{ sector?: string; limit?: string; sort?: string }>;

const DEFAULT_LIMIT = 200;
const LIMIT_STEP = 200;

function normSort(s: string | undefined): SortKey {
  if (s === 'diamond' || s === '1y' || s === 'small') return s;
  return 'cap';
}

function rankComparator(sort: SortKey, scoresBySymbol: Record<string, ReturnType<typeof scoreLite>>, quotesBySymbol: Record<string, QuotePreview>):
  (a: EnrichedCompany, b: EnrichedCompany) => number {
  const cap = (c: EnrichedCompany) =>
    quotesBySymbol[c.symbol.toUpperCase()]?.marketCap ?? c.marketCap ?? 0;
  if (sort === 'diamond') return (a, b) => (scoresBySymbol[b.symbol.toUpperCase()]?.score ?? 0) - (scoresBySymbol[a.symbol.toUpperCase()]?.score ?? 0);
  if (sort === '1y')      return (a, b) => (quotesBySymbol[b.symbol.toUpperCase()]?.changePercent52w ?? -2) - (quotesBySymbol[a.symbol.toUpperCase()]?.changePercent52w ?? -2);
  if (sort === 'small')   return (a, b) => cap(a) - cap(b);
  return (a, b) => cap(b) - cap(a);
}

async function HomeContent({ sector, limit, sort }: { sector: string; limit: number; sort: SortKey }) {
  const catalog = await getCatalog();
  const counts: Record<string, number> = {};
  for (const s of SECTORS) counts[s.key] = catalog.filter(c => c.sector === s.key).length;
  const total = catalog.length;
  const curatedCount = catalog.filter(c => c.curated).length;

  // Filter & sort
  const filtered = sector === 'all' ? catalog : catalog.filter(c => c.sector === sector);
  // Fetch live quotes for the top window (cheap, batched). We need quotes for
  // BOTH the visible grid AND the rail-ranking pool (top by mcap so rails feel curated).
  const railPool = filtered.slice(0, Math.max(200, limit));   // pool for screener
  const visiblePool = filtered.slice(0, limit);
  const symbolsToFetch = Array.from(new Set([...railPool, ...visiblePool].map(c => c.symbol)));
  const quotes = await getQuotes(symbolsToFetch).catch((): Record<string, QuotePreview> => ({}));

  // Compute Diamond-Lite for the rail pool — fast, in-memory.
  const scoresBySymbol: Record<string, ReturnType<typeof scoreLite>> = {};
  const railPicks: Pick[] = railPool.map(c => {
    const q = quotes[c.symbol.toUpperCase()];
    const score = scoreLite(q, c);
    scoresBySymbol[c.symbol.toUpperCase()] = score;
    return { company: c, quote: q, score };
  });

  // Sorted visible window
  const sorted = [...filtered].sort(rankComparator(sort, scoresBySymbol, quotes));
  const visible = sorted.slice(0, limit);
  const remaining = filtered.length - visible.length;

  // Pre-compute every rail flavor (cheap; same pool).
  const rails: Record<RailKey, Pick[]> = {
    top:      pickRail(railPicks, 'top', 8),
    micro:    pickRail(railPicks, 'micro', 8),
    momentum: pickRail(railPicks, 'momentum', 8),
    value:    pickRail(railPicks, 'value', 8),
    quality:  pickRail(railPicks, 'quality', 8),
  };

  return (
    <>
      <section className="relative">
        <div className="mx-auto max-w-[1680px] px-6 pt-14 pb-10">
          <div className="grid grid-cols-12 gap-8 items-end">
            <div className="col-span-12 lg:col-span-8">
              <div className="eyebrow flex items-center gap-3">
                <span className="inline-block h-[1px] w-10 bg-[var(--amber)]" />
                ISSUE №01 · TEL AVIV
              </div>
              <h1 className="mt-4 font-display text-[clamp(48px,7.5vw,108px)] leading-[0.92] tracking-[-0.04em] text-[var(--bone)] rise">
                The numbers,
                <br />
                <span className="italic font-[300]" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100' }}>
                  not the noise.
                </span>
              </h1>
              <p className="mt-6 max-w-[600px] text-[16px] leading-relaxed text-[var(--bone-dim)] rise" style={{ animationDelay: '120ms' }}>
                A working atlas of {total.toLocaleString()}&nbsp;Israeli public companies — pulled live
                from the Tel Aviv Stock Exchange. Financials as filed, the people who run them, and the
                primary disclosures. <span className="text-[var(--bone)]">No predictions. Only the books.</span>
              </p>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <ul className="space-y-2 text-[12px] font-mono text-[var(--bone-faint)] rise" style={{ animationDelay: '240ms' }}>
                <li className="flex justify-between border-b border-[var(--ink-4)] pb-2">
                  <span>TASE LISTED</span>
                  <span className="text-[var(--bone)]">{total.toLocaleString()}</span>
                </li>
                <li className="flex justify-between border-b border-[var(--ink-4)] pb-2">
                  <span>WITH HEBREW PROFILE</span>
                  <span className="text-[var(--bone)]">{curatedCount}</span>
                </li>
                <li className="flex justify-between border-b border-[var(--ink-4)] pb-2">
                  <span>SECTORS</span>
                  <span className="text-[var(--bone)]">{SECTORS.length}</span>
                </li>
                <li className="flex justify-between border-b border-[var(--ink-4)] pb-2">
                  <span>EXCHANGES</span>
                  <span className="text-[var(--bone)]">TASE · NASDAQ · NYSE</span>
                </li>
                <li className="flex justify-between">
                  <span>UNIVERSE REFRESH</span>
                  <span className="text-[var(--gain)]">EVERY 3 H</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 max-w-[860px] rise" style={{ animationDelay: '360ms' }}>
            <SearchBar companies={catalog} size="hero" autoFocus />
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 eyebrow text-[var(--bone-faint)]">
              <span>↵ OPEN COMPANY</span>
              <span>↑↓ NAVIGATE</span>
              <span>/ FOCUS FROM ANYWHERE</span>
              <span>· {total.toLocaleString()} TICKERS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured rails — researcher shortlists */}
      <section className="mx-auto max-w-[1680px] px-6">
        <FeaturedRail picks={rails} />
      </section>

      <section className="mx-auto max-w-[1680px] px-6">
        <SectorFilter counts={counts} total={total} />
      </section>

      <section className="mx-auto max-w-[1680px] px-6 mt-10">
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-[36px] tracking-[-0.03em] text-[var(--bone)]">
              {sector === 'all' ? 'The full atlas' : SECTORS.find(s => s.key === sector)?.en ?? 'Companies'}
            </h2>
            <span className="eyebrow text-[var(--bone-faint)]">
              showing {Math.min(limit, sector === 'all' ? total : counts[sector] ?? 0)} of {sector === 'all' ? total : counts[sector] ?? 0}
            </span>
          </div>
          <SortToggle current={sort} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
          {visible.map(c => (
            <CompanyCard
              key={c.symbol}
              company={c}
              quote={quotes[c.symbol.toUpperCase()]}
              score={scoresBySymbol[c.symbol.toUpperCase()]}
            />
          ))}
        </div>

        {remaining > 0 && (
          <div className="mt-6 flex items-center justify-center">
            <a
              href={`?${new URLSearchParams({
                ...(sector && sector !== 'all' ? { sector } : {}),
                ...(sort !== 'cap' ? { sort } : {}),
                limit: String(limit + LIMIT_STEP),
              }).toString()}#sectors`}
              className="inline-flex items-center gap-3 px-5 py-3 border border-[var(--amber)] text-[var(--bone)] tracking-[0.18em] uppercase text-[11px] font-mono hover:bg-[var(--amber)]/10 transition-colors"
            >
              Load {Math.min(LIMIT_STEP, remaining)} more
              <span className="text-[var(--bone-faint)]">· {remaining} remaining</span>
            </a>
          </div>
        )}
      </section>
    </>
  );
}

async function TickerBar() {
  const featured = [
    'TEVA', 'CHKP', 'NICE', 'WIX', 'MNDY', 'CYBR', 'ICL', 'POLI.TA', 'LUMI.TA', 'AZRG.TA',
    'BCOM.TA', 'TSEM', 'INMD', 'FROG',
  ];
  const items = featured
    .map(s => COMPANIES.find(c => c.symbol === s))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const quotes = await getQuotes(items.map(c => c.symbol)).catch((): Record<string, QuotePreview> => ({}));
  return <Ticker items={items.map(c => ({ company: c, quote: quotes[c.symbol.toUpperCase()] }))} />;
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const sector = sp.sector ?? 'all';
  const sort = normSort(sp.sort);
  const limit = Math.max(DEFAULT_LIMIT, Math.min(2000, parseInt(sp.limit ?? '', 10) || DEFAULT_LIMIT));

  return (
    <main className="min-h-screen">
      <Header />

      <Suspense fallback={<div className="h-9 bg-[var(--ink-0)]" />}>
        <TickerBar />
      </Suspense>

      <Suspense fallback={<GridSkeleton n={12} />}>
        <HomeContent sector={sector} limit={limit} sort={sort} />
      </Suspense>

      <Footer />
    </main>
  );
}

function GridSkeleton({ n }: { n: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-5 h-[180px] shimmer" />
      ))}
    </div>
  );
}
