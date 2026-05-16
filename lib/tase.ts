/**
 * Dynamic TASE company universe.
 *
 *   The Tel Aviv Stock Exchange has ~1,000 listed securities. Rather than
 *   maintain that list by hand we fetch it live from **TradingView's public
 *   scanner** — a free, no-auth JSON endpoint that returns every TASE
 *   symbol with sector / industry / market-cap metadata. We filter for
 *   ordinary equities, normalise the symbols, and merge with our
 *   hand-curated catalog (which carries Hebrew names + SEC CIK mappings
 *   for the ones we have).
 *
 *   Refresh cadence is 12 hours (the list itself barely changes day-to-day).
 */

import https from 'node:https';
import type { SectorKey } from './sectors';

const SCANNER_URL = 'https://scanner.tradingview.com/israel/scan';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 BORSA-Research/1.0';

export type TVRow = {
  symbol: string;          // e.g. "TEVA"  (TASE-side ticker, no exchange prefix)
  name: string;            // company description
  logoId?: string;         // TradingView logo slug (https://s3-symbol-logo.tradingview.com/{slug}.svg)
  type: string;            // "stock", "fund", "bond", "right", "structured" ...
  sectorTV?: string;       // TradingView sector
  industryTV?: string;     // TradingView industry
  marketCap?: number;      // in ILS for TASE listings
};

type ScannerResponse = {
  totalCount: number;
  data: { s: string; d: (string | number | null)[] }[];
};

// ── HTTP / cache ─────────────────────────────────────────────────

function postJson<T>(url: string, body: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': UA,
          Accept: 'application/json',
        },
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
          } catch (e) {
            reject(e);
          }
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('TradingView request timed out')));
    req.write(data);
    req.end();
  });
}

let _cache: { value: TVRow[]; expiresAt: number } | null = null;
// 3-hour TTL — TASE listings change rarely, but new IPOs, de-listings and
// re-classifications should propagate the same trading day.
const TTL_MS = 3 * 60 * 60 * 1000;

export async function getTaseUniverse(): Promise<TVRow[]> {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) return _cache.value;

  const body = {
    columns: ['name', 'description', 'logoid', 'type', 'sector', 'industry', 'market_cap_basic'],
    filter: [{ left: 'exchange', operation: 'equal', right: 'TASE' }],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, 5000],   // headroom for the full TASE universe + future growth
  };

  let raw: ScannerResponse;
  try {
    raw = await postJson<ScannerResponse>(SCANNER_URL, body);
  } catch {
    return _cache?.value ?? [];
  }

  const rows: TVRow[] = (raw.data || []).map(r => {
    const d = r.d ?? [];
    return {
      symbol: String(d[0] ?? r.s.replace(/^TASE:/, '')).trim().toUpperCase(),
      name: String(d[1] ?? '').trim(),
      logoId: typeof d[2] === 'string' ? d[2] : undefined,
      type: String(d[3] ?? '').toLowerCase(),
      sectorTV: typeof d[4] === 'string' ? d[4] : undefined,
      industryTV: typeof d[5] === 'string' ? d[5] : undefined,
      marketCap: typeof d[6] === 'number' ? d[6] : undefined,
    };
  });

  _cache = { value: rows, expiresAt: now + TTL_MS };
  return rows;
}

/** Filter to actual companies (excludes bonds / rights / structured products).
 *  Includes: ordinary stocks, depository receipts, dual-listed equities. */
export function onlyStocks(rows: TVRow[]): TVRow[] {
  return rows.filter(r =>
    r.type === 'stock' ||
    r.type === 'dr' ||
    r.type === 'preferred' ||
    r.type === 'equity'
  );
}

// ── TradingView sector → our 14-sector taxonomy ──────────────────
//
//   TradingView labels most Israeli software companies as the generic
//   "Packaged Software" / "Information Technology Services" / "Technology
//   Services". That hides genuine cyber, semis, biotech sub-categories.
//   We layer two passes:
//     1) NAME-pattern overrides (cyber/security/defense/biotech keywords)
//     2) sector/industry pattern match (the fallback)
//   Name detection is what actually surfaces companies like Cellebrite,
//   Hub Cyber Security, Allot, Cognyte that TradingView lumps under "tech".

// Tight, multi-word name patterns. Avoiding short single words like "discount"
// or "investment" that match unrelated holding-company names.
const NAME_OVERRIDES: Array<[RegExp, SectorKey]> = [
  [/\bcyber|hub.cyber|hub.security|cybersec|cyber-?security|threat intel|forensic|endpoint security|firewall|encrypt|antivirus/i, 'security'],
  [/\bsemiconductor|wafer fab|silicon fab|epitaxial|lithograph|photonic chip/i, 'semis'],
  [/\bpharmaceutical|biotech|biopharma|therapeutic|oncolog|biomedical|drug development|cell ?therap|biologics/i, 'pharma'],
  [/\baerospace|defense|defen[cs]e|missile|radar|\belbit\b|aeronautic|unmanned (aer|sys|veh)|\buav\b|electro.optic/i, 'defense'],
  [/\b(bank hapoalim|bank leumi|israel discount bank|discount bank of|mizrahi[\- ]tefahot|first international bank|bank of jerusalem|bank yahav|mercantile bank|union bank|igud bank|otsar ha)/i, 'banking'],
  [/\b(harel insurance|migdal insurance|menora mivtachim|phoenix (holdings|financial|insurance)|clal insurance|ayalon insurance|hachshara|shomera|isracard)/i, 'insurance'],
  [/\b(real ?estate|\breit\b|properties\b|residences\b|residential development|land development)/i, 'realestate'],
  [/\b(telecom\b|cellular|cellcom|bezeq|partner communications|hot.?mobile)/i, 'telecom'],
  [/\b(maritime|tanker|container shipping|seaport|cargo airline|shipping (services|company))/i, 'shipping'],
  [/\b(oil refining|delek group|paz oil|bazan|new ?med energy|tamar petroleum|leviathan|solar energy|geothermal|natural gas|oil & gas)/i, 'energy'],
];

// Sector/industry fallback — TradingView's specific industry codes.
// The most-specific patterns come first; broader ones at the bottom catch
// what the targeted patterns miss.
const SECTOR_MAP: Array<[RegExp, SectorKey]> = [
  [/cybersec|computer communications/i, 'security'],
  [/technology services|packaged software|internet|software/i, 'tech'],
  [/electronic\s+(equipment|technology|production|component)|semiconductor/i, 'semis'],
  [/health\s+technology|pharmaceutical|biotechnolog|medical specialties|hospital/i, 'pharma'],
  [/aerospace|defense/i,         'defense'],
  [/energy minerals|integrated oil|oil & gas|oil refining|petroleum|natural gas|electric utilities|gas utilities/i, 'energy'],
  [/major banks|regional banks|commercial banks|savings institutions/i, 'banking'],
  [/life\/health insurance|property\/casualty insurance|insurance brokers|multi.line insurance|insurance/i, 'insurance'],
  [/real estate|\breit\b/i,      'realestate'],
  [/wireless telecommunications|major telecommunications|specialty telecommunications|telecommunications/i, 'telecom'],
  [/marine transportation|airlines|other transportation|trucking|air freight|water transportation|railroads/i, 'shipping'],
  [/retail trade|food retail|consumer non.durables|consumer services|hotels\/resorts|restaurants|apparel|specialty stores|distribution services|wholesale distrib/i, 'retail'],
  [/investment manager|investment bank|investment trust|capital markets|asset management|other finance|brokers|finance\/rental/i, 'fintech'],
  [/producer manufacturing|industrial machinery|building products|engineering & construction|industrial conglomerate|industrial services|commercial services|miscellaneous manufacturing/i, 'industrial'],
  [/chemicals|non.energy minerals|metals|specialty chemicals|utilities|process industries|forestry|agriculture/i, 'industrial'],
];

// When neither name nor industry patterns match, infer from the company name —
// many small TASE listings are holdings / investment vehicles that belong in
// fintech, not the catch-all industrial bucket.
function inferFromGenericName(name?: string): SectorKey | null {
  if (!name) return null;
  if (/\b(holding|investment|capital|ventures?|fund\b|asset|partners|equity)\b/i.test(name)) return 'fintech';
  if (/\b(real ?estate|properties|residences)\b/i.test(name)) return 'realestate';
  return null;
}

export function mapSector(tvSector?: string, tvIndustry?: string, name?: string): SectorKey {
  // 1) Tight name-pattern overrides — strongest signal (real cyber, banks, …)
  if (name) {
    for (const [re, key] of NAME_OVERRIDES) if (re.test(name)) return key;
  }
  // 2) TradingView sector/industry fallback
  const text = `${tvSector ?? ''} ${tvIndustry ?? ''}`;
  for (const [re, key] of SECTOR_MAP) if (re.test(text)) return key;
  // 3) Generic name fallback — captures holdings / investment vehicles
  return inferFromGenericName(name) ?? 'industrial';
}

export function logoUrl(logoId?: string, size: 'sm' | 'md' = 'md'): string | undefined {
  if (!logoId) return undefined;
  const sz = size === 'sm' ? '64' : '128';
  return `https://s3-symbol-logo.tradingview.com/${encodeURIComponent(logoId)}--${sz}.svg`;
}
