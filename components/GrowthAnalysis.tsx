'use client';

import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Cell,
} from 'recharts';
import type { AnnualRow } from '@/lib/sec';
import type { GrowthFundamentals } from '@/lib/growth';

type Props = {
  rows: AnnualRow[];
  fundamentals: GrowthFundamentals;
  unit?: string | null;
};

type Series = 'revenue' | 'netIncome' | 'operatingIncome' | 'fcf';

const SERIES_META: Record<Series, { label: string; key: keyof AnnualRow; hue: string }> = {
  revenue:         { label: 'Revenue',          key: 'revenue',          hue: 'var(--amber)' },
  netIncome:       { label: 'Net income',       key: 'netIncome',        hue: 'var(--gain)' },
  operatingIncome: { label: 'Operating income', key: 'operatingIncome',  hue: 'var(--signal)' },
  fcf:             { label: 'Operating CF',     key: 'operatingCashFlow',hue: 'var(--highlight)' },
};

function fmt(v: number | null | undefined, unit?: string | null): string {
  if (v == null || !isFinite(v)) return '—';
  const symbol = unit === 'USD' ? '$' : unit === 'ILS' ? '₪' : '';
  const a = Math.abs(v);
  if (a >= 1e9) return `${symbol}${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${symbol}${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${symbol}${(v / 1e3).toFixed(0)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

function pct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return `${(v * 100).toFixed(decimals)}%`;
}

export function GrowthAnalysis({ rows, fundamentals, unit }: Props) {
  const [series, setSeries] = useState<Series>('revenue');

  const chartData = useMemo(() => {
    return rows.map(r => ({
      year: r.end.slice(0, 4),
      revenue:         r.revenue        ?? null,
      netIncome:       r.netIncome      ?? null,
      operatingIncome: r.operatingIncome?? null,
      fcf:             r.operatingCashFlow ?? null,
    }));
  }, [rows]);

  const meta = SERIES_META[series];

  // Year-over-year growth bars for the selected series
  const yoyData = useMemo(() => {
    const out: { year: string; growth: number | null }[] = [];
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1][meta.key] as number | undefined;
      const curr = rows[i][meta.key] as number | undefined;
      const g = prev != null && curr != null && prev !== 0 ? (curr - prev) / Math.abs(prev) : null;
      out.push({ year: rows[i].end.slice(0, 4), growth: g });
    }
    return out;
  }, [rows, meta.key]);

  const cagrCard = (label: string, value?: number) => (
    <div className="bg-[var(--ink-2)] p-3">
      <div className="eyebrow">{label}</div>
      <div className={`numeric text-[20px] mt-1 ${value == null ? 'text-[var(--bone-faint)]' : value >= 0.10 ? 'text-[var(--gain)]' : value < 0 ? 'text-[var(--loss)]' : 'text-[var(--bone)]'}`}>
        {pct(value)}
      </div>
    </div>
  );

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="eyebrow text-[var(--amber-bright)]">5-YEAR GROWTH · COMPOUND</div>
          <div className="font-display text-[28px] text-[var(--bone)] mt-1 tracking-[-0.025em]">
            How fast it is actually compounding
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--bone-dim)] max-w-[640px]">
            Multi-year compound annual growth rates extracted from the company’s filed
            10-K / 20-F. Diamond candidates need sustained growth — flashy single
            years can be noise.
          </div>
        </div>
        <div className="flex gap-1">
          {(Object.keys(SERIES_META) as Series[]).map(k => (
            <button
              key={k}
              onClick={() => setSeries(k)}
              className={`px-3 py-1.5 text-[11px] font-mono tracking-[0.16em] uppercase border transition-colors ${
                series === k
                  ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
                  : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-5)]'
              }`}
            >
              {SERIES_META[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* CAGR readouts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)] mb-5">
        {cagrCard('REVENUE · 3y CAGR',     fundamentals.revenueCagr3y)}
        {cagrCard('REVENUE · 5y CAGR',     fundamentals.revenueCagr5y)}
        {cagrCard('NET INCOME · 3y CAGR',  fundamentals.netIncomeCagr3y)}
        {cagrCard('OPERATING CF · 3y CAGR',fundamentals.fcfCagr3y)}
      </div>

      {/* Series chart */}
      <div className="h-[260px] -mx-2 mb-4 w-full">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id={`g-${series}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={meta.hue} stopOpacity={0.35} />
                <stop offset="95%" stopColor={meta.hue} stopOpacity={0.00} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--ink-4)" strokeDasharray="2 4" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              orientation="right"
              tickFormatter={v => fmt(v, unit)}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              formatter={(v) => fmt(Number(v), unit)}
              contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--ink-5)', borderRadius: 0 }}
            />
            <Area type="monotone" dataKey={series} stroke={meta.hue} strokeWidth={1.5} fill={`url(#g-${series})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* YoY growth bars */}
      <div className="eyebrow mb-2">{meta.label.toUpperCase()} · YEAR-OVER-YEAR GROWTH</div>
      <div className="h-[140px] -mx-2 w-full">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <BarChart data={yoyData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--ink-4)" strokeDasharray="2 4" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              orientation="right"
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
              contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--ink-5)', borderRadius: 0 }}
            />
            <Bar dataKey="growth">
              {yoyData.map((d, i) => (
                <Cell key={i} fill={d.growth != null && d.growth >= 0 ? 'var(--gain)' : 'var(--loss)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Margin context */}
      {(fundamentals.grossMargin != null || fundamentals.operatingMargin != null) && (
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
          <MarginCell label="GROSS MARGIN"     value={fundamentals.grossMargin}     traj={fundamentals.grossMarginTrajectory} />
          <MarginCell label="OPERATING MARGIN" value={fundamentals.operatingMargin} traj={fundamentals.operatingMarginTrajectory} />
          <MarginCell label="NET MARGIN"       value={fundamentals.netMargin}       traj={fundamentals.netMarginTrajectory} />
          <MarginCell label="FCF MARGIN"       value={fundamentals.fcfMargin}       traj={fundamentals.fcfMarginTrajectory} />
        </div>
      )}
    </div>
  );
}

function MarginCell({ label, value, traj }: { label: string; value?: number; traj?: 'expanding' | 'flat' | 'contracting' | null }) {
  const arrow = traj === 'expanding' ? '↑' : traj === 'contracting' ? '↓' : traj === 'flat' ? '→' : '';
  const color = value == null ? 'text-[var(--bone-faint)]'
    : value >= 0.20 ? 'text-[var(--gain)]'
    : value >= 0.10 ? 'text-[var(--bone)]'
    : value >= 0 ? 'text-[var(--bone-dim)]'
    : 'text-[var(--loss)]';
  return (
    <div className="bg-[var(--ink-2)] p-3">
      <div className="eyebrow">{label}</div>
      <div className={`numeric text-[18px] mt-1 ${color}`}>{pct(value)}</div>
      {traj && (
        <div className={`numeric text-[11px] mt-1 ${
          traj === 'expanding' ? 'text-[var(--gain)]' :
          traj === 'contracting' ? 'text-[var(--loss)]' :
          'text-[var(--bone-faint)]'
        }`}>
          {arrow} {traj === 'expanding' ? 'expanding' : traj === 'contracting' ? 'contracting' : 'flat'}
        </div>
      )}
    </div>
  );
}
