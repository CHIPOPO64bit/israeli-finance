'use client';

import { useState } from 'react';
import type { QuarterPoint, BalanceSheetPoint } from '@/lib/yahoo';
import { formatMoney, formatPercent } from '@/lib/format';

type Props = {
  annual?: QuarterPoint[];
  quarterly?: QuarterPoint[];
  balance?: BalanceSheetPoint[];
  cash?: { date: string; freeCashFlow?: number | null; operatingCashFlow?: number | null; capEx?: number | null }[];
  currency?: string | null;
};

type Tab = 'annual' | 'quarterly' | 'balance' | 'cash';

export function FinancialsTable({ annual, quarterly, balance, cash, currency }: Props) {
  const [tab, setTab] = useState<Tab>(annual && annual.length ? 'annual' : 'quarterly');

  const tabs: { key: Tab; label: string; has: boolean }[] = [
    { key: 'annual',    label: 'Annual',    has: !!(annual?.length) },
    { key: 'quarterly', label: 'Quarterly', has: !!(quarterly?.length) },
    { key: 'balance',   label: 'Balance',   has: !!(balance?.length) },
    { key: 'cash',      label: 'Cash Flow', has: !!(cash?.length) },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="eyebrow">FINANCIALS · AS FILED</div>
          <div className="font-display text-[26px] text-[var(--bone)] mt-1 tracking-[-0.025em]">The reports themselves</div>
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

      {tab === 'annual'    && <PnLTable rows={annual?.slice(-6) ?? []} currency={currency} />}
      {tab === 'quarterly' && <PnLTable rows={quarterly?.slice(-8) ?? []} currency={currency} />}
      {tab === 'balance'   && <BalanceTable rows={balance?.slice(-6) ?? []} currency={currency} />}
      {tab === 'cash'      && <CashTable rows={cash?.slice(-6) ?? []} currency={currency} />}
    </div>
  );
}

function HeadCell({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`eyebrow py-2 px-3 text-left ${right ? 'text-right' : ''}`}>{children}</th>;
}
function Cell({ children, right = false, accent = false }: { children: React.ReactNode; right?: boolean; accent?: boolean }) {
  return (
    <td className={`numeric py-2.5 px-3 ${right ? 'text-right' : ''} ${accent ? 'text-[var(--bone)]' : 'text-[var(--bone-dim)]'}`}>
      {children}
    </td>
  );
}

function PnLTable({ rows, currency }: { rows: QuarterPoint[]; currency?: string | null }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--ink-4)]">
            <HeadCell>Period</HeadCell>
            <HeadCell right>Revenue</HeadCell>
            <HeadCell right>Gross profit</HeadCell>
            <HeadCell right>Operating income</HeadCell>
            <HeadCell right>Net income</HeadCell>
            <HeadCell right>Net margin</HeadCell>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const margin = r.revenue && r.netIncome != null && r.revenue !== 0 ? r.netIncome / r.revenue : null;
            return (
              <tr key={r.date} className="border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)]/40">
                <Cell accent>{r.date}</Cell>
                <Cell right accent>{formatMoney(r.revenue, currency)}</Cell>
                <Cell right>{formatMoney(r.grossProfit, currency)}</Cell>
                <Cell right>{formatMoney(r.operatingIncome, currency)}</Cell>
                <Cell right accent>{formatMoney(r.netIncome, currency)}</Cell>
                <Cell right>
                  <span className={
                    margin == null ? '' :
                    margin >= 0 ? 'text-[var(--gain)]' : 'text-[var(--loss)]'
                  }>{formatPercent(margin, 1)}</span>
                </Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BalanceTable({ rows, currency }: { rows: BalanceSheetPoint[]; currency?: string | null }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--ink-4)]">
            <HeadCell>Period</HeadCell>
            <HeadCell right>Total assets</HeadCell>
            <HeadCell right>Total liabilities</HeadCell>
            <HeadCell right>Equity</HeadCell>
            <HeadCell right>Cash & equiv.</HeadCell>
            <HeadCell right>Total debt</HeadCell>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.date} className="border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)]/40">
              <Cell accent>{r.date}</Cell>
              <Cell right accent>{formatMoney(r.totalAssets, currency)}</Cell>
              <Cell right>{formatMoney(r.totalLiabilities, currency)}</Cell>
              <Cell right>{formatMoney(r.totalEquity, currency)}</Cell>
              <Cell right>{formatMoney(r.cashAndEquivalents, currency)}</Cell>
              <Cell right>{formatMoney(r.totalDebt, currency)}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashTable({ rows, currency }: { rows: { date: string; freeCashFlow?: number | null; operatingCashFlow?: number | null; capEx?: number | null }[]; currency?: string | null }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--ink-4)]">
            <HeadCell>Period</HeadCell>
            <HeadCell right>Operating CF</HeadCell>
            <HeadCell right>Capex</HeadCell>
            <HeadCell right>Free cash flow</HeadCell>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.date} className="border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)]/40">
              <Cell accent>{r.date}</Cell>
              <Cell right>{formatMoney(r.operatingCashFlow, currency)}</Cell>
              <Cell right>{formatMoney(r.capEx, currency)}</Cell>
              <Cell right accent>{formatMoney(r.freeCashFlow, currency)}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <div className="py-12 text-center text-[12px] font-mono uppercase tracking-widest text-[var(--bone-faint)]">
      No data for this section in the current filings window.
    </div>
  );
}
