import { notFound } from 'next/navigation';
import Link from 'next/link';
import { findInCatalog, getCatalog } from '@/lib/catalog';
import { SECTOR_BY_KEY, type SectorKey } from '@/lib/sectors';
import { getCompanySnapshot } from '@/lib/yahoo';
import { cikFor, getFilings, getAnnualFromFilings, getQuarterlyFromFilings } from '@/lib/sec';
import { enrichOfficers, getOfficersFromWikidata, teamMakeup } from '@/lib/people';
import { deriveFundamentals, deriveDiamond } from '@/lib/growth';
import {
  formatChange, formatMoney, formatPercent, formatPrice, formatRatio, formatInt, normalisePriceUnit,
} from '@/lib/format';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SearchBar } from '@/components/SearchBar';
import { MetricTile } from '@/components/MetricTile';
import { LeadershipPanel } from '@/components/LeadershipPanel';
import { FinancialsTable } from '@/components/FinancialsTable';
import { PriceChart } from '@/components/PriceChart';
import { ReportsPanel } from '@/components/ReportsPanel';
import { SectorBadge } from '@/components/SectorBadge';
import { FilingsPanel } from '@/components/FilingsPanel';
import { XBRLFinancials } from '@/components/XBRLFinancials';
import { SectionNav } from '@/components/SectionNav';
import { GrowthAnalysis } from '@/components/GrowthAnalysis';
import { FundamentalsPanel } from '@/components/FundamentalsPanel';
import { VerdictPanel } from '@/components/VerdictPanel';
import { SectorContextPanel } from '@/components/SectorContextPanel';
import { deriveVerdict, sectorReadingGuide } from '@/lib/flags';
import { WatchStar } from '@/components/WatchStar';
import { WatchlistBar } from '@/components/WatchlistBar';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

type Params = Promise<{ symbol: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { symbol } = await params;
  const c = await findInCatalog(decodeURIComponent(symbol));
  if (!c) return { title: 'Not found · BORSA' };
  return {
    title: `${c.englishName} · ${c.symbol} · BORSA`,
    description: c.tagline ?? `${c.englishName} — financials, leadership and filings, as filed.`,
  };
}

export default async function CompanyPage({ params }: { params: Params }) {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol);
  const company = await findInCatalog(decoded);
  if (!company) notFound();

  // Pass the catalog entry so dynamic TASE-only companies (not in our hand-curated
  // catalog) still resolve — getCompanySnapshot previously required a curated entry.
  const snap = await getCompanySnapshot(decoded, company);
  if (!snap) notFound();

  // Primary-source data: SEC filings + XBRL (for SEC-listed Israeli companies)
  const cik = cikFor(company.symbol);
  const [filings, secAnnual, secQuarterly, profiles] = await Promise.all([
    cik ? getFilings(cik, { important: true, limit: 12 }).catch(() => []) : Promise.resolve([]),
    cik ? getAnnualFromFilings(cik, { years: 6 }).catch(() => ({ rows: [], unit: null, entityName: null })) : Promise.resolve({ rows: [], unit: null, entityName: null }),
    cik ? getQuarterlyFromFilings(cik, { quarters: 8 }).catch(() => ({ rows: [], unit: null })) : Promise.resolve({ rows: [], unit: null }),
    (async () => {
      // 1) Officers as named in SEC filings (the rich source — comp, age, title).
      if (snap.officers.length > 0) {
        return enrichOfficers(snap.officers, {
          companyName: company.englishName,
          shortName: company.shortName,
          tickers: [company.symbol, company.symbolTA ?? ''].filter(Boolean),
        });
      }
      // 2) Fall back to Wikidata for TASE-only / non-SEC-filing companies.
      const wd = await getOfficersFromWikidata(company.englishName, company.shortName);
      return wd;
    })().catch(() => snap.officers.map(o => ({ ...o, role: 'other' as const, roleLabel: 'Officer', isFounder: false, isCEO: false, isTechnical: false, seniority: 30 }))),
  ]);
  const makeup = teamMakeup(profiles);

  // 5-year fundamentals + diamond signals
  const fundamentals = deriveFundamentals(secAnnual.rows);
  // (computed below once we have stats from snap.stats)

  const sec = SECTOR_BY_KEY[company.sector as SectorKey];
  const price = snap.price ?? {};
  const stats = snap.stats ?? {};
  const profile = snap.profile ?? {};

  // Diamond scoring uses fundamentals + Yahoo valuation snapshot
  const priceToSales = price.marketCap && stats.totalRevenue && stats.totalRevenue > 0
    ? price.marketCap / stats.totalRevenue
    : null;
  const diamond = deriveDiamond({
    fund: fundamentals,
    marketCap: price.marketCap ?? null,
    enterpriseValue: stats.enterpriseValue,
    trailingPE: stats.trailingPE,
    priceToBook: stats.priceToBook,
    priceToSales,
    totalRevenue: stats.totalRevenue,
    totalCash: stats.totalCash,
    totalDebt: stats.totalDebt,
    isFounderLed: makeup.founders > 0,
    technicalLeaders: makeup.technical,
  });

  // Value-investor verdict (Ardan-style): PASS / WATCH / SKIP + flags
  const isILA = (price.currency ?? '').toUpperCase() === 'ILA';
  const marketCapUsd = price.marketCap != null
    ? (isILA ? price.marketCap / 3.7 : price.marketCap)
    : null;
  // We can't fetch avgVolume from the snapshot directly — use price.regularMarketPrice
  // and a derived avgVolume from summaryDetail if present.
  const avgVol = (snap.stats?.sharesOutstanding != null && snap.stats?.floatShares != null)
    ? null  // placeholder — we don't fetch avgVolume in quoteSummary modules
    : null;
  const verdict = deriveVerdict({
    fund: fundamentals,
    marketCap: price.marketCap,
    marketCapUsd,
    trailingPE: stats.trailingPE,
    forwardPE: stats.forwardPE,
    priceToBook: stats.priceToBook,
    priceToSales,
    profitMargins: stats.profitMargins,
    debtToEquity: stats.debtToEquity,
    totalCash: stats.totalCash,
    totalDebt: stats.totalDebt,
    freeCashflow: stats.freeCashflow,
    avgVolume3M: avgVol,
    price: price.regularMarketPrice,
    currency: price.currency,
    heldPercentInsiders: stats.heldPercentInsiders,
    sector: company.sector,
    industry: profile.industry,
    companyName: company.englishName,
    founded: company.founded,
    isFounderLed: makeup.founders > 0,
    technicalLeaders: makeup.technical,
    hasSecFilings: !!cik,
  });

  const readingGuide = sectorReadingGuide(company.sector, profile.industry);

  const change = formatChange(price.regularMarketChangePercent);
  const changeColor =
    change.sign === 'up' ? 'text-[var(--gain)]' :
    change.sign === 'down' ? 'text-[var(--loss)]' : 'text-[var(--bone-faint)]';

  const priceN = normalisePriceUnit(price.regularMarketPrice ?? null, price.currency);
  const prevN  = normalisePriceUnit(price.regularMarketPreviousClose ?? null, price.currency);
  const dayHi  = normalisePriceUnit(price.regularMarketDayHigh ?? null, price.currency);
  const dayLo  = normalisePriceUnit(price.regularMarketDayLow ?? null, price.currency);
  const yHi    = normalisePriceUnit(price.fiftyTwoWeekHigh ?? null, price.currency);
  const yLo    = normalisePriceUnit(price.fiftyTwoWeekLow ?? null, price.currency);

  let rangePct: number | null = null;
  if (yLo && yHi && priceN && yHi.value !== yLo.value) {
    rangePct = Math.max(0, Math.min(1, (priceN.value - yLo.value) / (yHi.value - yLo.value)));
  }

  const catalog = await getCatalog();
  const sisters = catalog
    .filter(c => c.sector === company.sector && c.symbol !== company.symbol)
    .slice(0, 6);

  const hasGrowth = secAnnual.rows.length >= 3;

  const navItems = [
    { id: 'overview',     label: 'Overview' },
    { id: 'verdict',      label: 'Verdict' },
    ...(hasGrowth ? [{ id: 'diamond', label: 'Diamond' }] : []),
    ...(hasGrowth ? [{ id: 'growth',  label: 'Growth' }] : []),
    { id: 'filings',      label: cik ? 'Filings' : 'Disclosures' },
    ...(cik && (secAnnual.rows.length || secQuarterly.rows.length) ? [{ id: 'financials', label: 'Financials' }] : []),
    { id: 'chart',        label: 'Chart' },
    { id: 'leadership',   label: 'People' },
    { id: 'metrics',      label: 'Metrics' },
    ...(sisters.length ? [{ id: 'sisters', label: 'Peers' }] : []),
  ];

  return (
    <main className="min-h-screen">
      <Header />
      <WatchlistBar />

      <div className="border-b border-[var(--ink-4)] bg-[var(--ink-1)]/90">
        <div className="mx-auto max-w-[1680px] px-6 py-3">
          <SearchBar companies={catalog} size="compact" placeholder="Switch company · search by name or ticker" />
        </div>
      </div>

      <div className="mx-auto max-w-[1680px] px-6">
        <SectionNav items={navItems} />
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────── */}
      <section id="overview" className="mx-auto max-w-[1680px] px-6 pt-8 scroll-mt-24">
        <div className="flex items-center gap-3 mb-4 eyebrow text-[var(--bone-faint)]">
          <Link href={`/?sector=${company.sector}`} className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)]">
            {sec.en}
          </Link>
          <span>›</span>
          <span className="text-[var(--bone)]">{company.symbol}</span>
        </div>

        <div className="grid grid-cols-12 gap-x-8 gap-y-6 items-start">
          <div className="col-span-12 lg:col-span-7">
            <div className="flex items-center gap-3 flex-wrap">
              <SectorBadge sectorKey={company.sector as SectorKey} />
              {company.founded && <span className="eyebrow">EST. {company.founded}</span>}
              {company.hq && <span className="eyebrow">{company.hq.toUpperCase()}</span>}
              {price.exchangeName && <span className="eyebrow text-[var(--bone-faint)]">{price.exchangeName}</span>}
              <WatchStar symbol={company.symbol} size="md" />
            </div>

            <h1 className="mt-4 font-display text-[clamp(48px,7vw,96px)] leading-[0.92] tracking-[-0.035em] text-[var(--bone)]">
              {company.shortName}
            </h1>
            <div className="mt-1 flex items-baseline gap-4 flex-wrap">
              <div className="font-heb text-[28px] text-[var(--bone-dim)]" dir="rtl">{company.hebrewName}</div>
              <div className="font-mono text-[14px] text-[var(--bone-faint)]">
                {company.symbol}
                {company.symbolTA && company.symbolTA !== company.symbol && ` · ${company.symbolTA}`}
              </div>
            </div>

            {profile.longBusinessSummary && (
              <p className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-[var(--bone-dim)]">
                {profile.longBusinessSummary.split('. ').slice(0, 2).join('. ')}.
              </p>
            )}
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="card p-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="eyebrow">LIVE QUOTE</div>
                  <div className="font-mono text-[56px] leading-none text-[var(--bone)] tracking-tight mt-1">
                    {priceN ? `${priceN.symbol}${priceN.value.toFixed(2)}` : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-[18px] ${changeColor}`}>{change.text}</div>
                  <div className="eyebrow text-[var(--bone-faint)] mt-1">PREV · {prevN ? `${prevN.symbol}${prevN.value.toFixed(2)}` : '—'}</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between eyebrow mb-1.5">
                  <span>52W LOW · {yLo ? `${yLo.symbol}${yLo.value.toFixed(2)}` : '—'}</span>
                  <span>52W HIGH · {yHi ? `${yHi.symbol}${yHi.value.toFixed(2)}` : '—'}</span>
                </div>
                <div className="relative h-[6px] bg-[var(--ink-4)]">
                  {rangePct != null && (
                    <>
                      <div className="absolute top-0 bottom-0 bg-gradient-to-r from-[var(--ink-5)] to-[var(--amber)]" style={{ width: `${rangePct * 100}%` }} />
                      <div className="absolute -top-1 -bottom-1 w-[2px] bg-[var(--bone)]" style={{ left: `calc(${rangePct * 100}% - 1px)` }} />
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-px bg-[var(--ink-4)]">
                <SmallStat label="Day low"  value={dayLo ? `${dayLo.symbol}${dayLo.value.toFixed(2)}` : '—'} />
                <SmallStat label="Day high" value={dayHi ? `${dayHi.symbol}${dayHi.value.toFixed(2)}` : '—'} />
                <SmallStat label="Mkt cap"  value={formatMoney(price.marketCap ?? null, price.currency)} />
              </div>
            </div>
          </div>
        </div>

        {/* Headline KPIs — only the six that matter for first glance */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
          <MetricTile
            label="REVENUE · TTM"
            value={formatMoney(stats.totalRevenue, price.currency)}
            sub={stats.revenueGrowth != null
              ? <span className={stats.revenueGrowth >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}>
                  YoY {formatPercent(stats.revenueGrowth, 1)}
                </span>
              : null}
            emphasis="amber"
          />
          <MetricTile
            label="PROFIT MARGIN"
            value={formatPercent(stats.profitMargins, 1)}
            sub={stats.grossMargins != null ? `Gross · ${formatPercent(stats.grossMargins, 1)}` : null}
            emphasis={stats.profitMargins != null && stats.profitMargins >= 0 ? 'gain' : 'loss'}
          />
          <MetricTile
            label="P/E · TRAILING"
            value={formatRatio(stats.trailingPE)}
            sub={stats.forwardPE != null ? `Fwd · ${formatRatio(stats.forwardPE)}` : null}
          />
          <MetricTile
            label="RETURN ON EQUITY"
            value={formatPercent(stats.returnOnEquity, 1)}
            sub={stats.returnOnAssets != null ? `ROA · ${formatPercent(stats.returnOnAssets, 1)}` : null}
          />
          <MetricTile
            label="DEBT / EQUITY"
            value={formatRatio(stats.debtToEquity != null ? stats.debtToEquity / 100 : null)}
            sub={stats.currentRatio != null ? `Current · ${formatRatio(stats.currentRatio)}` : null}
          />
          <MetricTile
            label="EMPLOYEES"
            value={formatInt(profile.fullTimeEmployees)}
            sub={[profile.city, profile.country].filter(Boolean).join(', ') || null}
            emphasis="signal"
          />
        </div>
      </section>

      {/* ── SECTOR READING GUIDE — how to read this company ──── */}
      {readingGuide && (
        <section id="sector-context" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
          <SectorContextPanel
            guide={readingGuide}
            sectorName={sec.en}
            industry={profile.industry}
          />
        </section>
      )}

      {/* ── VALUE-INVESTOR VERDICT (Ardan-style) ────────────── */}
      <section id="verdict" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
        <VerdictPanel v={verdict} />
      </section>

      {/* ── DIAMOND SCOREBOARD ───────────────────────────────── */}
      {hasGrowth && (
        <section id="diamond" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
          <FundamentalsPanel diamond={diamond} />
        </section>
      )}

      {/* ── 5-YEAR GROWTH ────────────────────────────────────── */}
      {hasGrowth && (
        <section id="growth" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
          <GrowthAnalysis
            rows={secAnnual.rows}
            fundamentals={fundamentals}
            unit={secAnnual.unit}
          />
        </section>
      )}

      {/* ── FILINGS ─────────────────────────────────────────────── */}
      <section id="filings" className="mx-auto max-w-[1680px] px-6 mt-16 scroll-mt-24">
        <FilingsPanel company={company} filings={filings} hasCIK={!!cik} />
      </section>

      {/* ── FINANCIALS — only when SEC XBRL is available ──────── */}
      {cik && (secAnnual.rows.length > 0 || secQuarterly.rows.length > 0) && (
        <section id="financials" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
          <XBRLFinancials
            annual={secAnnual.rows}
            quarterly={secQuarterly.rows}
            unit={secAnnual.unit ?? secQuarterly.unit}
            cik={cik}
          />
        </section>
      )}

      {/* TASE-only fallback: Yahoo-derived financials with clear secondary-source label */}
      {!cik && (
        <section id="financials" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
          <FinancialsTable
            annual={snap.annual}
            quarterly={snap.quarterly}
            balance={snap.balanceAnnual}
            cash={snap.cashAnnual}
            currency={price.currency}
          />
        </section>
      )}

      {/* ── CHART + BUSINESS DESCRIPTION ─────────────────────── */}
      <section id="chart" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <PriceChart data={snap.history} currency={price.currency} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <div className="card p-6 h-full">
            <div className="eyebrow">PROFILE</div>
            <div className="font-display text-[22px] text-[var(--bone)] mt-1 tracking-[-0.025em] mb-3">
              What the company actually does
            </div>
            {profile.longBusinessSummary ? (
              <p className="text-[13.5px] leading-relaxed text-[var(--bone-dim)] whitespace-pre-line max-h-[280px] overflow-y-auto pr-2">
                {profile.longBusinessSummary}
              </p>
            ) : (
              <p className="text-[13px] text-[var(--bone-faint)]">No business description published.</p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] font-mono">
              <Info k="Industry" v={profile.industry ?? '—'} />
              <Info k="Sector (Y)" v={profile.sector ?? '—'} />
              <Info k="Headquarters" v={[profile.city, profile.country].filter(Boolean).join(', ') || (company.hq ?? '—')} />
              <Info k="Employees" v={formatInt(profile.fullTimeEmployees)} />
              <Info k="Founded" v={company.founded ? String(company.founded) : '—'} />
              <Info k="Website" v={
                profile.website
                  ? <a className="underline-thread text-[var(--amber-bright)]" href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗</a>
                  : '—'
              } />
            </div>
          </div>
        </div>
      </section>

      {/* ── PEOPLE ─────────────────────────────────────────────── */}
      <section id="leadership" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
        <LeadershipPanel profiles={profiles} makeup={makeup} currency={price.currency} />
      </section>

      {/* ── METRICS · valuation extras ─────────────────────────── */}
      <section id="metrics" className="mx-auto max-w-[1680px] px-6 mt-12 scroll-mt-24">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-[28px] text-[var(--bone)] tracking-[-0.025em]">Valuation &amp; capital structure</h2>
          <span className="eyebrow text-[var(--bone-faint)]">latest reported</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
          <MetricTile label="ENTERPRISE VALUE" value={formatMoney(stats.enterpriseValue, price.currency)} />
          <MetricTile label="P / B" value={formatRatio(stats.priceToBook)} sub={stats.bookValue != null ? `Book · ${formatPrice(stats.bookValue, price.currency, 2)}` : null} />
          <MetricTile label="BETA · 5Y" value={formatRatio(stats.beta)} />
          <MetricTile label="DIVIDEND YIELD" value={formatPercent(stats.dividendYield, 2)} sub={stats.payoutRatio != null ? `Payout · ${formatPercent(stats.payoutRatio, 0)}` : null} />
          <MetricTile label="SHARES OUT" value={formatInt(stats.sharesOutstanding)} sub={stats.floatShares != null ? `Float · ${formatInt(stats.floatShares)}` : null} />
          <MetricTile label="FREE CASH FLOW" value={formatMoney(stats.freeCashflow, price.currency)} sub={stats.operatingCashflow != null ? `Op CF · ${formatMoney(stats.operatingCashflow, price.currency)}` : null} />
          <MetricTile label="TOTAL CASH" value={formatMoney(stats.totalCash, price.currency)} />
          <MetricTile label="TOTAL DEBT" value={formatMoney(stats.totalDebt, price.currency)} />
        </div>
      </section>

      {/* ── PEERS ─────────────────────────────────────────────── */}
      {sisters.length > 0 && (
        <section id="sisters" className="mx-auto max-w-[1680px] px-6 mt-16 scroll-mt-24">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-[28px] text-[var(--bone)] tracking-[-0.025em]">
              Others in {sec.en}
            </h2>
            <Link href={`/?sector=${company.sector}`} className="underline-thread eyebrow text-[var(--bone-dim)] hover:text-[var(--bone)]">
              SEE ALL ↗
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
            {sisters.map(s => (
              <Link key={s.symbol} href={`/c/${encodeURIComponent(s.symbol)}`} className="card p-4 hover:bg-[var(--ink-3)] transition-colors flex flex-col justify-between gap-3 min-h-[120px]">
                <div className="font-mono text-[11px] text-[var(--bone-faint)] tracking-wider">{s.symbol}</div>
                <div className="font-display text-[18px] tracking-[-0.025em] text-[var(--bone)] leading-tight">{s.shortName}</div>
                <div className="font-heb text-[12px] text-[var(--bone-faint)] truncate">{s.hebrewName}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── DATA attribution ───────────────────────────────────── */}
      <section className="mx-auto max-w-[1680px] px-6 mt-16">
        <div className="card p-5 text-[11px] text-[var(--muted)] leading-relaxed">
          <div className="eyebrow text-[var(--bone-faint)] mb-1">DATA · {new Date(snap.asOf).toLocaleString()}</div>
          {cik && <><span className="text-[var(--amber-bright)]">Financials</span> from <a className="underline-thread" target="_blank" rel="noreferrer" href={`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10, '0')}.json`}>SEC XBRL companyfacts</a> · extracted from the company’s filed 10-K / 20-F / 10-Q. </>}
          <span className="text-[var(--bone-dim)]">Live quotes &amp; company description</span>: Yahoo Finance · loaded in {snap.loadedMs}&nbsp;ms.
          <span className="text-[var(--bone-dim)]"> Officer profiles</span>: Wikipedia where available.
          <span className="text-[var(--bone-dim)]"> Disclosures</span>: TASE MAYA · Israeli Securities Authority MAGNA · SEC EDGAR.
          BORSA links to primary filings — it does not provide investment advice.
          {snap.errors && snap.errors.length > 0 && (
            <div className="mt-2 text-[10px] text-[var(--bone-faint)]">
              Partial-data notes · {snap.errors.join(' · ')}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[var(--ink-4)] pb-1.5">
      <span className="text-[var(--bone-faint)] uppercase tracking-wider text-[10px] mt-1">{k}</span>
      <span className="text-[var(--bone)] text-right text-[12px] truncate max-w-[140px]">{v}</span>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-[var(--ink-2)] p-3">
      <div className="eyebrow">{label}</div>
      <div className="numeric text-[14px] text-[var(--bone)] mt-1">{value}</div>
    </div>
  );
}

// Suppress unused-import warning for ReportsPanel — still exported for TASE pages
void ReportsPanel;
