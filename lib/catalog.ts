/**
 * Unified catalog: curated entries (with Hebrew names, SEC CIKs, founded year,
 * etc.) merged with the live TASE universe from TradingView.
 *
 * Strategy: every company in our curated list keeps its rich metadata. Every
 * remaining TASE listing becomes a synthetic Company with symbol `{SYM}.TA`,
 * sector derived from TradingView, English name from TV, no Hebrew name.
 *
 * The merge runs on demand, cached for the lifetime of the worker (the loader
 * itself caches the TradingView fetch for 12h).
 */

import type { Company } from './companies';
import { COMPANIES as CURATED } from './companies';
import type { SectorKey } from './sectors';
import { getTaseUniverse, mapSector, onlyStocks, logoUrl } from './tase';

export type EnrichedCompany = Company & {
  marketCap?: number;     // ILS (from TradingView)
  logo?: string;          // logo URL
  source: 'curated' | 'dynamic';
  curated: boolean;
};

let _merged: EnrichedCompany[] | null = null;
let _bySymbol: Map<string, EnrichedCompany> | null = null;
let _mergedExpiresAt = 0;
// Re-merge no less than every 3 hours so that newly listed TASE securities
// surface in the app without restarting the worker.
const MERGE_TTL_MS = 3 * 60 * 60 * 1000;

function normaliseTicker(s: string): string {
  return s.toUpperCase().replace(/\.TA$/i, '').trim();
}

/** Curated company keys we'll match against TV (US tickers + .TA tickers). */
function curatedKeys(c: Company): string[] {
  return [normaliseTicker(c.symbol), normaliseTicker(c.symbolTA ?? '')].filter(Boolean);
}

/**
 * Build the merged catalog. Runs at most once per process; subsequent calls
 * are O(1) reads from the cached array.
 */
export async function getCatalog(): Promise<EnrichedCompany[]> {
  if (_merged && Date.now() < _mergedExpiresAt) return _merged;

  const tvRows = await getTaseUniverse().catch(() => []);
  const stocks = onlyStocks(tvRows);

  // Index TradingView entries by upper-case symbol for fast lookup.
  const byTV = new Map<string, typeof stocks[number]>();
  for (const r of stocks) byTV.set(r.symbol, r);

  // Track which TV symbols we've already absorbed into a curated entry.
  const consumedTV = new Set<string>();

  // 1) Pass through curated companies, enriched with TV market cap/logo where matched.
  const curatedEnriched: EnrichedCompany[] = CURATED.map(c => {
    const keys = curatedKeys(c);
    let match: typeof stocks[number] | undefined;
    for (const k of keys) {
      const m = byTV.get(k);
      if (m) { match = m; consumedTV.add(k); break; }
    }
    return {
      ...c,
      marketCap: match?.marketCap,
      logo: logoUrl(match?.logoId),
      source: 'curated' as const,
      curated: true,
    };
  });

  // 2) Add every TV stock not already represented in curated.
  const dynamic: EnrichedCompany[] = [];
  for (const r of stocks) {
    if (consumedTV.has(r.symbol)) continue;
    const sector: SectorKey = mapSector(r.sectorTV, r.industryTV, r.name);
    dynamic.push({
      symbol: `${r.symbol}.TA`,
      symbolTA: `${r.symbol}.TA`,
      hebrewName: r.name,           // TV ships English; we'll use it for both sides
      englishName: r.name,
      shortName: r.name.replace(/\s+(Ltd\.?|Inc\.?|Corp\.?|Group|Holdings?|Company)$/i, '').slice(0, 40),
      sector,
      tagline: r.industryTV ?? undefined,
      hq: 'Israel',
      marketCap: r.marketCap,
      logo: logoUrl(r.logoId),
      source: 'dynamic',
      curated: false,
    });
  }

  // 3) Combine — curated first (so search & default ordering surface our richest entries),
  //    then dynamic ordered by market cap descending.
  dynamic.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
  _merged = [...curatedEnriched, ...dynamic];
  _mergedExpiresAt = Date.now() + MERGE_TTL_MS;

  // Build a symbol → entry index that accepts both forms.
  _bySymbol = new Map();
  for (const c of _merged) {
    _bySymbol.set(c.symbol.toUpperCase(), c);
    if (c.symbolTA) _bySymbol.set(c.symbolTA.toUpperCase(), c);
    _bySymbol.set(normaliseTicker(c.symbol), c);
  }

  return _merged;
}

export async function findInCatalog(symbol: string): Promise<EnrichedCompany | undefined> {
  if (!_bySymbol) await getCatalog();
  if (!symbol) return undefined;
  return _bySymbol!.get(symbol.toUpperCase()) ?? _bySymbol!.get(normaliseTicker(symbol));
}

export async function searchCatalog(query: string, sector?: string): Promise<EnrichedCompany[]> {
  const all = await getCatalog();
  const q = query.trim().toLowerCase();
  const filtered = all.filter(c => {
    if (sector && sector !== 'all' && c.sector !== sector) return false;
    if (!q) return true;
    return (
      c.symbol.toLowerCase().includes(q) ||
      (c.symbolTA?.toLowerCase().includes(q) ?? false) ||
      c.englishName.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      (c.curated && c.hebrewName.includes(query.trim()))
    );
  });
  return filtered;
}

export function totalListed(catalog: EnrichedCompany[]): number {
  return catalog.length;
}
