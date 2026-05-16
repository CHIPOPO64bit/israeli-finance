/**
 * SEC EDGAR integration — the ground-truth source for U.S.-listed Israeli
 * companies. Everything here comes directly from the SEC's public REST APIs
 * (no auth, no key, no aggregator in the middle). XBRL facts are extracted by
 * the SEC from the filings themselves — they are the numbers the company
 * actually filed.
 *
 *   • Filings index:    GET https://data.sec.gov/submissions/CIK{10-digit-cik}.json
 *   • Company facts:    GET https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 *   • Filing archive:   https://www.sec.gov/Archives/edgar/data/{cikInt}/{accessionNoDashes}/{primaryDocument}
 *
 * The SEC requires a descriptive User-Agent.
 */

const UA = 'BORSA Research (david1711ks@gmail.com)';

// ── HTTP — bypass Next.js fetch cache (some SEC payloads exceed 2 MB). ──
//    The built-in fetch in Next 16 still attempts to cache cacheable
//    GET responses even with `cache: 'no-store'`, producing noisy warnings.
//    We use the Node https module directly and manage TTL ourselves.
import https from 'node:https';

function httpsGetJson<T = unknown>(url: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': UA, Accept: 'application/json' } },
      res => {
        if (!res.statusCode || res.statusCode >= 400) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(e);
          }
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('SEC request timed out')));
  });
}

// ── Cache ─────────────────────────────────────────────────────────
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

// ── Ticker → CIK mapping (hand-verified against SEC company_tickers.json) ──
//    For dual-listed Israeli companies. Keys are the Yahoo Finance ticker we
//    use elsewhere in the app.
export const SEC_CIK: Record<string, string> = {
  TEVA: '0000818686',
  CHKP: '0001015922',
  NICE: '0001003935',
  WIX:  '0001576789',
  MNDY: '0001845338',
  FROG: '0001800667',
  VRNS: '0001361113',
  FVRR: '0001762301',
  GLBE: '0001835963',
  SMWB: '0001842731',
  INMD: '0001742692',
  ICL:  '0000941221',
  ESLT: '0001027664',
  TSEM: '0000928876',
  KRNT: '0001625791',
  AUDC: '0001086434',
  TBLA: '0001840502',
  PERI: '0001338940',
  PLTK: '0001828016',
  LMND: '0001691421',
  SEDG: '0001419612',
  ORA:  '0001296445',
  ZIM:  '0001654126',
  CAMT: '0001109138',
  NVMI: '0001109345',
  CEVA: '0001173489',
  CRNT: '0001119769',
  CGNT: '0001824814',
  ALLT: '0001365767',
  KMDA: '0001567529',
  BLRX: '0001498403',
  CGEN: '0001119774',
  ENLV: '0001596812',
  PGY:  '0001883085',
  NRSN: '0001875091',
  RSKD: '0001851112',
  CLBT: '0001854587',   // Cellebrite DI Ltd.
  HUBC: '0001905660',   // Hub Cyber Security Ltd.
  ALAR: '0001725332',   // Alarum Technologies Ltd.
  MBLY: '0001910139',   // Mobileye Global Inc.
  MGIC: '0000876779',   // Magic Software Enterprises Ltd.
};

export function cikFor(symbol: string): string | undefined {
  return SEC_CIK[symbol.toUpperCase()];
}

// ── Filings ───────────────────────────────────────────────────────

export type Filing = {
  accession: string;                  // 0001193125-26-034532
  accessionNoDashes: string;          // 000119312526034532
  form: string;                       // "10-K", "20-F", "6-K", ...
  filingDate: string;                 // YYYY-MM-DD
  reportDate?: string;                // period the report covers
  primaryDocument: string;            // e.g. d123456d10k.htm
  primaryDocDescription?: string;
  size?: number;
  isXBRL?: boolean;
  isInlineXBRL?: boolean;
  indexUrl: string;                   // human-readable filing index
  primaryUrl: string;                 // direct link to primary doc
  pdfHintUrl?: string;                // some filings ship a paper PDF
};

const IMPORTANT_FORMS = new Set([
  '10-K', '10-K/A',
  '10-Q', '10-Q/A',
  '20-F', '20-F/A',
  '6-K',  '6-K/A',
  '8-K',  '8-K/A',
  'F-1', 'F-1/A', 'F-3', 'F-3/A',
  'S-1', 'S-1/A',
  'DEF 14A', 'DEFA14A',
  '40-F', '40-F/A',
  'SC 13G', 'SC 13D',
]);

const FORM_PRIORITY: Record<string, number> = {
  '20-F': 100, '10-K': 95,
  '10-Q': 80,
  '6-K': 60, '8-K': 55,
  'F-1': 50, 'S-1': 50,
  'DEF 14A': 40,
};

function buildIndexUrl(cik: string, accessionNoDashes: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik.replace(/^0+/, '')}&type=&dateb=&owner=include&count=40&action=getcompany`;
}

function buildPrimaryUrl(cik: string, accession: string, accessionNoDashes: string, primaryDoc: string): { primary: string; index: string } {
  const cikInt = cik.replace(/^0+/, '');
  return {
    primary: `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accessionNoDashes}/${primaryDoc}`,
    index: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=&dateb=&owner=include&count=40#${accession}`,
  };
}

type SubmissionsRecent = {
  accessionNumber: string[];
  filingDate: string[];
  reportDate?: string[];
  form: string[];
  primaryDocument: string[];
  primaryDocDescription?: string[];
  size: number[];
  isXBRL: number[];
  isInlineXBRL: number[];
};

export async function getFilings(cik: string, opts: { limit?: number; important?: boolean } = {}): Promise<Filing[]> {
  const padded = cik.padStart(10, '0');
  const key = `sec:filings:${padded}:${opts.important ? 'imp' : 'all'}:${opts.limit ?? 24}`;
  return cached(key, 30 * 60 * 1000, async () => {
    const json = await httpsGetJson<{ filings?: { recent?: SubmissionsRecent; files?: { name: string }[] } }>(
      `https://data.sec.gov/submissions/CIK${padded}.json`,
    );
    const recent = json.filings?.recent;
    if (!recent) return [];
    const out: Filing[] = [];
    for (let i = 0; i < recent.accessionNumber.length; i++) {
      const form = recent.form[i];
      if (opts.important && !IMPORTANT_FORMS.has(form)) continue;
      const accession = recent.accessionNumber[i];
      const accessionNoDashes = accession.replace(/-/g, '');
      const primaryDoc = recent.primaryDocument[i];
      const urls = buildPrimaryUrl(padded, accession, accessionNoDashes, primaryDoc);
      out.push({
        accession,
        accessionNoDashes,
        form,
        filingDate: recent.filingDate[i],
        reportDate: recent.reportDate?.[i],
        primaryDocument: primaryDoc,
        primaryDocDescription: recent.primaryDocDescription?.[i],
        size: recent.size[i],
        isXBRL: !!recent.isXBRL[i],
        isInlineXBRL: !!recent.isInlineXBRL[i],
        indexUrl: urls.index,
        primaryUrl: urls.primary,
      });
      if (out.length >= (opts.limit ?? 24)) break;
    }
    // Stable priority ordering: most-important forms first, then by date.
    out.sort((a, b) => {
      const pa = FORM_PRIORITY[a.form] ?? 10;
      const pb = FORM_PRIORITY[b.form] ?? 10;
      if (pa !== pb) return pb - pa;
      return a.filingDate < b.filingDate ? 1 : -1;
    });
    return out;
  });
}

// ── XBRL company facts ───────────────────────────────────────────

export type XBRLObservation = {
  fy: number;
  fp: 'Q1' | 'Q2' | 'Q3' | 'FY' | string;
  end: string;
  start?: string;
  val: number;
  filed: string;
  accn: string;
  form: string;
  frame?: string;
};

export type XBRLConcept = {
  tag: string;
  label: string;
  description?: string;
  unit: string;
  observations: XBRLObservation[];
};

type CompanyFactsResponse = {
  cik: number;
  entityName: string;
  facts: {
    [taxonomy: string]: {
      [tag: string]: {
        label?: string;
        description?: string;
        units: Record<string, XBRLObservation[]>;
      };
    };
  };
};

export async function getCompanyFacts(cik: string): Promise<CompanyFactsResponse | null> {
  const padded = cik.padStart(10, '0');
  return cached(`sec:facts:${padded}`, 60 * 60 * 1000, async () => {
    try {
      return await httpsGetJson<CompanyFactsResponse>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`);
    } catch {
      return null;
    }
  });
}

/**
 * Fetch a concept from XBRL facts, trying multiple tags.
 *
 *   strategy: 'first'   — return the first tag that exists. Best when the
 *                         candidates are non-overlapping (assets, NI, etc.).
 *   strategy: 'largest' — collect every candidate that exists and return
 *                         the one with the *largest median annual value*.
 *                         Required for revenue: many issuers file BOTH a
 *                         narrow legacy `Revenues` tag AND the modern
 *                         `RevenueFromContractWithCustomer...` tag — the
 *                         legacy one can be a small sub-line while the
 *                         modern one is the actual top line.
 */
function loadConcept(facts: CompanyFactsResponse, taxonomy: string, tag: string): XBRLConcept | null {
  const node = facts.facts?.[taxonomy]?.[tag];
  if (!node) return null;
  const units = node.units || {};
  // Prefer USD when present, else ILS, else first.
  const unitKey = units.USD ? 'USD' : units.ILS ? 'ILS' : Object.keys(units)[0];
  if (!unitKey) return null;
  return {
    tag: `${taxonomy}:${tag}`,
    label: node.label || tag,
    description: node.description,
    unit: unitKey,
    observations: (units[unitKey] || []).filter(o => o && o.end && typeof o.val === 'number'),
  };
}

function medianAnnualValue(c: XBRLConcept): number {
  const fy = c.observations.filter(isAnnualPeriod);
  if (!fy.length) return 0;
  const sorted = fy.map(o => o.val).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function pickConcept(
  facts: CompanyFactsResponse | null,
  candidates: { taxonomy?: string; tag: string }[],
  strategy: 'first' | 'largest' = 'first',
): XBRLConcept | null {
  if (!facts) return null;
  if (strategy === 'first') {
    for (const { taxonomy = 'us-gaap', tag } of candidates) {
      const c = loadConcept(facts, taxonomy, tag);
      if (c) return c;
    }
    return null;
  }
  // largest
  let best: XBRLConcept | null = null;
  let bestScore = -Infinity;
  for (const { taxonomy = 'us-gaap', tag } of candidates) {
    const c = loadConcept(facts, taxonomy, tag);
    if (!c) continue;
    const m = Math.abs(medianAnnualValue(c));
    if (m > bestScore) { bestScore = m; best = c; }
  }
  return best;
}

export type Headline = {
  label: string;
  value: number;
  date: string;
  form: string;
  accession: string;
  filed: string;
  unit: string;
};

// Note: many issuers file MULTIPLE revenue tags (e.g. Teva reports both a
// narrow `Revenues` line and a comprehensive `RevenueFromContractWithCustomer…`
// line). We use the 'largest' strategy to pick whichever has the biggest
// median annual value, which is by economics the top-line revenue.
const REVENUE_TAGS = [
  { tag: 'RevenueFromContractWithCustomerExcludingAssessedTax' },
  { tag: 'RevenueFromContractWithCustomerIncludingAssessedTax' },
  { tag: 'Revenues' },
  { tag: 'SalesRevenueNet' },
  { tag: 'SalesRevenueGoodsNet' },
  { taxonomy: 'ifrs-full', tag: 'Revenue' },
];
const NET_INCOME_TAGS = [
  { tag: 'NetIncomeLoss' },
  { tag: 'ProfitLoss' },
  { taxonomy: 'ifrs-full', tag: 'ProfitLoss' },
];
const GROSS_PROFIT_TAGS = [
  { tag: 'GrossProfit' },
  { taxonomy: 'ifrs-full', tag: 'GrossProfit' },
];
const OPERATING_INCOME_TAGS = [
  { tag: 'OperatingIncomeLoss' },
  { taxonomy: 'ifrs-full', tag: 'ProfitLossFromOperatingActivities' },
];
const ASSETS_TAGS = [
  { tag: 'Assets' },
  { taxonomy: 'ifrs-full', tag: 'Assets' },
];
const LIABILITIES_TAGS = [
  { tag: 'Liabilities' },
  { taxonomy: 'ifrs-full', tag: 'Liabilities' },
];
const EQUITY_TAGS = [
  { tag: 'StockholdersEquity' },
  { tag: 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest' },
  { taxonomy: 'ifrs-full', tag: 'Equity' },
];
const CASH_TAGS = [
  { tag: 'CashAndCashEquivalentsAtCarryingValue' },
  { tag: 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents' },
  { taxonomy: 'ifrs-full', tag: 'CashAndCashEquivalents' },
];
const OPERATING_CF_TAGS = [
  { tag: 'NetCashProvidedByUsedInOperatingActivities' },
  { taxonomy: 'ifrs-full', tag: 'CashFlowsFromUsedInOperatingActivities' },
];

export type AnnualRow = {
  fy: number;
  end: string;
  form: string;
  accession: string;
  accessionNoDashes: string;
  primaryDocUrl: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  assets?: number;
  liabilities?: number;
  equity?: number;
  cash?: number;
  operatingCashFlow?: number;
};

/** True iff this observation represents a full-year period (≈12 months).
 *  SEC's 10-K filings include quarterly TTM snapshots under fp='FY' so we
 *  must filter by period duration, not just the `fp` flag.
 *  Annual frames look like "CY2024"; quarterly snapshots look like "CY2024Q3". */
function isAnnualPeriod(o: XBRLObservation): boolean {
  if (o.fp !== 'FY') return false;
  if (o.frame && /Q[1-4]$/.test(o.frame)) return false;
  if (o.start && /^\d{4}-\d{2}-\d{2}$/.test(o.start)) {
    const s = Date.parse(o.start);
    const e = Date.parse(o.end);
    if (!isFinite(s) || !isFinite(e)) return false;
    const days = (e - s) / 86_400_000;
    return days > 330 && days < 400;
  }
  // No start (balance-sheet item): treat as fiscal-year-end if frame is annual
  // or, lacking metadata, accept dates ending Dec 31 (most Israeli filers).
  if (o.frame && /^CY\d{4}$/.test(o.frame)) return true;
  return o.end.endsWith('-12-31');
}

function annualObservations(c: XBRLConcept | null): Map<string, XBRLObservation> {
  const m = new Map<string, XBRLObservation>();
  if (!c) return m;
  const fyOnly = c.observations.filter(isAnnualPeriod);
  for (const o of fyOnly) {
    const key = o.end;
    const prev = m.get(key);
    // Keep the most recently filed value (re-statements supersede originals).
    if (!prev || prev.filed < o.filed) m.set(key, o);
  }
  return m;
}

/**
 * Build a unified annual-report grid pulling every value from XBRL filings,
 * with the source 10-K/20-F filing URL preserved per row.
 */
export async function getAnnualFromFilings(cik: string, opts: { years?: number } = {}): Promise<{
  rows: AnnualRow[];
  unit: string | null;
  entityName: string | null;
}> {
  const facts = await getCompanyFacts(cik).catch(() => null);
  if (!facts) return { rows: [], unit: null, entityName: null };

  const revenue       = pickConcept(facts, REVENUE_TAGS, 'largest');
  const grossProfit   = pickConcept(facts, GROSS_PROFIT_TAGS);
  const operatingInc  = pickConcept(facts, OPERATING_INCOME_TAGS);
  const netIncome     = pickConcept(facts, NET_INCOME_TAGS);
  const assets        = pickConcept(facts, ASSETS_TAGS, 'largest');
  const liabilities   = pickConcept(facts, LIABILITIES_TAGS, 'largest');
  const equity        = pickConcept(facts, EQUITY_TAGS, 'largest');
  const cash          = pickConcept(facts, CASH_TAGS);
  const operatingCF   = pickConcept(facts, OPERATING_CF_TAGS);

  const unit = revenue?.unit || netIncome?.unit || 'USD';
  const padded = cik.padStart(10, '0');

  const buckets = new Map<string, AnnualRow>();

  function intoRow(o: XBRLObservation, field: keyof AnnualRow) {
    const key = o.end;
    let row = buckets.get(key);
    if (!row) {
      const accessionNoDashes = (o.accn ?? '').replace(/-/g, '');
      const cikInt = padded.replace(/^0+/, '');
      row = {
        fy: o.fy,
        end: o.end,
        form: o.form,
        accession: o.accn,
        accessionNoDashes,
        primaryDocUrl: accessionNoDashes
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=&dateb=&owner=include&count=40#${o.accn}`
          : '',
      };
      buckets.set(key, row);
    }
    (row as Record<string, unknown>)[field] = o.val;
    if (FORM_PRIORITY[o.form] != null && FORM_PRIORITY[o.form] > (FORM_PRIORITY[row.form] ?? 0)) {
      row.form = o.form;
      row.accession = o.accn;
      row.accessionNoDashes = o.accn.replace(/-/g, '');
    }
  }

  for (const [, o] of annualObservations(revenue))      intoRow(o, 'revenue');
  for (const [, o] of annualObservations(grossProfit))  intoRow(o, 'grossProfit');
  for (const [, o] of annualObservations(operatingInc)) intoRow(o, 'operatingIncome');
  for (const [, o] of annualObservations(netIncome))    intoRow(o, 'netIncome');
  for (const [, o] of annualObservations(assets))       intoRow(o, 'assets');
  for (const [, o] of annualObservations(liabilities))  intoRow(o, 'liabilities');
  for (const [, o] of annualObservations(equity))       intoRow(o, 'equity');
  for (const [, o] of annualObservations(cash))         intoRow(o, 'cash');
  for (const [, o] of annualObservations(operatingCF))  intoRow(o, 'operatingCashFlow');

  const sorted = [...buckets.values()].sort((a, b) => a.end.localeCompare(b.end));
  const last = opts.years ?? 6;
  const rows = sorted.slice(-last);
  return { rows, unit, entityName: facts.entityName ?? null };
}

export type QuarterRow = {
  end: string;
  fp: string;
  form: string;
  accession: string;
  primaryDocUrl: string;
  revenue?: number;
  netIncome?: number;
  operatingIncome?: number;
};

export async function getQuarterlyFromFilings(cik: string, opts: { quarters?: number } = {}): Promise<{
  rows: QuarterRow[];
  unit: string | null;
}> {
  const facts = await getCompanyFacts(cik).catch(() => null);
  if (!facts) return { rows: [], unit: null };

  const revenue      = pickConcept(facts, REVENUE_TAGS, 'largest');
  const netIncome    = pickConcept(facts, NET_INCOME_TAGS);
  const operatingInc = pickConcept(facts, OPERATING_INCOME_TAGS);

  const unit = revenue?.unit || netIncome?.unit || 'USD';
  const padded = cik.padStart(10, '0');
  const cikInt = padded.replace(/^0+/, '');

  function isQuarterlyPeriod(o: XBRLObservation): boolean {
    if (!/^Q[1-4]$/.test(o.fp)) return false;
    if (o.start && /^\d{4}-\d{2}-\d{2}$/.test(o.start)) {
      const s = Date.parse(o.start);
      const e = Date.parse(o.end);
      const days = (e - s) / 86_400_000;
      return days > 70 && days < 110;
    }
    return true;
  }
  function pickQuarter(c: XBRLConcept | null): XBRLObservation[] {
    if (!c) return [];
    return c.observations.filter(isQuarterlyPeriod);
  }

  const map = new Map<string, QuarterRow>();
  function into(o: XBRLObservation, field: keyof QuarterRow) {
    let row = map.get(o.end);
    if (!row) {
      row = {
        end: o.end,
        fp: o.fp,
        form: o.form,
        accession: o.accn,
        primaryDocUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=&dateb=&owner=include&count=40#${o.accn}`,
      };
      map.set(o.end, row);
    }
    (row as Record<string, unknown>)[field] = o.val;
  }
  for (const o of pickQuarter(revenue))      into(o, 'revenue');
  for (const o of pickQuarter(netIncome))    into(o, 'netIncome');
  for (const o of pickQuarter(operatingInc)) into(o, 'operatingIncome');

  const sorted = [...map.values()].sort((a, b) => a.end.localeCompare(b.end));
  const last = opts.quarters ?? 8;
  return { rows: sorted.slice(-last), unit };
}
