'use client';

import { useState } from 'react';
import type { AnnualRow, QuarterRow } from '@/lib/sec';
import { compactNumber, formatPercent } from '@/lib/format';

type Props = {
  annual: AnnualRow[];
  quarterly: QuarterRow[];
  unit?: string | null;
  cik: string;
};

type Tab = 'annual' | 'quarterly' | 'balance' | 'cash';

function fmt(v?: number | null, unit?: string | null): string {
  if (v == null || !isFinite(v)) return '—';
  const symbol = unit === 'USD' ? '$' : unit === 'ILS' ? '₪' : '';
  return `${symbol}${compactNumber(v, { decimals: 2 })}`;
}

export function XBRLFinancials({ annual, quarterly, unit, cik }: Props) {
  const [tab, setTab] = useState<Tab>(annual.length ? 'annual' : 'quarterly');

  const tabs: { key: Tab; label: string; has: boolean }[] = [
    { key: 'annual',    label: 'Annual',     has: annual.length > 0 },
    { key: 'quarterly', label: 'Quarterly',  has: quarterly.length > 0 },
    { key: 'balance',   label: 'Balance',    has: annual.some(r => r.assets != null || r.equity != null) },
    { key: 'cash',      label: 'Cash flow',  has: annual.some(r => r.operatingCashFlow != null) },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="eyebrow text-[var(--amber-bright)]">SOURCE · SEC XBRL · EXTRACTED FROM FILINGS</div>
          <div className="font-display text-[28px] text-[var(--bone)] mt-1 tracking-[-0.025em]">
            Numbers as filed
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--bone-dim)] max-w-[640px]">
            Every value below is from the company’s own filed 10-K / 20-F / 10-Q,
            extracted by the SEC in structured XBRL. Click any row to open the source filing.
          </div>
        </div>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              disabled={!t.has}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.16em] uppercase border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                tab === t.key && t.has
                  ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
                  : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-5)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'annual'    && <AnnualTable rows={annual} unit={unit} cik={cik} />}
      {tab === 'quarterly' && <QuarterTable rows={quarterly} unit={unit} cik={cik} />}
      {tab === 'balance'   && <BalanceTable rows={annual} unit={unit} cik={cik} />}
      {tab === 'cash'      && <CashTable rows={annual} unit={unit} cik={cik} />}

      <div className="mt-3 text-[11px] text-[var(--muted)] leading-snug">
        Source data:{' '}
        <a className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)]" target="_blank" rel="noreferrer" href={`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10, '0')}.json`}>
          SEC XBRL companyfacts JSON ↗
        </a>{' '}
        · these are the exact values reported by the company on the filing dates shown.
      </div>
    </div>
  );
}

function HeadCell({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`eyebrow py-2 px-3 text-left ${right ? 'text-right' : ''}`}>{children}</th>;
}

function FilingLink({ form, accession, cik }: { form: string; accession: string; cik: string }) {
  if (!accession) return <span className="text-[var(--bone-faint)]">{form}</span>;
  const cikInt = cik.replace(/^0+/, '');
  const acc = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=${encodeURIComponent(form)}&dateb=&owner=include&count=40`;
  return (
    <a
      href={`https://www.sec.gov/Archives/edgar/data/${cikInt}/${acc}/`}
      target="_blank"
      rel="noreferrer"
      title={`Open filing ${accession}`}
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 border border-[var(--ink-5)] text-[var(--amber-bright)] hover:bg-[var(--amber)]/10"
    >
      {form} ↗
    </a>
  );
}

function AnnualTable({ rows, unit, cik }: { rows: AnnualRow[]; unit?: string | null; cik: string }) {
  if (!rows.length) return <Empty kind="annual" />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--ink-4)]">
            <HeadCell>Fiscal year</HeadCell>
            <HeadCell right>Revenue</HeadCell>
            <HeadCell right>Gross profit</HeadCell>
            <HeadCell right>Operating income</HeadCell>
            <HeadCell right>Net income</HeadCell>
            <HeadCell right>Net margin</HeadCell>
            <HeadCell>Source</HeadCell>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const margin = r.revenue && r.netIncome != null && r.revenue !== 0 ? r.netIncome / r.revenue : null;
            return (
              <tr key={r.end} className="border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)]/40">
                <td className="numeric py-2.5 px-3 text-[var(--bone)]">{r.end}</td>
                <td className="numeric py-2.5 px-3 text-right text-[var(--bone)]">{fmt(r.revenue, unit)}</td>
                <td className="numeric py-2.5 px-3 text-right text-[var(--bone-dim)]">{fmt(r.grossProfit, unit)}</td>
                <td className="numeric py-2.5 px-3 text-right text-[var(--bone-dim)]">{fmt(r.operatingIncome, unit)}</td>
                <td className="numeric py-2.5 px-3 text-right text-[var(--bone)]">{fmt(r.netIncome, unit)}</td>
                <td className="numeric py-2.5 px-3 text-right">
                  <span className={margin == null ? 'text-[var(--bone-faint)]' : margin >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}>
                    {formatPercent(margin, 1)}
                  </span>
                </td>
                <td className="py-2.5 px-3"><FilingLink form={r.form} accession={r.accession} cik={cik} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuarterTable({ rows, unit, cik }: { rows: QuarterRow[]; unit?: string | null; cik: string }) {
  if (!rows.length) return <Empty kind="quarterly" />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--ink-4)]">
            <HeadCell>Quarter end</HeadCell>
            <HeadCell>Period</HeadCell>
            <HeadCell right>Revenue</HeadCell>
            <HeadCell right>Operating income</HeadCell>
            <HeadCell right>Net income</HeadCell>
            <HeadCell>Source</HeadCell>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.end} className="border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)]/40">
              <td className="numeric py-2.5 px-3 text-[var(--bone)]">{r.end}</td>
              <td className="numeric py-2.5 px-3 text-[var(--bone-dim)]">{r.fp}</td>
              <td className="numeric py-2.5 px-3 text-right text-[var(--bone)]">{fmt(r.revenue, unit)}</td>
              <td className="numeric py-2.5 px-3 text-right text-[var(--bone-dim)]">{fmt(r.operatingIncome, unit)}</td>
              <td className="numeric py-2.5 px-3 text-right text-[var(--bone)]">{fmt(r.netIncome, unit)}</td>
              <td className="py-2.5 px-3"><FilingLink form={r.form} accession={r.accession} cik={cik} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BalanceTable({ rows, unit, cik }: { rows: AnnualRow[]; unit?: string | null; cik: string }) {
  const have = rows.filter(r => r.assets != null || r.equity != null);
  if (!have.length) return <Empty kind="balance" />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--ink-4)]">
            <HeadCell>Period</HeadCell>
            <HeadCell right>Total assets</HeadCell>
            <HeadCell right>Total liabilities</HeadCell>
            <HeadCell right>Equity</HeadCell>
            <HeadCell right>Cash &amp; equiv.</HeadCell>
            <HeadCell>Source</HeadCell>
          </tr>
        </thead>
        <tbody>
          {have.map(r => (
            <tr key={r.end} className="border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)]/40">
              <td className="numeric py-2.5 px-3 text-[var(--bone)]">{r.end}</td>
              <td className="numeric py-2.5 px-3 text-right text-[var(--bone)]">{fmt(r.assets, unit)}</td>
              <td className="numeric py-2.5 px-3 text-right text-[var(--bone-dim)]">{fmt(r.liabilities, unit)}</td>
              <td className="numeric py-2.5 px-3 text-right text-[var(--bone-dim)]">{fmt(r.equity, unit)}</td>
              <td className="numeric py-2.5 px-3 text-right text-[var(--bone-dim)]">{fmt(r.cash, unit)}</td>
              <td className="py-2.5 px-3"><FilingLink form={r.form} accession={r.accession} cik={cik} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashTable({ rows, unit, cik }: { rows: AnnualRow[]; unit?: string | null; cik: string }) {
  const have = rows.filter(r => r.operatingCashFlow != null);
  if (!have.length) return <Empty kind="cash" />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--ink-4)]">
            <HeadCell>Period</HeadCell>
            <HeadCell right>Operating cash flow</HeadCell>
            <HeadCell right>OCF / Revenue</HeadCell>
            <HeadCell>Source</HeadCell>
          </tr>
        </thead>
        <tbody>
          {have.map(r => {
            const ratio = r.revenue && r.operatingCashFlow != null && r.revenue !== 0 ? r.operatingCashFlow / r.revenue : null;
            return (
              <tr key={r.end} className="border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)]/40">
                <td className="numeric py-2.5 px-3 text-[var(--bone)]">{r.end}</td>
                <td className="numeric py-2.5 px-3 text-right text-[var(--bone)]">{fmt(r.operatingCashFlow, unit)}</td>
                <td className="numeric py-2.5 px-3 text-right">
                  <span className={ratio == null ? 'text-[var(--bone-faint)]' : ratio >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}>
                    {formatPercent(ratio, 1)}
                  </span>
                </td>
                <td className="py-2.5 px-3"><FilingLink form={r.form} accession={r.accession} cik={cik} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ kind }: { kind: string }) {
  return (
    <div className="py-12 text-center text-[12px] font-mono uppercase tracking-widest text-[var(--bone-faint)]">
      No {kind} data published in the SEC XBRL facts for this issuer.
    </div>
  );
}
