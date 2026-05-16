/**
 * Diamond-Lite — a scoring function that works on every TASE-listed company
 * using only the lightweight Yahoo batched-quote payload (P/E, P/B, 1-year
 * change, market cap, …). For the 35 SEC-listed names the heavier Diamond
 * (see lib/growth.ts) overrides this once the user opens the detail page.
 *
 * The point: rank the whole 572-company universe quickly so a researcher can
 * spot hidden diamonds at a glance instead of clicking each name.
 */

import type { EnrichedCompany } from './catalog';
import type { QuotePreview } from './yahoo';

export type DiamondLite = {
  score: number;        // 0–100 composite
  momentum: number;     // 0–30  — 1Y price change, relative to range
  value: number;        // 0–25  — cheap valuation
  size: number;         // 0–25  — small-cap / micro-cap bonus
  quality: number;      // 0–20  — earnings present & growing
  // Helpful for tooltips:
  reasons: string[];
};

export function scoreLite(quote: QuotePreview | undefined, company: EnrichedCompany): DiamondLite {
  const reasons: string[] = [];
  let momentum = 0;
  let value = 0;
  let size = 0;
  let quality = 0;

  // ── Momentum (1Y change, capped) ─────────────────────────────
  const m1y = quote?.changePercent52w ?? null;
  if (m1y != null) {
    if (m1y > 1.0)  { momentum = 30; reasons.push('1Y price > +100%'); }
    else if (m1y > 0.5)  { momentum = 24; reasons.push('1Y price > +50%'); }
    else if (m1y > 0.25) { momentum = 18; reasons.push('1Y price > +25%'); }
    else if (m1y > 0.10) { momentum = 12; reasons.push('1Y price > +10%'); }
    else if (m1y > 0)    { momentum = 6;  }
    else                 { momentum = 0; }
  }

  // Bonus for being close to 52W high (consolidating near top)
  const fromHi = quote?.fromFiftyTwoWeekHigh ?? null;
  if (fromHi != null && fromHi > -0.10 && (m1y ?? 0) > 0) {
    momentum = Math.min(30, momentum + 4);
    reasons.push('within 10% of 52W high');
  }

  // ── Value (cheap absolute or relative to earnings) ──────────
  const pe = quote?.trailingPE ?? null;
  const pb = quote?.priceToBook ?? null;
  if (pe != null && pe > 0) {
    if (pe < 8)   { value += 15; reasons.push(`P/E ${pe.toFixed(1)} — single-digit`); }
    else if (pe < 15)  value += 10;
    else if (pe < 25)  value += 5;
  }
  if (pb != null && pb > 0) {
    if (pb < 1)   { value += 10; reasons.push(`P/B ${pb.toFixed(2)} — below book`); }
    else if (pb < 2.5) value += 6;
    else if (pb < 5)   value += 3;
  }
  value = Math.min(25, value);

  // ── Size (under-followed sub-$2B / micro-cap bonus) ─────────
  // TASE listings come in ILS; US listings in USD. For a uniform threshold we
  // approximate with ILS↔USD ≈ 1:3.7 (we'd rather catch true micro-caps than
  // miss them; the bias is mild).
  const ils = (quote?.currency ?? '').toUpperCase().startsWith('IL');
  const capRaw = quote?.marketCap ?? company.marketCap ?? 0;
  const capUsd = ils ? capRaw / 3.7 : capRaw;
  if (capUsd > 0) {
    if (capUsd < 100e6)       { size = 25; reasons.push('< $100M cap — true micro'); }
    else if (capUsd < 300e6)  { size = 20; reasons.push('< $300M cap'); }
    else if (capUsd < 1e9)    { size = 14; reasons.push('< $1B cap'); }
    else if (capUsd < 2e9)    { size = 8;  }
  }

  // ── Quality (positive earnings + growth) ───────────────────
  const eps = quote?.epsTrailing ?? null;
  if (eps != null && eps > 0) { quality += 10; reasons.push('positive trailing earnings'); }
  if (m1y != null && m1y > 0 && eps != null && eps > 0) quality += 5;
  // Founder-led signal when curated metadata tells us
  if (company.curated && /Co-Founder|Founder/i.test(company.tagline ?? '')) {
    quality += 5; reasons.push('founder-led (curated)');
  }
  quality = Math.min(20, quality);

  const score = Math.min(100, momentum + value + size + quality);
  return { score, momentum, value, size, quality, reasons };
}

// ── Featured-rail filters ─────────────────────────────────────

export type RailKey = 'top' | 'micro' | 'momentum' | 'value' | 'quality';

export type Pick = { company: EnrichedCompany; quote?: QuotePreview; score: DiamondLite };

export function pickRail(picks: Pick[], rail: RailKey, n = 8): Pick[] {
  switch (rail) {
    case 'top':
      return [...picks]
        .filter(p => p.score.score >= 30)
        .sort((a, b) => b.score.score - a.score.score)
        .slice(0, n);
    case 'micro':
      return [...picks]
        .filter(p => {
          const ils = (p.quote?.currency ?? '').toUpperCase().startsWith('IL');
          const cap = p.quote?.marketCap ?? p.company.marketCap ?? 0;
          const usd = ils ? cap / 3.7 : cap;
          return usd > 0 && usd < 300e6 && p.score.score >= 30;
        })
        .sort((a, b) => b.score.score - a.score.score)
        .slice(0, n);
    case 'momentum':
      return [...picks]
        .filter(p => (p.quote?.changePercent52w ?? -1) > 0.10)
        .sort((a, b) => (b.quote?.changePercent52w ?? 0) - (a.quote?.changePercent52w ?? 0))
        .slice(0, n);
    case 'value':
      return [...picks]
        .filter(p => (p.quote?.trailingPE ?? 0) > 0 && (p.quote?.trailingPE ?? 99) < 12 && (p.quote?.changePercent52w ?? -1) > -0.30)
        .sort((a, b) => (a.quote?.trailingPE ?? 99) - (b.quote?.trailingPE ?? 99))
        .slice(0, n);
    case 'quality':
      return [...picks]
        .filter(p => p.score.quality >= 15)
        .sort((a, b) => b.score.quality - a.score.quality)
        .slice(0, n);
  }
}
