/**
 * Value-investor red & green flags + 3-tier verdict.
 *
 *   Inspired by Shlomi Ardan's "interesting / watch / does not pass"
 *   categorical framework for Israeli stocks. Where the Diamond-Lite score
 *   gives you a 0-100 composite, this layer gives you the **decision** —
 *   the kind of yes/no/dig-deeper a value researcher would write at the
 *   top of their notes after one read-through.
 *
 *   Red flags are explicit "this is a problem" markers — leverage,
 *   commodity exposure, illiquidity, money-losing micro-caps, etc.
 *   Green flags are "this is what we hunt for" — moats, founder-led,
 *   compounding history.
 *
 *   The verdict is rule-based, NOT a prediction. It's a checklist.
 */

import type { GrowthFundamentals } from './growth';

export type Severity = 'high' | 'medium' | 'low';
export type Verdict = 'interesting' | 'watch' | 'skip';

export type Flag = {
  key: string;
  label: string;
  hint: string;
  severity: Severity;
};

export type LiquidityTier = 'illiquid' | 'thin' | 'normal' | 'liquid';

const LIQUIDITY_LABEL: Record<LiquidityTier, string> = {
  illiquid: 'Illiquid · hard to enter or exit',
  thin:     'Thinly traded · use limit orders',
  normal:   'Adequate liquidity',
  liquid:   'Very liquid · easy to trade',
};

export type CompanyVerdict = {
  verdict: Verdict;
  verdictLabel: string;
  rationale: string;
  liquidity: { tier: LiquidityTier; label: string; dollarVolumePerDay?: number };
  redFlags: Flag[];
  greenFlags: Flag[];
};

export type VerdictInputs = {
  fund: GrowthFundamentals;
  // Yahoo snapshot
  marketCap?: number | null;
  marketCapUsd?: number | null;       // already-normalized USD value
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  profitMargins?: number | null;
  debtToEquity?: number | null;       // Yahoo reports as %, divide by 100 first
  totalCash?: number | null;
  totalDebt?: number | null;
  freeCashflow?: number | null;
  avgVolume3M?: number | null;        // shares per day
  price?: number | null;
  currency?: string | null;
  // Ownership concentration (Yahoo: fraction)
  heldPercentInsiders?: number | null;
  // Sector / classification
  sector?: string;
  industry?: string | null;
  companyName?: string;               // used to detect "Holdings"/"Investment Corp" structure
  founded?: number | null;            // year founded (proxy for IPO recency)
  // Composition data
  isFounderLed?: boolean;
  technicalLeaders?: number;
  // SEC presence
  hasSecFilings?: boolean;
};

// ── Liquidity tier ───────────────────────────────────────────────

function liquidityFor(i: VerdictInputs): CompanyVerdict['liquidity'] {
  const vol = i.avgVolume3M ?? null;
  const price = i.price ?? null;
  if (vol == null || price == null) {
    return { tier: 'thin', label: 'Liquidity unknown — verify in the order book' };
  }
  // Yahoo prices for TASE are in agorot; we use USD scale for comparison.
  const isILA = (i.currency ?? '').toUpperCase() === 'ILA';
  const usdPrice = isILA ? price / 100 / 3.7 : price;
  const dollarVolume = usdPrice * vol;
  let tier: LiquidityTier;
  if      (dollarVolume < 50_000)        tier = 'illiquid';
  else if (dollarVolume < 500_000)       tier = 'thin';
  else if (dollarVolume < 5_000_000)     tier = 'normal';
  else                                   tier = 'liquid';
  return { tier, label: LIQUIDITY_LABEL[tier], dollarVolumePerDay: dollarVolume };
}

// ── Red flags ────────────────────────────────────────────────────

function detectRedFlags(i: VerdictInputs, liq: CompanyVerdict['liquidity']): Flag[] {
  const f: Flag[] = [];
  const { fund } = i;

  // 1. High leverage. Yahoo's debtToEquity is a percentage (200 = 200%).
  if (i.debtToEquity != null && i.debtToEquity > 200) {
    f.push({
      key: 'leverage',
      label: 'High leverage',
      hint: `Debt/Equity ${(i.debtToEquity / 100).toFixed(2)}× — leveraged balance sheet. A downturn or rate spike can wipe equity holders out before debt holders.`,
      severity: 'high',
    });
  }

  // 2. Net debt vs cash
  if (i.totalDebt != null && i.totalCash != null && i.totalDebt > i.totalCash * 3) {
    f.push({
      key: 'net-debt',
      label: 'Net debt > 3× cash',
      hint: 'Limited financial flexibility if revenue dips.',
      severity: 'medium',
    });
  }

  // 3. Money-losing AND small-cap → fragility
  const capUsd = i.marketCapUsd ?? i.marketCap ?? 0;
  if (i.profitMargins != null && i.profitMargins < 0 && capUsd > 0 && capUsd < 300e6) {
    f.push({
      key: 'losing-microcap',
      label: 'Losing money, sub-$300M cap',
      hint: 'Micro/small-cap with negative margins. Survival depends on dilution or external capital.',
      severity: 'high',
    });
  }

  // 4. Illiquidity
  if (liq.tier === 'illiquid') {
    f.push({
      key: 'illiquid',
      label: 'Illiquid — < $50K/day dollar volume',
      hint: 'You may not be able to buy or sell at posted prices. Position sizing matters here.',
      severity: 'high',
    });
  } else if (liq.tier === 'thin') {
    f.push({
      key: 'thin',
      label: 'Thinly traded',
      hint: 'Use limit orders. Spreads can be wide.',
      severity: 'medium',
    });
  }

  // 5. Commodity / cyclical exposure
  const indL = (i.industry ?? '').toLowerCase();
  if (/oil|gas|petroleum|coal|metal|mining|gold|silver/i.test(indL)) {
    f.push({
      key: 'commodity',
      label: 'Commodity-exposed',
      hint: 'Earnings track underlying commodity price. Treat the cycle, not last year, as the baseline.',
      severity: 'medium',
    });
  }
  if (i.sector === 'shipping') {
    f.push({
      key: 'shipping-cycle',
      label: 'Shipping cycle exposure',
      hint: 'Container shipping rates are notoriously cyclical. ZIM-style booms reverse fast.',
      severity: 'medium',
    });
  }

  // 6. Revenue contraction (sustained)
  if (fund.revenueCagr5y != null && fund.revenueCagr5y < -0.05) {
    f.push({
      key: 'rev-shrinking',
      label: 'Revenue shrinking · 5y CAGR < −5%',
      hint: 'Top-line declining over a full cycle. Mature business in run-off, structurally challenged, or losing share.',
      severity: 'high',
    });
  }

  // 7. Margin contraction trajectory
  if (fund.grossMarginTrajectory === 'contracting' &&
      fund.operatingMarginTrajectory === 'contracting') {
    f.push({
      key: 'margins-falling',
      label: 'Both gross & operating margins falling',
      hint: 'Pricing power eroding alongside operating leverage. Often a sign of competitive pressure.',
      severity: 'medium',
    });
  }

  // 8. Negative FCF
  if (i.freeCashflow != null && i.freeCashflow < 0) {
    f.push({
      key: 'negative-fcf',
      label: 'Negative free cash flow',
      hint: 'Burning cash. Verify the burn is financed and intentional (growth investment) vs. structural.',
      severity: 'medium',
    });
  }

  // 9. Sky-high valuation
  if (i.priceToSales != null && i.priceToSales > 15 && (fund.revenueCagr3y ?? 0) < 0.20) {
    f.push({
      key: 'expensive',
      label: 'P/S > 15× without supporting growth',
      hint: 'Priced for perfection. Any disappointment risks multiple compression.',
      severity: 'medium',
    });
  }
  if (i.trailingPE != null && i.trailingPE > 60 && (fund.netIncomeCagr3y ?? 0) < 0.20) {
    f.push({
      key: 'pe-expensive',
      label: 'P/E > 60× with modest growth',
      hint: 'Premium multiple unsupported by demonstrated earnings growth.',
      severity: 'low',
    });
  }

  // 10. Going-concern signal — sub-$50M cap, P/B < 0.3, losses
  if (capUsd > 0 && capUsd < 50e6 && (i.priceToBook ?? 1) < 0.3 && (i.profitMargins ?? 0) < 0) {
    f.push({
      key: 'going-concern',
      label: 'Going-concern signature',
      hint: 'Tiny cap, trading well below book, losing money. Verify they aren\'t about to delist or dilute.',
      severity: 'high',
    });
  }

  // 11. Controlling shareholder — Israeli-market specific risk
  //   Ardan flags this repeatedly: when one family/entity owns >50%, minorities
  //   are along for the ride. Related-party transactions, dilutive raises,
  //   private benefits become real concerns.
  if (i.heldPercentInsiders != null && i.heldPercentInsiders > 0.5) {
    f.push({
      key: 'controlling-shareholder',
      label: `Controlling shareholder (${(i.heldPercentInsiders * 100).toFixed(0)}% insider-held)`,
      hint: 'Israeli market: controlling families historically extract value via related-party deals or dilutive raises. Check the proxy / immediate-reports for capital structure changes.',
      severity: 'medium',
    });
  }

  // 12. Recent IPO — limited track record
  const yearsPublic = i.founded ? (new Date().getFullYear() - i.founded) : null;
  if (yearsPublic != null && yearsPublic < 3) {
    f.push({
      key: 'recent-ipo',
      label: 'Recent IPO · < 3 years public',
      hint: 'No multi-year track record. SPACs, recent IPOs and direct listings often disappoint as lock-ups expire and growth narratives unwind.',
      severity: 'medium',
    });
  }

  // 13. Holdings / conglomerate — needs sum-of-parts
  //   Israeli market is full of family holding cos (Discount Investment, IDB,
  //   Africa-Israel, Liventhal, AIS, Delek Group …). Standard P/E or P/B is
  //   misleading; the right valuation is sum-of-parts NAV.
  if (i.companyName && /\b(holdings?|holding company|investments? corp|investments? group|industries? group|industrial group|group\.?)\b/i.test(i.companyName)) {
    f.push({
      key: 'holdings-co',
      label: 'Holdings / conglomerate structure',
      hint: 'Standard multiples mislead here. The right approach is sum-of-parts NAV — value each subsidiary, sum, subtract net debt. Often a discount to NAV is the actual opportunity (or trap).',
      severity: 'low',
    });
  }

  return f;
}

// ── Green flags ──────────────────────────────────────────────────

function detectGreenFlags(i: VerdictInputs): Flag[] {
  const f: Flag[] = [];
  const { fund } = i;

  // 1. High gross margin sustained — moat indicator
  if (fund.grossMargin != null && fund.grossMargin >= 0.60) {
    f.push({
      key: 'moat-gm',
      label: 'High gross margin (≥60%)',
      hint: 'Often a sign of IP, brand, or platform economics. Sustainable margins like this are how compounders compound.',
      severity: 'high',
    });
  }

  // 2. Founder-led
  if (i.isFounderLed) {
    f.push({
      key: 'founder',
      label: 'Founder-led',
      hint: 'Owner-operators historically outperform — long horizons, skin in the game.',
      severity: 'medium',
    });
  }

  // 3. Net cash positive
  if (i.totalCash != null && i.totalDebt != null && i.totalCash > i.totalDebt) {
    f.push({
      key: 'net-cash',
      label: 'Net cash positive',
      hint: 'Survives any downturn. Optional dividends / buybacks / acquisitions without dilution.',
      severity: 'medium',
    });
  }

  // 4. Sustained revenue compounding
  if (fund.revenueCagr5y != null && fund.revenueCagr5y >= 0.10) {
    f.push({
      key: 'rev-compounding',
      label: `Revenue compounding · 5y CAGR ${(fund.revenueCagr5y * 100).toFixed(0)}%`,
      hint: 'The single strongest precursor of multi-baggers. Compounders earn their multiple over time.',
      severity: 'high',
    });
  }

  // 5. FCF margin healthy
  if (fund.fcfMargin != null && fund.fcfMargin >= 0.15) {
    f.push({
      key: 'fcf-margin',
      label: `FCF margin ≥ 15% (${(fund.fcfMargin * 100).toFixed(0)}%)`,
      hint: 'Earnings convert to cash. Cash is what funds dividends, buybacks, R&D, and survives recessions.',
      severity: 'high',
    });
  }

  // 6. ROE / ROA strong
  // (Yahoo's returnOnEquity is fraction; if > 0.15 it's healthy)
  // We can't reach that here without more inputs — skip for now.

  // 7. Technical depth in leadership
  if ((i.technicalLeaders ?? 0) >= 2) {
    f.push({
      key: 'tech-led',
      label: 'Multiple technical executives',
      hint: 'CTO + Chief Scientist (or similar). Innovation is visible at the top of the org.',
      severity: 'low',
    });
  }

  // 8. Cheap vs growth
  if (i.priceToSales != null && i.priceToSales < 2 && (fund.revenueCagr3y ?? 0) > 0.10) {
    f.push({
      key: 'value-and-growth',
      label: 'Cheap with growth',
      hint: 'P/S < 2× and growing 10%+. Rare combo — often a market mispricing.',
      severity: 'high',
    });
  }

  // 9. Margin expansion
  if (fund.grossMarginTrajectory === 'expanding' &&
      (fund.operatingMarginTrajectory === 'expanding' || fund.operatingMarginTrajectory === 'flat')) {
    f.push({
      key: 'margins-rising',
      label: 'Gross margin expanding',
      hint: 'Pricing power increasing or scale economies kicking in. Watch for this in early-stage compounders.',
      severity: 'medium',
    });
  }

  // 10. Real data quality — SEC filings present
  if (i.hasSecFilings) {
    f.push({
      key: 'sec-disclosure',
      label: 'Full SEC disclosure',
      hint: 'Files 10-K/20-F with SEC — XBRL-tagged numbers, audited annually. Higher reporting bar than TASE-only listings.',
      severity: 'low',
    });
  }

  // 11. Aligned insider ownership — significant but not controlling stake (10-40%)
  //    is "skin in the game" without the controlling-shareholder risks.
  if (i.heldPercentInsiders != null && i.heldPercentInsiders >= 0.10 && i.heldPercentInsiders <= 0.45) {
    f.push({
      key: 'aligned-insiders',
      label: `Insiders own ${(i.heldPercentInsiders * 100).toFixed(0)}% — aligned`,
      hint: 'Meaningful insider stake without controlling-shareholder dynamics. Management interests match yours.',
      severity: 'medium',
    });
  }

  return f;
}

// ── Sector context — "how to read this company" ──────────────────
//
//   Ardan applies *different* metrics to different sectors. A bank can't be
//   judged by gross margin; a REIT can't be judged by P/E; urban-renewal
//   plays don't even have most projects on the balance sheet. This function
//   returns the most relevant *focus* metrics + reading guidance for the
//   sector — surfaced as a hint card at the top of the company page.

export type SectorReadingGuide = {
  primaryMetrics: string[];
  pitfalls: string[];
  cyclical: boolean;
  oneLiner: string;
};

export function sectorReadingGuide(sector?: string, industry?: string | null): SectorReadingGuide | null {
  switch (sector) {
    case 'banking':
      return {
        primaryMetrics: ['ROE', 'Net interest margin', 'Cost / income ratio', 'Non-performing loans %', 'Tier 1 capital'],
        pitfalls: ['P/E is misleading mid-cycle', 'Provisions can be smoothed', 'Sensitive to rate path'],
        cyclical: true,
        oneLiner: 'Read banks on ROE, NIM and asset-quality trends. P/E alone is a trap mid-cycle.',
      };
    case 'realestate':
      return {
        primaryMetrics: ['FFO / share', 'Dividend yield', 'Net debt / EBITDA', 'Weighted avg lease expiry', 'Discount-to-NAV'],
        pitfalls: ['Refinancing risk when 1% bonds mature into 5%', 'Inflation-indexed debt rises faster than rent in crises', 'Cap rates compress in zero-rate eras and expand sharply when rates rise'],
        cyclical: true,
        oneLiner: 'Income real-estate trades on FFO yield + debt structure. Watch refinancing walls and lease expiries.',
      };
    case 'energy':
      return {
        primaryMetrics: ['EV/EBITDA on a 3-5y normalised basis', 'Reserves life', 'Production cost / boe', 'FCF at mid-cycle commodity prices'],
        pitfalls: ['Latest-year earnings rarely repeat — cycles dominate', 'Capex commitments stretch a decade', 'Commodity-price swings dwarf operational improvements'],
        cyclical: true,
        oneLiner: 'Normalise earnings across the commodity cycle. A great year ≠ a great company.',
      };
    case 'shipping':
      return {
        primaryMetrics: ['Freight rate trend', 'EV/EBITDA at mid-cycle', 'Fleet age', 'Charter cover', 'Net debt / EBITDA'],
        pitfalls: ['Boom-bust extreme — earnings can 10× then halve in 2 years', 'Capex during peaks destroys returns', 'Asset values fluctuate violently'],
        cyclical: true,
        oneLiner: 'Container shipping is the most cyclical industry in the market. Trade the cycle, never extrapolate.',
      };
    case 'pharma':
      return {
        primaryMetrics: ['Pipeline NPV', 'Cash runway (months)', 'Burn rate', 'Phase progression', 'Patent expiries'],
        pitfalls: ['Single-event dependencies (FDA approvals)', 'Patent cliffs cause sudden revenue holes', 'Pre-revenue biotech is binary'],
        cyclical: false,
        oneLiner: 'For commercial pharma: watch patent cliffs and competition. For pre-revenue biotech: cash runway and trial readouts.',
      };
    case 'security':
    case 'tech':
      return {
        primaryMetrics: ['Revenue growth (3y + 5y CAGR)', 'Rule of 40 (growth + FCF margin)', 'Gross margin', 'Net retention (if reported)', 'Cash burn for growth-stage names'],
        pitfalls: ['Multiple compression risk on growth disappointment', 'Stock-based comp inflates GAAP losses (look at FCF)', 'Customer concentration / hyperscaler dependency'],
        cyclical: false,
        oneLiner: 'Software is priced on growth × margin. Rule of 40 (growth% + FCF margin%) ≥ 40 is the bar for premium multiples.',
      };
    case 'semis':
      return {
        primaryMetrics: ['Bookings / billings ratio', 'Inventory days', 'Capex / sales', 'Foundry utilisation', 'EV / sales at mid-cycle'],
        pitfalls: ['Cyclical demand — chip-shortage → glut → shortage', 'Capex-heavy: depreciation eats earnings', 'Geopolitical exposure (TSMC, China, US export controls)'],
        cyclical: true,
        oneLiner: 'Semis are cyclical capex-heavy businesses. Watch inventory + bookings — peak earnings often = worst entry.',
      };
    case 'insurance':
      return {
        primaryMetrics: ['Combined ratio', 'Investment yield on float', 'Book value growth', 'ROE', 'Solvency ratio'],
        pitfalls: ['Reserve adequacy hard to judge from outside', 'Catastrophe years can wipe a decade of profit', 'Investment portfolio sensitivity to rates'],
        cyclical: false,
        oneLiner: 'Insurance = float economics. Read combined ratio + investment yield + reserve discipline.',
      };
    case 'fintech':
      return {
        primaryMetrics: ['AUM growth', 'Take rate / fee yield', 'Net inflows', 'Operating leverage'],
        pitfalls: ['AUM levered to market returns (down years compound)', 'Fee compression secular', 'Capital-light or capital-heavy matters enormously'],
        cyclical: true,
        oneLiner: 'Asset managers compound with markets — be wary of fee-rate compression and bull-market valuations.',
      };
    case 'defense':
      return {
        primaryMetrics: ['Order backlog', 'Book-to-bill', 'Operating margin', 'FCF conversion', 'Geographic mix'],
        pitfalls: ['Budget cycle dependence', 'Lumpy contract revenue', 'Geopolitical narrative drives multiples — beware momentum extremes'],
        cyclical: false,
        oneLiner: 'Defense is long-cycle. Backlog and book-to-bill are the leading indicators. Multiples expand on narrative, contract on procurement freezes.',
      };
    case 'telecom':
      return {
        primaryMetrics: ['ARPU', 'Subscribers', 'EBITDA margin', 'Capex / sales', 'Net debt / EBITDA', 'Dividend yield'],
        pitfalls: ['Mature market — growth is rare', 'Capex (5G, fiber) eats FCF for years', 'Regulatory tariff caps'],
        cyclical: false,
        oneLiner: 'Telecom = utility-like cash flow. Buy when FCF yield is meaningfully above bond yields and capex peak is behind.',
      };
    case 'retail':
      return {
        primaryMetrics: ['Same-store sales growth', 'Gross margin trend', 'Inventory turns', 'Sales / sq ft', 'E-commerce mix'],
        pitfalls: ['Fashion / cycle risk', 'Real-estate lease obligations', 'Amazon / online disruption per category'],
        cyclical: true,
        oneLiner: 'Retail = sentiment + execution. Same-store sales > new-store-pad growth is the quality signal.',
      };
    case 'industrial':
      return {
        primaryMetrics: ['Backlog', 'Book-to-bill', 'Operating margin', 'Return on invested capital', 'Working capital cycle'],
        pitfalls: ['Capex cycles drive results', 'Commodity input inflation squeezes margins'],
        cyclical: true,
        oneLiner: 'Industrials live or die by backlog + ROIC. Read both.',
      };
  }
  void industry;
  return null;
}

// ── Verdict ──────────────────────────────────────────────────────

export function deriveVerdict(i: VerdictInputs): CompanyVerdict {
  const liquidity = liquidityFor(i);
  const redFlags = detectRedFlags(i, liquidity);
  const greenFlags = detectGreenFlags(i);

  const highRed = redFlags.filter(f => f.severity === 'high').length;
  const medRed  = redFlags.filter(f => f.severity === 'medium').length;
  const highGreen = greenFlags.filter(f => f.severity === 'high').length;
  const medGreen  = greenFlags.filter(f => f.severity === 'medium').length;

  let verdict: Verdict;
  let verdictLabel: string;
  let rationale: string;

  if (highRed >= 1) {
    verdict = 'skip';
    verdictLabel = 'Does not pass';
    rationale = `${highRed} high-severity red flag${highRed > 1 ? 's' : ''} present. Treat as no-touch unless you have a specific contrarian thesis.`;
  } else if (medRed >= 3 || (medRed >= 2 && highGreen < 2)) {
    verdict = 'watch';
    verdictLabel = 'Watch list';
    rationale = 'Mixed signals — interesting but with caveats. Worth a deeper look before committing capital.';
  } else if (highGreen >= 2 || (highGreen >= 1 && medGreen >= 2)) {
    verdict = 'interesting';
    verdictLabel = 'Interesting';
    rationale = `${highGreen} strong positive signal${highGreen > 1 ? 's' : ''} with limited red flags. This is the kind of name that earns a full diligence pass.`;
  } else {
    verdict = 'watch';
    verdictLabel = 'Watch list';
    rationale = 'Not enough positive signals yet. Track for re-rating or fundamental improvement.';
  }

  return {
    verdict,
    verdictLabel,
    rationale,
    liquidity,
    redFlags,
    greenFlags,
  };
}
