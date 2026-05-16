/**
 * Number, currency and date formatters for Israeli market data.
 *
 *   Yahoo Finance has a quirk for TASE-listed securities (currency code
 *   "ILA"): per-share *prices* are reported in agorot (1/100 ₪) but
 *   monetary *aggregates* (market cap, revenue, debt, cash, etc.) are
 *   reported in shekel. Both fields are labelled with the same `ILA`
 *   currency code. So:
 *
 *     • `normalisePriceUnit`  — divides ILA values by 100 (per-share)
 *     • `normaliseMoneyUnit` — does NOT divide ILA values (aggregates)
 *
 *   Use `formatPrice` for any per-share price (quote, day high/low, 52W
 *   high/low, prev close, book-value per share). Use `formatMoney` for
 *   everything else (cap, revenue, profit, cash, debt, dividends in $).
 */

export const ILS = '₪';
export const USD = '$';

export function currencySymbol(code?: string | null): string {
  if (!code) return '';
  const c = code.toUpperCase();
  if (c === 'USD') return USD;
  if (c === 'ILS' || c === 'ILA') return ILS;
  if (c === 'EUR') return '€';
  if (c === 'GBP') return '£';
  return c + ' ';
}

/** Used for per-share prices. ILA → ÷100 → shekel. */
export function normalisePriceUnit(value: number | null | undefined, currency?: string | null): { value: number; symbol: string; code: string } | null {
  if (value == null || !isFinite(value)) return null;
  const code = (currency || '').toUpperCase();
  if (code === 'ILA') return { value: value / 100, symbol: ILS, code: 'ILS' };
  return { value, symbol: currencySymbol(code), code: code || '' };
}

/** Used for monetary aggregates (cap, revenue, debt, cash). ILA → no conversion. */
export function normaliseMoneyUnit(value: number | null | undefined, currency?: string | null): { value: number; symbol: string; code: string } | null {
  if (value == null || !isFinite(value)) return null;
  const code = (currency || '').toUpperCase();
  const symbol = code === 'USD' ? USD : (code === 'ILA' || code === 'ILS') ? ILS : currencySymbol(code);
  return { value, symbol, code: code || '' };
}

/** @deprecated — kept for back-compat. Defaults to PRICE semantics (÷100 for ILA). */
export function normaliseToBaseUnit(value: number | null | undefined, currency?: string | null): { value: number; symbol: string; code: string } | null {
  return normalisePriceUnit(value, currency);
}

export function compactNumber(n: number | null | undefined, opts: { decimals?: number } = {}): string {
  if (n == null || !isFinite(n)) return '—';
  const decimals = opts.decimals ?? 2;
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(decimals) + 'T';
  if (abs >= 1e9)  return (n / 1e9).toFixed(decimals) + 'B';
  if (abs >= 1e6)  return (n / 1e6).toFixed(decimals) + 'M';
  if (abs >= 1e3)  return (n / 1e3).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
}

/** For monetary aggregates (market cap, revenue, debt, etc).
 *  TASE values are already in shekel — no agorot conversion. */
export function formatMoney(value: number | null | undefined, currency?: string | null, decimals = 2): string {
  const n = normaliseMoneyUnit(value, currency);
  if (!n) return '—';
  return `${n.symbol}${compactNumber(n.value, { decimals })}`;
}

export function formatPlainMoney(value: number | null | undefined, currency?: string | null, decimals = 2): string {
  const n = normaliseMoneyUnit(value, currency);
  if (!n) return '—';
  return `${n.symbol}${n.value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`;
}

/** For per-share prices — TASE values are in agorot, divide by 100. */
export function formatPrice(value: number | null | undefined, currency?: string | null, decimals = 2): string {
  const n = normalisePriceUnit(value, currency);
  if (!n) return '—';
  return `${n.symbol}${n.value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`;
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatChange(value: number | null | undefined, decimals = 2): { text: string; sign: 'up' | 'down' | 'flat' } {
  if (value == null || !isFinite(value)) return { text: '—', sign: 'flat' };
  const sign = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '–';
  return { text: `${arrow} ${(value * 100).toFixed(decimals)}%`, sign };
}

export function formatInt(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  return Math.round(value).toLocaleString();
}

export function formatRatio(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return '—';
  return value.toFixed(decimals);
}

export function formatDate(d: Date | string | number | null | undefined): string {
  if (d == null) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function relativeTime(d: Date | string | number | null | undefined): string {
  if (d == null) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d ago`;
  return formatDate(date);
}
