import YahooFinance from 'yahoo-finance2';
import type { Company } from './companies';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// ── Lightweight in-memory TTL cache (per server instance). ───────────
type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.value as T;
  const value = await fn();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

// ── Types we expose to UI ──────────────────────────────────────────────
export type Officer = {
  name: string;
  title?: string;
  age?: number;
  totalPay?: number;
  yearBorn?: number;
};

export type QuarterPoint = {
  date: string;
  revenue?: number | null;
  netIncome?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  ebitda?: number | null;
};

export type BalanceSheetPoint = {
  date: string;
  totalAssets?: number | null;
  totalLiabilities?: number | null;
  totalEquity?: number | null;
  cashAndEquivalents?: number | null;
  totalDebt?: number | null;
};

export type ChartPoint = { t: number; c: number; v?: number };

export type CompanySnapshot = {
  symbol: string;
  company: Company;
  asOf: string;
  loadedMs: number;
  price?: {
    regularMarketPrice?: number | null;
    regularMarketChangePercent?: number | null;
    regularMarketChange?: number | null;
    regularMarketTime?: number | null;
    regularMarketPreviousClose?: number | null;
    regularMarketDayHigh?: number | null;
    regularMarketDayLow?: number | null;
    fiftyTwoWeekHigh?: number | null;
    fiftyTwoWeekLow?: number | null;
    currency?: string | null;
    marketCap?: number | null;
    longName?: string | null;
    shortName?: string | null;
    exchangeName?: string | null;
    quoteType?: string | null;
  };
  profile?: {
    sector?: string | null;
    industry?: string | null;
    website?: string | null;
    longBusinessSummary?: string | null;
    fullTimeEmployees?: number | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
  };
  stats?: {
    trailingPE?: number | null;
    forwardPE?: number | null;
    priceToBook?: number | null;
    enterpriseValue?: number | null;
    sharesOutstanding?: number | null;
    floatShares?: number | null;
    bookValue?: number | null;
    beta?: number | null;
    pegRatio?: number | null;
    fiftyDayAverage?: number | null;
    twoHundredDayAverage?: number | null;
    profitMargins?: number | null;
    grossMargins?: number | null;
    operatingMargins?: number | null;
    returnOnAssets?: number | null;
    returnOnEquity?: number | null;
    revenueGrowth?: number | null;
    earningsGrowth?: number | null;
    totalRevenue?: number | null;
    revenuePerShare?: number | null;
    debtToEquity?: number | null;
    totalCash?: number | null;
    totalDebt?: number | null;
    currentRatio?: number | null;
    quickRatio?: number | null;
    freeCashflow?: number | null;
    operatingCashflow?: number | null;
    dividendYield?: number | null;
    payoutRatio?: number | null;
    targetMeanPrice?: number | null;
    recommendationKey?: string | null;
  };
  officers: Officer[];
  history?: ChartPoint[];
  annual?: QuarterPoint[];
  quarterly?: QuarterPoint[];
  balanceAnnual?: BalanceSheetPoint[];
  cashAnnual?: { date: string; freeCashFlow?: number | null; operatingCashFlow?: number | null; capEx?: number | null }[];
  errors?: string[];
};

function pickNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'object' && v && 'raw' in (v as Record<string, unknown>)) {
    const r = (v as { raw?: unknown }).raw;
    return typeof r === 'number' && isFinite(r) ? r : null;
  }
  return null;
}

function dateStr(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'number') return new Date(d * 1000).toISOString().slice(0, 10);
  if (typeof d === 'string') return d.slice(0, 10);
  return '';
}

export async function getCompanySnapshot(
  symbol: string,
  company?: Company,
): Promise<CompanySnapshot | null> {
  const yahooSym = (company?.symbol ?? symbol).toUpperCase().trim();
  if (!yahooSym) return null;
  // Build a minimal Company stub for dynamic catalog entries.
  const usedCompany: Company = company ?? {
    symbol: yahooSym,
    englishName: yahooSym,
    hebrewName: yahooSym,
    shortName: yahooSym,
    sector: 'industrial',
  };
  return cached(`snap:${yahooSym}`, 5 * 60 * 1000, async () => {
    const t0 = Date.now();
    const errors: string[] = [];

    const modules = [
      'price',
      'summaryProfile',
      'assetProfile',
      'defaultKeyStatistics',
      'financialData',
      'summaryDetail',
    ] as const;

    type QS = Record<string, unknown> & {
      price?: Record<string, unknown>;
      summaryProfile?: Record<string, unknown>;
      assetProfile?: Record<string, unknown>;
      defaultKeyStatistics?: Record<string, unknown>;
      financialData?: Record<string, unknown>;
      summaryDetail?: Record<string, unknown>;
    };

    let summary: QS = {};
    try {
      summary = (await yf.quoteSummary(yahooSym, { modules: [...modules] })) as unknown as QS;
    } catch (e) {
      errors.push(`quoteSummary: ${(e as Error).message}`);
    }

    // chart data — 10 years of weekly closes (≈520 points). We compute every
    // range (1M/3M/6M/1Y/3Y/5Y/MAX) by slicing this client-side.
    let history: ChartPoint[] | undefined;
    try {
      const end = new Date();
      const start = new Date();
      start.setFullYear(end.getFullYear() - 10);
      const ch = await yf.chart(yahooSym, { period1: start, period2: end, interval: '1wk' });
      if (ch && Array.isArray(ch.quotes)) {
        history = ch.quotes
          .filter(q => q && q.close != null && q.date)
          .map(q => ({
            t: new Date(q.date!).getTime(),
            c: q.close as number,
            v: (q.volume as number) ?? undefined,
          }));
      }
    } catch (e) {
      errors.push(`chart: ${(e as Error).message}`);
    }

    // fundamentals time-series (annual & quarterly)
    let annual: QuarterPoint[] | undefined;
    let quarterly: QuarterPoint[] | undefined;
    let balanceAnnual: BalanceSheetPoint[] | undefined;
    let cashAnnual: CompanySnapshot['cashAnnual'] | undefined;
    try {
      const end = new Date();
      const start = new Date();
      start.setFullYear(end.getFullYear() - 6);
      const fields = [
        'totalRevenue',
        'netIncome',
        'grossProfit',
        'operatingIncome',
        'ebitda',
        'totalAssets',
        'totalLiabilitiesNetMinorityInterest',
        'stockholdersEquity',
        'cashAndCashEquivalents',
        'totalDebt',
        'freeCashFlow',
        'operatingCashFlow',
        'capitalExpenditure',
      ];
      const annualRows = await yf.fundamentalsTimeSeries(yahooSym, {
        period1: start,
        period2: end,
        type: 'annual',
        module: 'all',
      }).catch(e => { errors.push(`fundamentals(annual): ${(e as Error).message}`); return null; });

      const quarterRows = await yf.fundamentalsTimeSeries(yahooSym, {
        period1: start,
        period2: end,
        type: 'quarterly',
        module: 'all',
      }).catch(e => { errors.push(`fundamentals(quarterly): ${(e as Error).message}`); return null; });

      const mapRow = (row: Record<string, unknown>): QuarterPoint => ({
        date: dateStr(row.date),
        revenue: pickNum(row.totalRevenue),
        netIncome: pickNum(row.netIncome),
        grossProfit: pickNum(row.grossProfit),
        operatingIncome: pickNum(row.operatingIncome),
        ebitda: pickNum(row.ebitda),
      });
      const mapBS = (row: Record<string, unknown>): BalanceSheetPoint => ({
        date: dateStr(row.date),
        totalAssets: pickNum(row.totalAssets),
        totalLiabilities: pickNum(row.totalLiabilitiesNetMinorityInterest ?? row.totalLiab),
        totalEquity: pickNum(row.stockholdersEquity ?? row.totalStockholderEquity),
        cashAndEquivalents: pickNum(row.cashAndCashEquivalents),
        totalDebt: pickNum(row.totalDebt),
      });
      const mapCF = (row: Record<string, unknown>) => ({
        date: dateStr(row.date),
        freeCashFlow: pickNum(row.freeCashFlow),
        operatingCashFlow: pickNum(row.operatingCashFlow),
        capEx: pickNum(row.capitalExpenditure),
      });

      const arr = (x: unknown): Record<string, unknown>[] =>
        Array.isArray(x) ? (x as Record<string, unknown>[]) : [];

      if (annualRows) {
        annual = arr(annualRows).map(mapRow).filter(r => r.date);
        balanceAnnual = arr(annualRows).map(mapBS).filter(r => r.date && (r.totalAssets != null || r.totalEquity != null));
        cashAnnual = arr(annualRows).map(mapCF).filter(r => r.date && (r.freeCashFlow != null || r.operatingCashFlow != null));
      }
      if (quarterRows) {
        quarterly = arr(quarterRows).map(mapRow).filter(r => r.date);
      }
      void fields;
    } catch (e) {
      errors.push(`fundamentals: ${(e as Error).message}`);
    }

    const price = summary.price || {};
    const profile = summary.summaryProfile || summary.assetProfile || {};
    const assetProfile = summary.assetProfile || {};
    const stats = summary.defaultKeyStatistics || {};
    const fin = summary.financialData || {};
    const detail = summary.summaryDetail || {};

    const officersRaw = (assetProfile.companyOfficers ?? []) as Record<string, unknown>[];
    const officers: Officer[] = officersRaw.map(o => ({
      name: String(o.name ?? ''),
      title: typeof o.title === 'string' ? o.title : undefined,
      age: pickNum(o.age) ?? undefined,
      totalPay: pickNum(o.totalPay) ?? undefined,
      yearBorn: pickNum(o.yearBorn) ?? undefined,
    })).filter(o => o.name);

    const snap: CompanySnapshot = {
      symbol: yahooSym,
      company: usedCompany,
      asOf: new Date().toISOString(),
      loadedMs: Date.now() - t0,
      price: {
        regularMarketPrice: pickNum(price.regularMarketPrice),
        regularMarketChangePercent: pickNum(price.regularMarketChangePercent),
        regularMarketChange: pickNum(price.regularMarketChange),
        regularMarketTime: pickNum(price.regularMarketTime),
        regularMarketPreviousClose: pickNum(price.regularMarketPreviousClose),
        regularMarketDayHigh: pickNum(price.regularMarketDayHigh),
        regularMarketDayLow: pickNum(price.regularMarketDayLow),
        fiftyTwoWeekHigh: pickNum(detail.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: pickNum(detail.fiftyTwoWeekLow),
        currency: typeof price.currency === 'string' ? price.currency : null,
        marketCap: pickNum(price.marketCap),
        longName: typeof price.longName === 'string' ? price.longName : null,
        shortName: typeof price.shortName === 'string' ? price.shortName : null,
        exchangeName: typeof price.exchangeName === 'string' ? price.exchangeName : null,
        quoteType: typeof price.quoteType === 'string' ? price.quoteType : null,
      },
      profile: {
        sector: typeof assetProfile.sector === 'string' ? assetProfile.sector : null,
        industry: typeof assetProfile.industry === 'string' ? assetProfile.industry : null,
        website: typeof (profile.website ?? assetProfile.website) === 'string' ? String(profile.website ?? assetProfile.website) : null,
        longBusinessSummary:
          typeof profile.longBusinessSummary === 'string'
            ? (profile.longBusinessSummary as string)
            : (typeof assetProfile.longBusinessSummary === 'string' ? assetProfile.longBusinessSummary : null),
        fullTimeEmployees: pickNum(assetProfile.fullTimeEmployees),
        city: typeof assetProfile.city === 'string' ? assetProfile.city : null,
        country: typeof assetProfile.country === 'string' ? assetProfile.country : null,
        phone: typeof assetProfile.phone === 'string' ? assetProfile.phone : null,
      },
      stats: {
        trailingPE: pickNum(stats.trailingPE ?? detail.trailingPE),
        forwardPE: pickNum(stats.forwardPE ?? detail.forwardPE),
        priceToBook: pickNum(stats.priceToBook),
        enterpriseValue: pickNum(stats.enterpriseValue),
        sharesOutstanding: pickNum(stats.sharesOutstanding),
        floatShares: pickNum(stats.floatShares),
        bookValue: pickNum(stats.bookValue),
        beta: pickNum(stats.beta),
        pegRatio: pickNum(stats.pegRatio),
        fiftyDayAverage: pickNum(detail.fiftyDayAverage),
        twoHundredDayAverage: pickNum(detail.twoHundredDayAverage),
        profitMargins: pickNum(fin.profitMargins ?? stats.profitMargins),
        grossMargins: pickNum(fin.grossMargins),
        operatingMargins: pickNum(fin.operatingMargins),
        returnOnAssets: pickNum(fin.returnOnAssets),
        returnOnEquity: pickNum(fin.returnOnEquity),
        revenueGrowth: pickNum(fin.revenueGrowth),
        earningsGrowth: pickNum(fin.earningsGrowth),
        totalRevenue: pickNum(fin.totalRevenue),
        revenuePerShare: pickNum(fin.revenuePerShare),
        debtToEquity: pickNum(fin.debtToEquity),
        totalCash: pickNum(fin.totalCash),
        totalDebt: pickNum(fin.totalDebt),
        currentRatio: pickNum(fin.currentRatio),
        quickRatio: pickNum(fin.quickRatio),
        freeCashflow: pickNum(fin.freeCashflow),
        operatingCashflow: pickNum(fin.operatingCashflow),
        dividendYield: pickNum(detail.dividendYield ?? detail.trailingAnnualDividendYield),
        payoutRatio: pickNum(detail.payoutRatio),
        targetMeanPrice: pickNum(fin.targetMeanPrice),
        recommendationKey: typeof fin.recommendationKey === 'string' ? fin.recommendationKey : null,
      },
      officers,
      history,
      annual: annual?.sort((a, b) => a.date.localeCompare(b.date)),
      quarterly: quarterly?.sort((a, b) => a.date.localeCompare(b.date)),
      balanceAnnual: balanceAnnual?.sort((a, b) => a.date.localeCompare(b.date)),
      cashAnnual: cashAnnual?.sort((a, b) => a.date.localeCompare(b.date)),
      errors: errors.length ? errors : undefined,
    };
    return snap;
  });
}

export type QuotePreview = {
  symbol: string;
  price?: number | null;
  changePercent?: number | null;     // 1-day, as a fraction
  changePercent52w?: number | null;  // 52-week, as a fraction
  fromFiftyTwoWeekHigh?: number | null;  // negative number = % below 52w high
  fromFiftyTwoWeekLow?: number | null;
  currency?: string | null;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToBook?: number | null;
  epsTrailing?: number | null;
  avgVolume3M?: number | null;
};

/**
 * Fetch lightweight quotes for many symbols at once (used for the landing grid).
 */
export async function getQuotes(symbols: string[]): Promise<Record<string, QuotePreview>> {
  const unique = Array.from(new Set(symbols.map(s => s.toUpperCase())));
  const out: Record<string, QuotePreview> = {};
  // chunk into reasonable batches
  const chunks: string[][] = [];
  const chunkSize = 25;
  for (let i = 0; i < unique.length; i += chunkSize) chunks.push(unique.slice(i, i + chunkSize));

  for (const chunk of chunks) {
    const key = `quotes:${chunk.join(',')}`;
    try {
      const data = await cached(key, 2 * 60 * 1000, async () => {
        const res = await yf.quote(chunk);
        return Array.isArray(res) ? res : [res];
      });
      for (const q of data as Record<string, unknown>[]) {
        const sym = String(q.symbol || '').toUpperCase();
        if (!sym) continue;
        // quote() returns changePercent as a percentage (e.g. -1.23), not a fraction.
        // We normalise everywhere to fraction (e.g. -0.0123) for consistent formatting.
        // Yahoo's "...ChangePercent" fields come back as percentages already
        // (e.g. 19.78 means +19.78%), NOT fractions. We normalise EVERYTHING in
        // this module to fractions (0.1978) so the display layer can multiply
        // by 100 uniformly. The `fiftyTwoWeekChange` raw field is an absolute
        // price-delta — not a percentage — so it must never be used as a fallback.
        const pct    = pickNum(q.regularMarketChangePercent);
        const pct52  = pickNum(q.fiftyTwoWeekChangePercent);
        const fromHi = pickNum(q.fiftyTwoWeekHighChangePercent);
        const fromLo = pickNum(q.fiftyTwoWeekLowChangePercent);
        out[sym] = {
          symbol: sym,
          price: pickNum(q.regularMarketPrice),
          changePercent:    pct   == null ? null : pct   / 100,
          changePercent52w: pct52 == null ? null : pct52 / 100,
          fromFiftyTwoWeekHigh: fromHi == null ? null : fromHi / 100,
          fromFiftyTwoWeekLow:  fromLo == null ? null : fromLo / 100,
          currency: typeof q.currency === 'string' ? q.currency : null,
          marketCap:   pickNum(q.marketCap),
          trailingPE:  pickNum(q.trailingPE),
          forwardPE:   pickNum(q.forwardPE),
          priceToBook: pickNum(q.priceToBook),
          epsTrailing: pickNum(q.epsTrailingTwelveMonths),
          avgVolume3M: pickNum(q.averageDailyVolume3Month),
        };
      }
    } catch {
      // tolerate batch failures
    }
  }
  return out;
}
