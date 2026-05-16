/**
 * Macro dashboard data — sovereign bond yields, currencies, commodities,
 * global indices, crypto, and an approximate asset-class allocation picture.
 *
 *   Why this matters when looking at any individual stock:
 *     • Real-estate names trade on the rate trajectory.
 *     • Energy & shipping names trade on the commodity cycle.
 *     • Israeli tech earnings convert at the shekel rate.
 *     • Stocks vs. bonds vs. gold rotation tells you the regime.
 *
 *   All numbers come from Yahoo Finance via the same getQuotes() loader
 *   we already use elsewhere. Refresh: 5 minutes.
 */

import { getQuotes, type QuotePreview } from './yahoo';

export type MacroQuote = {
  symbol: string;
  label: string;
  /** Optional sub-label or unit shown beneath the value. */
  detail?: string;
  /** For yields, the price IS the yield (in %). For currencies it's the FX rate, etc. */
  value?: number | null;
  /** Percent change today, expressed as a fraction (–0.012 = –1.2%). */
  changePct?: number | null;
  /** How to render the value. */
  format: 'percent' | 'price' | 'fx' | 'index';
};

export type MacroGroup = {
  key: string;
  title: string;
  subtitle: string;
  quotes: MacroQuote[];
};

// ── The universe we fetch ────────────────────────────────────────

const SOVEREIGN_YIELDS: MacroQuote[] = [
  { symbol: '^IRX', label: 'US 13-week bill',  detail: 'short-rate',        format: 'percent' },
  { symbol: '^FVX', label: 'US 5-year note',    detail: 'mid-curve',         format: 'percent' },
  { symbol: '^TNX', label: 'US 10-year note',   detail: 'global benchmark',  format: 'percent' },
  { symbol: '^TYX', label: 'US 30-year bond',   detail: 'long end',          format: 'percent' },
];

const BOND_ETFS: MacroQuote[] = [
  { symbol: 'IEF',  label: '7-10y treasury ETF', detail: 'iShares IEF',     format: 'price' },
  { symbol: 'TLT',  label: '20+y treasury ETF',  detail: 'iShares TLT',     format: 'price' },
  { symbol: 'TIP',  label: 'TIPS ETF',            detail: 'inflation-linked', format: 'price' },
  { symbol: 'HYG',  label: 'High-yield ETF',      detail: 'iBoxx HY',         format: 'price' },
  { symbol: 'LQD',  label: 'Investment-grade',    detail: 'iBoxx IG',         format: 'price' },
];

const FX: MacroQuote[] = [
  { symbol: 'USDILS=X', label: 'USD / ILS',  detail: 'shekel strength',   format: 'fx' },
  { symbol: 'EURILS=X', label: 'EUR / ILS',  detail: 'euro vs shekel',    format: 'fx' },
  { symbol: 'DX-Y.NYB', label: 'Dollar index (DXY)', detail: 'USD basket', format: 'fx' },
  { symbol: 'EURUSD=X', label: 'EUR / USD',  detail: 'euro vs dollar',    format: 'fx' },
  { symbol: 'GBPUSD=X', label: 'GBP / USD',  detail: 'sterling',          format: 'fx' },
  { symbol: 'USDJPY=X', label: 'USD / JPY',  detail: 'yen',               format: 'fx' },
];

const COMMODITIES: MacroQuote[] = [
  { symbol: 'GC=F', label: 'Gold',         detail: '$/oz',    format: 'price' },
  { symbol: 'SI=F', label: 'Silver',       detail: '$/oz',    format: 'price' },
  { symbol: 'CL=F', label: 'Crude (WTI)',  detail: '$/bbl',   format: 'price' },
  { symbol: 'BZ=F', label: 'Crude (Brent)',detail: '$/bbl',   format: 'price' },
  { symbol: 'NG=F', label: 'Natural gas',  detail: '$/MMBtu', format: 'price' },
  { symbol: 'HG=F', label: 'Copper',       detail: '$/lb',    format: 'price' },
];

const INDICES: MacroQuote[] = [
  { symbol: 'TA35.TA',  label: 'TA-35',     detail: 'Israel large-cap',  format: 'index' },
  { symbol: 'TA125.TA', label: 'TA-125',    detail: 'Israel broad',      format: 'index' },
  { symbol: '^GSPC',    label: 'S&P 500',   detail: 'US large-cap',      format: 'index' },
  { symbol: '^IXIC',    label: 'NASDAQ',    detail: 'US tech',           format: 'index' },
  { symbol: '^DJI',     label: 'Dow Jones', detail: 'US blue-chip',      format: 'index' },
  { symbol: '^GDAXI',   label: 'DAX',       detail: 'Germany 40',        format: 'index' },
  { symbol: '^FTSE',    label: 'FTSE 100',  detail: 'UK',                format: 'index' },
  { symbol: '^N225',    label: 'Nikkei 225',detail: 'Japan',             format: 'index' },
];

const CRYPTO: MacroQuote[] = [
  { symbol: 'BTC-USD', label: 'Bitcoin',  detail: 'USD',  format: 'price' },
  { symbol: 'ETH-USD', label: 'Ethereum', detail: 'USD',  format: 'price' },
];

// ── Asset class allocation (approximate world-of-money picture) ──
//
//   These are slow-moving aggregates. Refreshed once a year or so from
//   public sources (SIFMA bond-market size, World Federation of Exchanges
//   equity market cap, World Gold Council, CoinMarketCap, etc.). The
//   point isn't real-time precision — it's the relative scale.

export type AssetClass = {
  key: string;
  label: string;
  detail: string;
  trillionsUSD: number;
  hue: string;
};

export const ASSET_CLASS_ALLOCATION: AssetClass[] = [
  { key: 'bonds-global',  label: 'Global bonds',          detail: 'Govt + corporate, BIS estimate',                trillionsUSD: 140, hue: 'var(--signal)' },
  { key: 'equities',      label: 'Global equities',       detail: 'WFE listed-company market cap',                trillionsUSD: 115, hue: 'var(--amber)' },
  { key: 'real-estate',   label: 'Institutional real estate', detail: 'Private + public REITs',                   trillionsUSD: 30,  hue: 'var(--gain)' },
  { key: 'gold',          label: 'Gold',                  detail: 'Above-ground stock, WGC',                       trillionsUSD: 22,  hue: 'var(--highlight)' },
  { key: 'commodities',   label: 'Other commodities',     detail: 'Oil reserves + industrial metals, est.',       trillionsUSD: 9,   hue: 'var(--bone-dim)' },
  { key: 'crypto',        label: 'Crypto',                detail: 'Total market cap',                              trillionsUSD: 3.5, hue: 'var(--loss)' },
];

// ── Fetcher ──────────────────────────────────────────────────────

const ALL = [
  ...SOVEREIGN_YIELDS,
  ...BOND_ETFS,
  ...FX,
  ...COMMODITIES,
  ...INDICES,
  ...CRYPTO,
];

function hydrate(quotes: Record<string, QuotePreview>, list: MacroQuote[]): MacroQuote[] {
  return list.map(q => {
    const live = quotes[q.symbol.toUpperCase()];
    return {
      ...q,
      value: live?.price ?? null,
      changePct: live?.changePercent ?? null,
    };
  });
}

export async function getMacro(): Promise<{
  yields: MacroQuote[];
  bondEtfs: MacroQuote[];
  fx: MacroQuote[];
  commodities: MacroQuote[];
  indices: MacroQuote[];
  crypto: MacroQuote[];
  groups: MacroGroup[];
  asOf: string;
}> {
  const symbols = ALL.map(q => q.symbol);
  const quotes = await getQuotes(symbols).catch((): Record<string, QuotePreview> => ({}));

  const yields     = hydrate(quotes, SOVEREIGN_YIELDS);
  const bondEtfs   = hydrate(quotes, BOND_ETFS);
  const fx         = hydrate(quotes, FX);
  const commodities = hydrate(quotes, COMMODITIES);
  const indices    = hydrate(quotes, INDICES);
  const crypto     = hydrate(quotes, CRYPTO);

  const groups: MacroGroup[] = [
    { key: 'yields',    title: 'Sovereign bond yields',     subtitle: 'The cost of money — drives every rate-sensitive asset',  quotes: yields },
    { key: 'bonds',     title: 'Bond ETFs',                  subtitle: 'Tradeable proxies for duration & credit',                quotes: bondEtfs },
    { key: 'fx',        title: 'Currencies',                 subtitle: 'Shekel-strength matters for Israeli exporters & importers', quotes: fx },
    { key: 'commodities', title: 'Commodities',              subtitle: 'Oil for energy / shipping / inflation; gold for risk-off; copper for global growth', quotes: commodities },
    { key: 'indices',   title: 'Stock indices',              subtitle: 'TA-35 / TA-125 against the world',                       quotes: indices },
    { key: 'crypto',    title: 'Crypto',                     subtitle: 'Speculative-risk barometer',                              quotes: crypto },
  ];

  return { yields, bondEtfs, fx, commodities, indices, crypto, groups, asOf: new Date().toISOString() };
}

// ── Yield-curve helper for the chart ─────────────────────────────

export function buildYieldCurve(yields: MacroQuote[]) {
  // Order: 3M, 5Y, 10Y, 30Y
  const order = [
    { symbol: '^IRX', label: '3M',  tenor: 0.25 },
    { symbol: '^FVX', label: '5Y',  tenor: 5 },
    { symbol: '^TNX', label: '10Y', tenor: 10 },
    { symbol: '^TYX', label: '30Y', tenor: 30 },
  ];
  const bySymbol = new Map(yields.map(q => [q.symbol, q]));
  return order
    .map(o => {
      const q = bySymbol.get(o.symbol);
      return q?.value != null ? { label: o.label, tenor: o.tenor, yield: q.value } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

export function spreadBetween(yields: MacroQuote[], shortSym: string, longSym: string): number | null {
  const m = new Map(yields.map(q => [q.symbol, q.value ?? null]));
  const a = m.get(shortSym);
  const b = m.get(longSym);
  if (a == null || b == null) return null;
  return b - a;
}
