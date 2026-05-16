'use client';

import { useState, useEffect } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, CartesianGrid } from 'recharts';

type Point = { label: string; tenor: number; yield: number };

export function YieldCurveChart({ points }: { points: Point[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!points || points.length < 2) return null;
  const min = Math.min(...points.map(p => p.yield));
  const max = Math.max(...points.map(p => p.yield));
  const spread = points[points.length - 1].yield - points[0].yield;
  const inverted = spread < 0;

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="eyebrow text-[var(--amber-bright)]">US TREASURY YIELD CURVE</div>
          <div className="font-display text-[22px] text-[var(--bone)] mt-0.5 tracking-[-0.025em]">
            The shape of money
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow text-[var(--bone-faint)]">3M ↔ 30Y SPREAD</div>
          <div className={`numeric text-[18px] ${inverted ? 'text-[var(--loss)]' : 'text-[var(--gain)]'}`}>
            {(spread > 0 ? '+' : '') + (spread * 100).toFixed(0)} bps
          </div>
          {inverted && (
            <div className="text-[10px] text-[var(--loss)] uppercase tracking-[0.18em] mt-0.5">inverted · recession signal</div>
          )}
        </div>
      </div>

      <div className="h-[200px] -mx-2 w-full">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <AreaChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="yc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--amber)" stopOpacity={0.00} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--ink-4)" strokeDasharray="2 4" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                orientation="right"
                domain={[Math.max(0, min - 0.3), max + 0.3]}
                tickFormatter={v => `${v.toFixed(2)}%`}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <ReferenceLine y={0} stroke="var(--ink-5)" />
              <Tooltip
                formatter={(v) => `${Number(v).toFixed(2)}%`}
                contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--ink-5)', borderRadius: 0 }}
              />
              <Area type="monotone" dataKey="yield" stroke="var(--amber)" strokeWidth={1.8} fill="url(#yc)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 text-[11px] text-[var(--muted)] leading-snug">
        An upward-sloping curve (long &gt; short) is the normal state — investors demand a premium to lock money up longer.
        Inversion historically precedes recessions by 6-18 months.
      </div>
    </div>
  );
}
