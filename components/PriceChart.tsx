'use client';

import { useMemo, useState } from 'react';
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, CartesianGrid,
} from 'recharts';
import type { ChartPoint } from '@/lib/yahoo';

type Range = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'MAX';

type Props = {
  data?: ChartPoint[];
  currency?: string | null;
};

function trimRange(data: ChartPoint[], range: Range): ChartPoint[] {
  if (!data.length || range === 'MAX') return data;
  const last = data[data.length - 1].t;
  const months =
    range === '1M' ? 1 :
    range === '3M' ? 3 :
    range === '6M' ? 6 :
    range === '1Y' ? 12 :
    range === '3Y' ? 36 :
    /* 5Y */          60;
  const cutoff = last - months * 30 * 24 * 3600 * 1000;
  return data.filter(d => d.t >= cutoff);
}

function priceFmt(v: number, currency?: string | null): string {
  const ccy = (currency || '').toUpperCase();
  if (ccy === 'ILA') return `₪${(v / 100).toFixed(2)}`;
  if (ccy === 'USD') return `$${v.toFixed(2)}`;
  if (ccy === 'ILS') return `₪${v.toFixed(2)}`;
  return v.toFixed(2);
}

export function PriceChart({ data, currency }: Props) {
  const [range, setRange] = useState<Range>('5Y');
  const points = useMemo(() => trimRange(data ?? [], range), [data, range]);

  if (!data || data.length < 2) {
    return (
      <div className="card p-6">
        <div className="eyebrow">PRICE CHART</div>
        <div className="text-[var(--bone-faint)] mt-3 text-sm">Chart data unavailable for this listing.</div>
      </div>
    );
  }

  const first = points[0]?.c ?? 0;
  const last = points[points.length - 1]?.c ?? 0;
  const change = first ? ((last - first) / first) : 0;
  const up = change >= 0;
  const color = up ? 'var(--gain)' : 'var(--loss)';
  const min = Math.min(...points.map(p => p.c));
  const max = Math.max(...points.map(p => p.c));

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="eyebrow">PRICE · {range}</div>
          <div className="font-mono text-[28px] text-[var(--bone)] tracking-tight">
            {priceFmt(last, currency)}
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow">RANGE</div>
          <div className="numeric text-[14px]" style={{ color }}>
            {(change >= 0 ? '+' : '')}{(change * 100).toFixed(2)}%
          </div>
          <div className="numeric text-[10px] text-[var(--bone-faint)] mt-1">
            {priceFmt(min, currency)} ↔ {priceFmt(max, currency)}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        {(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'] as Range[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 text-[11px] font-mono tracking-wider border transition-colors ${
              range === r
                ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
                : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-5)]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="h-[260px] -mx-2 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <AreaChart data={points} margin={{ top: 6, right: 16, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.30} />
                <stop offset="95%" stopColor={color} stopOpacity={0.00} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--ink-4)" strokeDasharray="2 4" />
            <XAxis
              dataKey="t"
              tickFormatter={t => {
                const d = new Date(t);
                return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
              }}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              orientation="right"
              domain={['auto', 'auto']}
              tickFormatter={v => priceFmt(v, currency)}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <ReferenceLine y={first} stroke="var(--ink-5)" strokeDasharray="2 4" />
            <Tooltip
              formatter={(v) => priceFmt(typeof v === 'number' ? v : Number(v), currency)}
              labelFormatter={(t) => new Date(Number(t)).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}
              contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--ink-5)', borderRadius: 0 }}
            />
            <Area
              type="monotone"
              dataKey="c"
              stroke={color}
              strokeWidth={1.5}
              fill="url(#priceGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
