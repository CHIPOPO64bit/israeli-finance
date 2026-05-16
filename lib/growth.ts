/**
 * Growth & fundamentals math.
 *
 * Derives the metrics a serious researcher would actually look at when
 * hunting for under-followed compounders — multi-year CAGR, margin
 * trajectory, FCF conversion, capital efficiency, and a "diamond" score
 * that combines growth + quality + value. Every input comes from XBRL
 * data filed by the company itself.
 */

import type { AnnualRow } from './sec';

export type Trajectory = 'expanding' | 'flat' | 'contracting' | null;

export type GrowthFundamentals = {
  // CAGR (compound annual growth rate). Each may be null if too few periods.
  revenueCagr3y?: number;
  revenueCagr5y?: number;
  netIncomeCagr3y?: number;
  netIncomeCagr5y?: number;
  fcfCagr3y?: number;
  equityCagr5y?: number;

  // Most-recent margins (TTM-ish — uses latest annual)
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  fcfMargin?: number;

  // Trajectories — direction over the most recent 3 fiscal years.
  grossMarginTrajectory?: Trajectory;
  operatingMarginTrajectory?: Trajectory;
  netMarginTrajectory?: Trajectory;
  fcfMarginTrajectory?: Trajectory;

  // Capital structure / efficiency
  cashToDebt?: number;          // total cash ÷ total debt (when both are reported in balance sheet)
  netCashPosition?: number;     // cash − debt (in unit currency)
  fcfConversion?: number;       // FCF ÷ Net income, latest year
  reinvestmentRate?: number;    // 1 − (FCF / Net income), latest year

  // Latest snapshot row for context
  latestRow?: AnnualRow;
  rowsUsed: number;
};

function cagr(start: number | undefined, end: number | undefined, years: number): number | undefined {
  if (start == null || end == null || years <= 0) return undefined;
  if (start <= 0 || end <= 0) return undefined; // signed-CAGR is meaningless
  return Math.pow(end / start, 1 / years) - 1;
}

function trajectory(values: (number | undefined)[]): Trajectory {
  const v = values.filter((x): x is number => typeof x === 'number' && isFinite(x));
  if (v.length < 2) return null;
  const first = v[0];
  const last = v[v.length - 1];
  if (first == null) return null;
  const change = last - first;
  const rel = Math.abs(first) > 0 ? change / Math.abs(first) : 0;
  if (rel > 0.05) return 'expanding';
  if (rel < -0.05) return 'contracting';
  return 'flat';
}

export function deriveFundamentals(rows: AnnualRow[]): GrowthFundamentals {
  if (!rows || rows.length === 0) return { rowsUsed: 0 };
  const sorted = [...rows].sort((a, b) => a.end.localeCompare(b.end));
  const latest = sorted[sorted.length - 1];

  // CAGR ladders
  const revs = sorted.map(r => r.revenue);
  const nets = sorted.map(r => r.netIncome);
  const fcfs = sorted.map(r => r.cash != null ? undefined : undefined);
  void fcfs;
  const eqs  = sorted.map(r => r.equity);
  const fcfsActual = sorted.map(r => r.operatingCashFlow);

  function pickAtBack(arr: (number | undefined)[], yearsBack: number): number | undefined {
    const idx = arr.length - 1 - yearsBack;
    return idx >= 0 ? arr[idx] : undefined;
  }
  function lastDefined(arr: (number | undefined)[]): number | undefined {
    return arr[arr.length - 1];
  }

  const revLast = lastDefined(revs);
  const nrev3   = pickAtBack(revs, 3);
  const nrev5   = pickAtBack(revs, 5);

  const niLast  = lastDefined(nets);
  const ni3     = pickAtBack(nets, 3);
  const ni5     = pickAtBack(nets, 5);

  const eqLast  = lastDefined(eqs);
  const eq5     = pickAtBack(eqs, 5);

  const ocLast  = lastDefined(fcfsActual);
  const oc3     = pickAtBack(fcfsActual, 3);

  // Margins from latest year
  const grossMargin     = latest.revenue && latest.grossProfit       != null ? latest.grossProfit       / latest.revenue : undefined;
  const operatingMargin = latest.revenue && latest.operatingIncome   != null ? latest.operatingIncome   / latest.revenue : undefined;
  const netMargin       = latest.revenue && latest.netIncome         != null ? latest.netIncome         / latest.revenue : undefined;
  const fcfMargin       = latest.revenue && latest.operatingCashFlow != null ? latest.operatingCashFlow / latest.revenue : undefined;

  // Margin trajectories — last 3 years
  const recent = sorted.slice(-3);
  const gmSeries = recent.map(r => r.revenue && r.grossProfit       != null ? r.grossProfit       / r.revenue : undefined);
  const omSeries = recent.map(r => r.revenue && r.operatingIncome   != null ? r.operatingIncome   / r.revenue : undefined);
  const nmSeries = recent.map(r => r.revenue && r.netIncome         != null ? r.netIncome         / r.revenue : undefined);
  const fmSeries = recent.map(r => r.revenue && r.operatingCashFlow != null ? r.operatingCashFlow / r.revenue : undefined);

  return {
    revenueCagr3y:    cagr(nrev3, revLast, 3),
    revenueCagr5y:    cagr(nrev5, revLast, 5),
    netIncomeCagr3y:  cagr(ni3,  niLast, 3),
    netIncomeCagr5y:  cagr(ni5,  niLast, 5),
    fcfCagr3y:        cagr(oc3,  ocLast, 3),
    equityCagr5y:     cagr(eq5,  eqLast, 5),
    grossMargin, operatingMargin, netMargin, fcfMargin,
    grossMarginTrajectory:     trajectory(gmSeries),
    operatingMarginTrajectory: trajectory(omSeries),
    netMarginTrajectory:       trajectory(nmSeries),
    fcfMarginTrajectory:       trajectory(fmSeries),
    cashToDebt:        latest.cash != null && latest.liabilities != null && latest.liabilities > 0
      ? latest.cash / (latest.liabilities ?? 1) : undefined,
    netCashPosition:   latest.cash != null
      ? (latest.cash - (latest.liabilities ?? 0))
      : undefined,
    fcfConversion:     latest.netIncome && latest.operatingCashFlow != null && latest.netIncome !== 0
      ? latest.operatingCashFlow / latest.netIncome
      : undefined,
    reinvestmentRate:  latest.netIncome && latest.operatingCashFlow != null && latest.netIncome > 0
      ? 1 - (latest.operatingCashFlow / latest.netIncome)
      : undefined,
    latestRow: latest,
    rowsUsed: sorted.length,
  };
}

// ── "Diamond" scoring ────────────────────────────────────────────
//
//   Pure structured signals. Not a price prediction — a scorecard of
//   the conditions that historically precede multi-bagger outcomes:
//   high growth + improving margins + cash-positive + reasonable price.

export type DiamondSignals = {
  growthScore: number;          // 0–100
  qualityScore: number;          // 0–100
  valueScore: number;            // 0–100
  durabilityScore: number;       // 0–100
  signals: SignalItem[];
};

export type SignalItem = {
  key: string;
  label: string;
  value: string;
  good: boolean | null;          // null = informational only
  weight: number;                // 0–10 contribution to its score bucket
  bucket: 'growth' | 'quality' | 'value' | 'durability';
  hint?: string;
};

export type ScoringInputs = {
  fund: GrowthFundamentals;
  marketCap?: number | null;
  enterpriseValue?: number | null;
  trailingPE?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  totalRevenue?: number | null;
  totalCash?: number | null;
  totalDebt?: number | null;
  insiderPct?: number | null;
  isFounderLed?: boolean;
  technicalLeaders?: number;
  // currency unit just used for context messages, not math
};

function pct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return `${(v * 100).toFixed(decimals)}%`;
}

function ratio(v: number | null | undefined, decimals = 2): string {
  if (v == null || !isFinite(v)) return '—';
  return v.toFixed(decimals);
}

function pushIfDefined<T>(arr: T[], item: T | null | undefined) {
  if (item != null) arr.push(item);
}

export function deriveDiamond(i: ScoringInputs): DiamondSignals {
  const out: SignalItem[] = [];
  const { fund } = i;

  // GROWTH ─────────────────────────────────────────────────────
  if (fund.revenueCagr5y != null) {
    out.push({
      key: 'rev5y', label: 'Revenue · 5y CAGR',
      value: pct(fund.revenueCagr5y),
      good: fund.revenueCagr5y >= 0.10,
      weight: fund.revenueCagr5y >= 0.30 ? 10 : fund.revenueCagr5y >= 0.20 ? 8 : fund.revenueCagr5y >= 0.10 ? 6 : 2,
      bucket: 'growth',
      hint: 'Sustained 5-year top-line growth — the single strongest precursor to multi-baggers.',
    });
  }
  if (fund.revenueCagr3y != null) {
    out.push({
      key: 'rev3y', label: 'Revenue · 3y CAGR',
      value: pct(fund.revenueCagr3y),
      good: fund.revenueCagr3y >= 0.15,
      weight: fund.revenueCagr3y >= 0.30 ? 8 : fund.revenueCagr3y >= 0.15 ? 6 : 2,
      bucket: 'growth',
      hint: 'Recent growth — acceleration matters more than the average.',
    });
  }
  if (fund.netIncomeCagr3y != null) {
    out.push({
      key: 'ni3y', label: 'Net income · 3y CAGR',
      value: pct(fund.netIncomeCagr3y),
      good: fund.netIncomeCagr3y >= 0.10,
      weight: fund.netIncomeCagr3y >= 0.30 ? 7 : fund.netIncomeCagr3y >= 0.10 ? 5 : 1,
      bucket: 'growth',
      hint: 'Earnings growing alongside revenue is the proof of operating leverage.',
    });
  }
  if (fund.grossMarginTrajectory === 'expanding') {
    out.push({
      key: 'gm-exp', label: 'Gross margin expanding',
      value: 'over 3 yrs',
      good: true,
      weight: 6,
      bucket: 'growth',
      hint: 'Pricing power growing — the second-best long-term signal after revenue.',
    });
  } else if (fund.grossMarginTrajectory === 'contracting') {
    out.push({
      key: 'gm-cont', label: 'Gross margin contracting',
      value: 'over 3 yrs',
      good: false,
      weight: 5,
      bucket: 'growth',
      hint: 'Pricing under pressure — investigate competition before buying growth here.',
    });
  }

  // QUALITY ────────────────────────────────────────────────────
  if (fund.grossMargin != null) {
    out.push({
      key: 'gm', label: 'Gross margin',
      value: pct(fund.grossMargin),
      good: fund.grossMargin >= 0.40,
      weight: fund.grossMargin >= 0.60 ? 8 : fund.grossMargin >= 0.40 ? 6 : 2,
      bucket: 'quality',
      hint: 'High GM = either IP moat or capital-light business model. Diamonds usually start at 40%+.',
    });
  }
  if (fund.operatingMargin != null) {
    out.push({
      key: 'om', label: 'Operating margin',
      value: pct(fund.operatingMargin),
      good: fund.operatingMargin >= 0.10,
      weight: fund.operatingMargin >= 0.20 ? 7 : fund.operatingMargin >= 0.10 ? 5 : 1,
      bucket: 'quality',
    });
  }
  if (fund.fcfConversion != null) {
    out.push({
      key: 'fcfconv', label: 'FCF / Net income',
      value: ratio(fund.fcfConversion, 2),
      good: fund.fcfConversion >= 0.7,
      weight: fund.fcfConversion >= 1 ? 7 : fund.fcfConversion >= 0.7 ? 5 : 1,
      bucket: 'quality',
      hint: 'Earnings are an opinion, cash is a fact. < 0.7 hints at accruals; > 1 is gold.',
    });
  }
  if (i.isFounderLed) {
    out.push({
      key: 'founder', label: 'Founder still leads',
      value: 'yes',
      good: true,
      weight: 6,
      bucket: 'quality',
      hint: 'Founder-led companies historically outperform — long horizons, skin in the game.',
    });
  }
  if ((i.technicalLeaders ?? 0) >= 1) {
    out.push({
      key: 'tech-led', label: 'Technical C-level',
      value: `${i.technicalLeaders}`,
      good: true,
      weight: 4,
      bucket: 'quality',
      hint: 'CTO / Chief Scientist / Head of R&D disclosed — innovation visible at the top.',
    });
  }

  // VALUE ──────────────────────────────────────────────────────
  //
  //   The diamond test for value is **price vs growth**, not absolute multiple.
  //   A 1× P/S is cheap even at 8% growth; a 20× P/S is expensive even at 50%.
  //   The thresholds below reflect that intuition.
  if (i.priceToSales != null) {
    const ps = i.priceToSales;
    const g = fund.revenueCagr3y ?? 0;
    // "Sales-yield-to-growth": growth per unit of P/S. > 0.10 is the screen for
    // growth-at-a-reasonable-price; 0.20+ is rare and very interesting.
    const yieldToGrowth = ps > 0 ? g / ps : 0;
    const cheapAbsolute = ps < 1.5;        // trading below revenue itself
    const cheapForGrowth = yieldToGrowth >= 0.10;
    out.push({
      key: 'ps', label: 'P / Sales',
      value: ratio(ps, 2),
      good: cheapAbsolute || cheapForGrowth,
      weight: cheapAbsolute || cheapForGrowth ? 8 : ps > 12 ? 1 : 4,
      bucket: 'value',
      hint: cheapAbsolute
        ? 'Below 1.5× sales — market is paying you to wait. Make sure the business is real.'
        : cheapForGrowth
          ? `Yield-to-growth ${(yieldToGrowth * 100).toFixed(1)}% — growth materially exceeds the multiple.`
          : 'Multiple is rich vs. the growth rate.',
    });
  }
  if (i.trailingPE != null && fund.netIncomeCagr3y != null && fund.netIncomeCagr3y > 0) {
    const peg = i.trailingPE / (fund.netIncomeCagr3y * 100);
    out.push({
      key: 'peg', label: 'PEG (PE ÷ NI growth)',
      value: ratio(peg, 2),
      good: peg < 1.5,
      weight: peg < 1 ? 8 : peg < 1.5 ? 6 : 2,
      bucket: 'value',
      hint: 'PEG < 1 is the classic Peter Lynch screen for growth-at-a-reasonable-price.',
    });
  }
  if (i.priceToBook != null) {
    out.push({
      key: 'pb', label: 'P / Book',
      value: ratio(i.priceToBook, 2),
      good: i.priceToBook < 3,
      weight: 3,
      bucket: 'value',
    });
  }
  if (i.marketCap != null) {
    const cap = i.marketCap;
    const isMicroCap = cap < 300e6;
    const isSmallCap = cap < 2e9;
    const isUnderFollowed = isSmallCap;
    out.push({
      key: 'mcap', label: 'Market cap',
      value: cap >= 1e9 ? `$${(cap / 1e9).toFixed(2)}B` : `$${(cap / 1e6).toFixed(0)}M`,
      good: isUnderFollowed ? true : null,
      weight: isMicroCap ? 8 : isSmallCap ? 5 : 0,
      bucket: 'value',
      hint: isMicroCap ? 'Under $300M — where the deepest diamonds hide. Liquidity & governance risk grow here.'
          : isSmallCap   ? 'Sub-$2B cap — likely under-followed by Wall Street.'
          : undefined,
    });
  }

  // DURABILITY ─────────────────────────────────────────────────
  if (fund.netCashPosition != null) {
    out.push({
      key: 'netcash', label: 'Net cash position',
      value: fund.netCashPosition >= 0 ? '+ ' : '- ',
      good: fund.netCashPosition >= 0,
      weight: fund.netCashPosition >= 0 ? 6 : 2,
      bucket: 'durability',
      hint: fund.netCashPosition >= 0 ? 'Cash > liabilities — can weather any downturn.' : 'Net debt — check interest cover.',
    });
  }
  if (fund.fcfMargin != null) {
    out.push({
      key: 'fcfm', label: 'FCF margin',
      value: pct(fund.fcfMargin),
      good: fund.fcfMargin >= 0.10,
      weight: fund.fcfMargin >= 0.20 ? 7 : fund.fcfMargin >= 0.10 ? 5 : 1,
      bucket: 'durability',
    });
  }
  if (fund.equityCagr5y != null) {
    out.push({
      key: 'eqcagr', label: 'Equity · 5y CAGR',
      value: pct(fund.equityCagr5y),
      good: fund.equityCagr5y >= 0.10,
      weight: fund.equityCagr5y >= 0.10 ? 5 : 2,
      bucket: 'durability',
      hint: 'Book-value compounding — what Buffett calls the real long-term scorecard.',
    });
  }

  void pushIfDefined; // silence unused

  function score(bucket: SignalItem['bucket']): number {
    const items = out.filter(s => s.bucket === bucket);
    const max = items.reduce((s, x) => s + x.weight, 0) || 1;
    const got = items.reduce((s, x) => s + (x.good ? x.weight : 0), 0);
    return Math.round((got / max) * 100);
  }

  return {
    growthScore:     score('growth'),
    qualityScore:    score('quality'),
    valueScore:      score('value'),
    durabilityScore: score('durability'),
    signals: out,
  };
}

export function diamondTotal(d: DiamondSignals): number {
  // Equal-weight composite — every angle matters.
  return Math.round((d.growthScore + d.qualityScore + d.valueScore + d.durabilityScore) / 4);
}
