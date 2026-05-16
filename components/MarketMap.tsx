'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceSimulation,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';
import { scaleSqrt, scaleLog } from 'd3-scale';
import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from 'd3-hierarchy';
import { useRouter } from 'next/navigation';
import { SECTORS, SECTOR_BY_KEY, type SectorKey } from '@/lib/sectors';

export type MapDatum = {
  symbol: string;
  shortName: string;
  hebrewName?: string;
  sector: SectorKey;
  currency?: string;       // raw Yahoo code: "USD", "ILA" (TASE agorot), "ILS"
  marketCap?: number;      // in its native currency
  capUsd?: number;         // USD-normalised, used ONLY for cross-currency size scaling
  pct52w?: number | null;
  diamond?: number | null;
  pe?: number | null;
  pb?: number | null;
  price?: number | null;   // in native currency (TASE prices are in agorot)
  changePct?: number | null;
};

type Metric = 'cap' | 'diamond' | 'mom1y' | 'volatility' | 'pe';

const METRIC_LABEL: Record<Metric, string> = {
  cap:        'Market cap',
  diamond:    '◆ Diamond-Lite',
  mom1y:      '1Y momentum',
  volatility: '1Y volatility',
  pe:         '1 / P-E (cheap = big)',
};

const DETAIL_LEVELS = [
  { count: 75,  label: 'TOP 75' },
  { count: 150, label: 'TOP 150' },
  { count: 300, label: 'TOP 300' },
  { count: 600, label: 'ALL' },
];

type Node = MapDatum & SimulationNodeDatum & {
  r: number;
  rank: number;
};

type Cell = {
  key: SectorKey;
  hue: string;
  glyph: string;
  en: string;
  count: number;
  totalCap: number;
  x0: number; y0: number; x1: number; y1: number;
  cx: number; cy: number;
};

type Props = { data: MapDatum[] };

const HEADER_RESERVE = 36;   // px reserved at top of each cell for the sector header

export function MarketMap({ data }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const innerGroupRef = useRef<SVGGElement>(null);
  const [activeSectors, setActiveSectors] = useState<Set<SectorKey>>(() => new Set(SECTORS.map(s => s.key)));
  const [metric, setMetric] = useState<Metric>('cap');
  const [hover, setHover] = useState<Node | null>(null);
  const [dims, setDims] = useState({ w: 1400, h: 820 });
  const [showLabels, setShowLabels] = useState(true);
  const [detail, setDetail] = useState<number>(150);
  const [search, setSearch] = useState('');
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Mark as mounted — we defer SVG render to the client to avoid SSR/CSR
  // float-coordinate hydration mismatches that would silently disable useEffect.
  useEffect(() => { setMounted(true); }, []);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setDims({ w: Math.max(700, r.width), h: Math.max(480, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Sector summary (count + total cap) — drives cell sizes ─────
  const sectorSummary = useMemo(() => {
    const map = new Map<SectorKey, { count: number; totalCap: number }>();
    for (const d of data) {
      const entry = map.get(d.sector) ?? { count: 0, totalCap: 0 };
      entry.count += 1;
      entry.totalCap += d.capUsd ?? 0;
      map.set(d.sector, entry);
    }
    return map;
  }, [data]);

  // ── Treemap layout for the active sectors ──────────────────────
  //
  //   Squarified treemap: each sector gets a rectangle whose area is
  //   proportional to its company count. This makes the visual structure
  //   of the market obvious — Industrials & Real Estate are wide, Defense
  //   & Cybersecurity are narrow. Inner padding leaves a clear gutter
  //   between sectors so the eye can read each cluster cleanly.
  const cells = useMemo<Map<SectorKey, Cell>>(() => {
    const activeList = SECTORS.filter(s => activeSectors.has(s.key));
    if (activeList.length === 0) return new Map();

    const children = activeList.map(s => {
      const sum = sectorSummary.get(s.key);
      return {
        ...s,
        count: sum?.count ?? 0,
        totalCap: sum?.totalCap ?? 0,
        // Floor weight so even small sectors get a visible cell
        weight: Math.max(6, Math.sqrt(sum?.count ?? 1) * 4),
      };
    });

    const root = hierarchy<{ children: typeof children }>({ children } as { children: typeof children })
      .sum((d) => (d as unknown as { weight?: number }).weight ?? 1)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const layout = treemap<{ children: typeof children }>()
      .size([dims.w, dims.h])
      .paddingInner(14)
      .paddingOuter(4)
      .tile(treemapSquarify);
    layout(root);

    const out = new Map<SectorKey, Cell>();
    for (const leafNode of root.leaves()) {
      const leaf = leafNode as HierarchyRectangularNode<unknown>;
      const d = leaf.data as unknown as typeof children[number];
      const x0 = leaf.x0;
      const y0 = leaf.y0;
      const x1 = leaf.x1;
      const y1 = leaf.y1;
      const innerY0 = y0 + HEADER_RESERVE;     // reserve top of cell for header
      out.set(d.key, {
        key: d.key,
        hue: d.hue,
        glyph: d.glyph,
        en: d.en,
        count: d.count,
        totalCap: d.totalCap,
        x0, y0, x1, y1,
        cx: (x0 + x1) / 2,
        cy: (innerY0 + y1) / 2,
      });
    }
    return out;
  }, [activeSectors, sectorSummary, dims.w, dims.h]);

  // ── Helper: metric value for sizing ───────────────────────────
  function valueFor(d: MapDatum, m: Metric): number {
    if (m === 'cap')        return Math.max(1, d.capUsd ?? d.marketCap ?? 1);
    if (m === 'diamond')    return Math.max(1, (d.diamond ?? 0) + 5);
    if (m === 'mom1y')      return Math.max(0.0001, (d.pct52w ?? 0) + 1);
    if (m === 'volatility') return Math.max(0.0001, Math.abs(d.pct52w ?? 0));
    if (m === 'pe') {
      const pe = d.pe ?? 999;
      return pe <= 0 ? 0.5 : 1 / pe;
    }
    return 1;
  }

  // ── Visible nodes — top N by metric, then placed inside their cell ──
  const sectorFiltered = useMemo(
    () => data.filter(d => activeSectors.has(d.sector)),
    [data, activeSectors],
  );

  const visibleNodes = useMemo(() => {
    if (sectorFiltered.length === 0) return [] as Node[];

    const ranked = [...sectorFiltered]
      .map(d => ({ d, v: valueFor(d, metric) }))
      .sort((a, b) => b.v - a.v);
    const top = ranked.slice(0, Math.min(detail, ranked.length));
    if (!top.length) return [] as Node[];

    const values = top.map(x => x.v);
    const min = Math.max(0.0001, Math.min(...values));
    const max = Math.max(min * 1.001, ...values);
    const scale = metric === 'cap'
      ? scaleLog().domain([min, max]).range([6, 36])
      : scaleSqrt().domain([min, max]).range([5, 36]);

    return top.map((x, i): Node => {
      const cell = cells.get(x.d.sector);
      const cx = cell?.cx ?? dims.w / 2;
      const cy = cell?.cy ?? dims.h / 2;
      const seed = (x.d.symbol.charCodeAt(0) * 13 + x.d.symbol.length) % 31;
      return {
        ...x.d,
        r: Math.max(4, scale(x.v) ?? 6),
        x: cx + (seed - 15) * 1.4,
        y: cy + ((seed * 7) % 23 - 11),
        rank: i,
      };
    });
  }, [sectorFiltered, metric, detail, cells, dims.w, dims.h]);

  // ── Force simulation with per-cell bounds ─────────────────────
  useEffect(() => {
    if (!visibleNodes.length || !innerGroupRef.current || cells.size === 0) return;

    const cellLookup = cells;
    const sim = forceSimulation(visibleNodes)
      .alphaDecay(0.04)
      .force('x', forceX<Node>().strength(0.22).x(d => cellLookup.get(d.sector)?.cx ?? 0))
      .force('y', forceY<Node>().strength(0.22).y(d => cellLookup.get(d.sector)?.cy ?? 0))
      .force('collide', forceCollide<Node>().radius(d => d.r + 1.5).strength(0.95))
      .on('tick', () => {
        // Clamp each node inside its sector cell (with header reserve at top).
        for (const n of visibleNodes) {
          const cell = cellLookup.get(n.sector);
          if (!cell) continue;
          const padTop = HEADER_RESERVE + 6;
          const pad = 6;
          if (n.x != null) {
            n.x = Math.max(cell.x0 + n.r + pad,
                           Math.min(cell.x1 - n.r - pad, n.x));
          }
          if (n.y != null) {
            n.y = Math.max(cell.y0 + n.r + padTop,
                           Math.min(cell.y1 - n.r - pad, n.y));
          }
        }
        const groups = innerGroupRef.current!.querySelectorAll<SVGGElement>('g[data-i]');
        for (let i = 0; i < visibleNodes.length; i++) {
          const n = visibleNodes[i];
          const g = groups[i];
          if (!g) continue;
          g.setAttribute('transform', `translate(${n.x ?? 0}, ${n.y ?? 0})`);
        }
      });
    return () => { sim.stop(); };
  }, [visibleNodes, cells]);

  // Sector toggle: click = isolate, click again = restore all
  function clickSector(k: SectorKey) {
    setActiveSectors(prev => {
      const isIsolated = prev.size === 1 && prev.has(k);
      if (isIsolated) return new Set(SECTORS.map(s => s.key));
      if (prev.size === SECTORS.length) return new Set([k]);
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      if (next.size === 0) return new Set([k]);
      return next;
    });
  }

  // Search highlight
  const searchSet = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return null;
    return new Set(
      visibleNodes
        .filter(n =>
          n.symbol.toUpperCase().includes(q) ||
          n.shortName.toUpperCase().includes(q) ||
          (n.hebrewName ?? '').includes(search.trim()),
        )
        .map(n => n.symbol),
    );
  }, [search, visibleNodes]);

  // Zoom / pan
  //
  //   React attaches `onWheel` as a passive listener since React 17, so
  //   `event.preventDefault()` from a synthetic handler is silently ignored
  //   and the wheel event bubbles up to scroll the page. We instead attach a
  //   non-passive native listener via useEffect, which is the documented
  //   workaround. Also intercepts ctrl/⌘+wheel (Mac pinch zoom) so the
  //   gesture zooms the map, not the browser.
  // ── Pan clamping ─────────────────────────────────────────────
  //
  //   Without this, dragging the layout at any zoom moves the treemap off
  //   the canvas and shows black void around it. With it, the content
  //   edges are pinned to the viewport edges: at k = 1 there is no panning
  //   at all, and at k > 1 you can only pan within the area the content
  //   actually covers. The user always sees treemap, never empty space.
  function clampTransform(t: { x: number; y: number; k: number }) {
    const k = Math.max(1, Math.min(8, t.k));            // can't zoom out smaller than 1×
    if (k <= 1) return { x: 0, y: 0, k: 1 };            // at 1× pan is locked
    const minX = dims.w * (1 - k);                       // negative
    const minY = dims.h * (1 - k);
    return {
      x: Math.min(0, Math.max(minX, t.x)),
      y: Math.min(0, Math.max(minY, t.y)),
      k,
    };
  }

  useEffect(() => {
    if (!mounted) return;
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = svg.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * dims.w;
      const my = ((e.clientY - rect.top) / rect.height) * dims.h;
      setTransform(t => {
        // Gentler steps so it's easy to land on the zoom level you want.
        // Mac trackpad pinch (ctrlKey === true) emits many small events,
        // we use a smaller step there for finer control.
        const base = e.ctrlKey ? 0.04 : 0.06;
        const factor = e.deltaY < 0 ? 1 + base : 1 - base;
        const rawK = t.k * factor;
        const k = Math.max(1, Math.min(8, rawK));
        if (k === t.k) return t;
        const scaleRatio = k / t.k;
        const next = { x: mx - (mx - t.x) * scaleRatio, y: my - (my - t.y) * scaleRatio, k };
        return clampTransform(next);
      });
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [mounted, dims.w, dims.h]);

  // Also block page-level pinch-zoom and arrow-wheel scroll on the wrapper
  // when the cursor is anywhere over the map container, so even if the cursor
  // is hovering a chip/header above the SVG the page doesn't unexpectedly scroll.
  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const block = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener('wheel', block, { passive: false });
    return () => el.removeEventListener('wheel', block);
  }, [mounted]);
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if ((e.target as Element).closest('g[data-i]')) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.x) / rect.width) * dims.w;
    const dy = ((e.clientY - dragRef.current.y) / rect.height) * dims.h;
    setTransform(t => clampTransform({ ...t, x: dragRef.current!.tx + dx, y: dragRef.current!.ty + dy }));
  }
  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = null;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  function resetView() { setTransform({ x: 0, y: 0, k: 1 }); }

  const totalCounts = useMemo(() => {
    const m = new Map<SectorKey, number>();
    for (const d of data) m.set(d.sector, (m.get(d.sector) ?? 0) + 1);
    return m;
  }, [data]);

  const labelVisibleRadius = (r: number) => r * transform.k;
  const isolated = activeSectors.size === 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="relative flex-1 min-w-[240px] max-w-[420px]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Highlight ticker · name · Hebrew …"
            className="w-full bg-[var(--ink-2)] border border-[var(--ink-4)] focus:border-[var(--amber)] outline-none px-3 py-2 text-[13px] text-[var(--bone)] font-mono"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--bone-faint)] hover:text-[var(--bone)] text-[12px]"
              aria-label="Clear search"
            >×</button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="eyebrow text-[var(--bone-faint)] shrink-0">SIZE BY</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(METRIC_LABEL) as Metric[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2.5 py-1 text-[10.5px] font-mono uppercase tracking-[0.14em] border transition-colors ${
                  metric === m
                    ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
                    : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-5)]'
                }`}
              >{METRIC_LABEL[m]}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="eyebrow text-[var(--bone-faint)] shrink-0">DETAIL</span>
          {DETAIL_LEVELS.map(level => (
            <button
              key={level.count}
              onClick={() => setDetail(level.count)}
              className={`px-2 py-1 text-[10.5px] font-mono uppercase tracking-[0.14em] border transition-colors ${
                detail === level.count
                  ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
                  : 'border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-5)]'
              }`}
            >{level.label}</button>
          ))}
          <button
            onClick={() => setShowLabels(s => !s)}
            className={`px-2.5 py-1 text-[10.5px] font-mono uppercase tracking-[0.14em] border ${showLabels ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10' : 'border-[var(--ink-4)] text-[var(--bone-faint)]'}`}
          >LABELS</button>
        </div>
      </div>

      {/* Sector chips */}
      <div className="flex flex-wrap gap-1.5 px-1 items-center">
        <button
          onClick={() => setActiveSectors(new Set(SECTORS.map(s => s.key)))}
          className="px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] border border-[var(--ink-4)] text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--amber)]"
        >ALL</button>
        {SECTORS.map(s => {
          const on = activeSectors.has(s.key);
          const isolatedHere = activeSectors.size === 1 && on;
          return (
            <button
              key={s.key}
              onClick={() => clickSector(s.key)}
              title={isolatedHere ? 'Click again to show all sectors' : 'Click to isolate'}
              className={`flex items-center gap-1.5 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] border transition-colors ${
                isolatedHere ? 'bg-[var(--amber)]/10' : ''
              } ${on ? 'text-[var(--bone)]' : 'text-[var(--bone-faint)]/40 line-through'}`}
              style={{ borderColor: on ? s.hue : 'var(--ink-4)' }}
            >
              <span aria-hidden style={{ color: on ? s.hue : 'var(--bone-faint)' }}>{s.glyph}</span>
              {s.en}
              <span className="text-[9.5px] text-[var(--bone-faint)]">·{totalCounts.get(s.key) ?? 0}</span>
            </button>
          );
        })}
        <span className="ml-auto eyebrow text-[var(--bone-faint)]">
          {visibleNodes.length} of {sectorFiltered.length}
          {isolated && (
            <button onClick={() => setActiveSectors(new Set(SECTORS.map(s => s.key)))} className="ml-3 text-[var(--amber-bright)] hover:text-[var(--bone)]">↶ SHOW ALL</button>
          )}
        </span>
      </div>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="relative border border-[var(--ink-4)] bg-[var(--ink-0)] overflow-hidden select-none"
        style={{ height: 820 }}
      >
        {!mounted && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--bone-faint)] text-[11px] font-mono uppercase tracking-widest">
            Laying out the market…
          </div>
        )}
        {mounted && <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none', cursor: dragRef.current ? 'grabbing' : 'grab' }}
        >
          <g
            ref={innerGroupRef}
            transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
          >
            {/* Sector cells — backgrounds, borders, headers */}
            {[...cells.values()].map(c => {
              const w = c.x1 - c.x0;
              const h = c.y1 - c.y0;
              return (
                <g key={c.key} pointerEvents="none">
                  <rect
                    x={c.x0}
                    y={c.y0}
                    width={w}
                    height={h}
                    fill={c.hue}
                    fillOpacity={0.05}
                    stroke={c.hue}
                    strokeOpacity={0.35}
                    strokeWidth={1.2 / transform.k}
                  />
                  {/* Header bar */}
                  <rect
                    x={c.x0}
                    y={c.y0}
                    width={w}
                    height={HEADER_RESERVE - 6}
                    fill={c.hue}
                    fillOpacity={0.10}
                  />
                  <text
                    x={c.x0 + 10}
                    y={c.y0 + 18}
                    style={{
                      fill: c.hue,
                      fontFamily: 'var(--font-mono)',
                      fontSize: Math.min(13, Math.max(10, w / 22)) / transform.k,
                      fontWeight: 700,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.glyph}  {c.en}
                  </text>
                  <text
                    x={c.x1 - 10}
                    y={c.y0 + 18}
                    textAnchor="end"
                    style={{
                      fill: 'var(--bone-faint)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: Math.min(11, Math.max(9, w / 28)) / transform.k,
                      letterSpacing: '0.12em',
                    }}
                  >
                    {c.count} · ${(c.totalCap / 1e9).toFixed(c.totalCap < 10e9 ? 1 : 0)}B
                  </text>
                  <line
                    x1={c.x0}
                    y1={c.y0 + HEADER_RESERVE - 6}
                    x2={c.x1}
                    y2={c.y0 + HEADER_RESERVE - 6}
                    stroke={c.hue}
                    strokeOpacity={0.4}
                    strokeWidth={0.8 / transform.k}
                  />
                </g>
              );
            })}

            {/* Bubbles */}
            {visibleNodes.map((n, i) => {
              const hue = SECTOR_BY_KEY[n.sector]?.hue ?? '#d4a574';
              const isHover = hover?.symbol === n.symbol;
              const dim = searchSet ? !searchSet.has(n.symbol) : false;
              const opacity = dim ? 0.10 : (isHover ? 0.95 : 0.62);
              const stroke = isHover ? 'var(--bone)' : hue;
              const strokeOp = dim ? 0.15 : (isHover ? 1 : 0.75);
              const visualR = labelVisibleRadius(n.r);
              const wantLabel =
                showLabels && !dim && (
                  visualR >= 11 ||
                  (n.rank < 25 && visualR >= 8)
                );
              return (
                <g
                  key={n.symbol}
                  data-i={i}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(prev => prev?.symbol === n.symbol ? null : prev)}
                  onClick={() => router.push(`/c/${encodeURIComponent(n.symbol)}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={n.r}
                    fill={hue}
                    fillOpacity={opacity}
                    stroke={stroke}
                    strokeOpacity={strokeOp}
                    strokeWidth={isHover ? 1.8 / transform.k : 0.9 / transform.k}
                  />
                  {wantLabel && (
                    <text
                      textAnchor="middle"
                      dy="0.32em"
                      style={{
                        fill: 'var(--ink-0)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        fontSize: Math.max(8, Math.min(14, n.r * 0.55)) / transform.k,
                        pointerEvents: 'none',
                      }}
                    >
                      {n.symbol.replace('.TA', '')}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>}

        {/* Zoom controls — zoom toward viewport center so it feels predictable */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 font-mono text-[12px]">
          <button
            onClick={() => setTransform(t => {
              const k = Math.min(8, t.k * 1.20);
              const cx = dims.w / 2, cy = dims.h / 2;
              const r = k / t.k;
              return clampTransform({ x: cx - (cx - t.x) * r, y: cy - (cy - t.y) * r, k });
            })}
            className="w-8 h-8 border border-[var(--ink-4)] bg-[var(--ink-1)]/85 backdrop-blur text-[var(--bone)] hover:border-[var(--amber)]"
            aria-label="Zoom in"
          >＋</button>
          <button
            onClick={() => setTransform(t => {
              const k = Math.max(1, t.k / 1.20);
              const cx = dims.w / 2, cy = dims.h / 2;
              const r = k / t.k;
              return clampTransform({ x: cx - (cx - t.x) * r, y: cy - (cy - t.y) * r, k });
            })}
            className="w-8 h-8 border border-[var(--ink-4)] bg-[var(--ink-1)]/85 backdrop-blur text-[var(--bone)] hover:border-[var(--amber)]"
            aria-label="Zoom out"
          >−</button>
          <button
            onClick={resetView}
            className="w-8 h-8 border border-[var(--ink-4)] bg-[var(--ink-1)]/85 backdrop-blur text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--amber)] text-[10px]"
            aria-label="Reset"
            title="Reset view"
          >⤾</button>
        </div>
        <div className="absolute bottom-3 right-3 font-mono text-[10px] text-[var(--bone-faint)] bg-[var(--ink-1)]/70 backdrop-blur px-2 py-1 border border-[var(--ink-4)]">
          ZOOM · {(transform.k * 100).toFixed(0)}%  ·  WHEEL · DRAG
        </div>

        {/* Tooltip — clearly labelled rows so the numbers aren't mysterious */}
        {hover && (() => {
          const sec = SECTOR_BY_KEY[hover.sector];
          // Sanity-cap absurd 1Y values (data anomalies from splits / IPO rebasing).
          const pct1y = hover.pct52w != null && Math.abs(hover.pct52w) < 50
            ? hover.pct52w
            : null;
          return (
            <div
              className="absolute card p-3 text-[12px] pointer-events-none border border-[var(--amber)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              style={{
                left:  Math.min(dims.w - 290, Math.max(8, (hover.x ?? 0) * transform.k + transform.x + 14)),
                top:   Math.max(8, (hover.y ?? 0) * transform.k + transform.y - 90),
                width: 280,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] text-[var(--bone)]">{hover.symbol}</span>
                {hover.diamond != null && hover.diamond > 0 && (
                  <span
                    title="Diamond-Lite composite score 0–100. Higher = stronger momentum/value/quality/size mix."
                    className="font-mono text-[10px] border border-[var(--amber)] text-[var(--amber-bright)] px-1.5"
                  >◆ {hover.diamond}/100</span>
                )}
              </div>
              <div className="font-display text-[15px] text-[var(--bone)] tracking-[-0.02em] mt-0.5 truncate">
                {hover.shortName}
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--bone-faint)] mt-0.5">
                {sec?.en}
              </div>

              <table className="w-full mt-2 text-[11px] font-mono">
                <tbody>
                  {hover.price != null && hover.price > 0 && (
                    <Row label="Last price" value={fmtPrice(hover.price, hover.currency)} />
                  )}
                  {hover.changePct != null && Math.abs(hover.changePct) < 2 && (
                    <Row label="Today"
                         value={`${hover.changePct >= 0 ? '+' : ''}${(hover.changePct * 100).toFixed(2)}%`}
                         tone={hover.changePct >= 0 ? 'gain' : 'loss'} />
                  )}
                  {pct1y != null && (
                    <Row label="1-yr change"
                         value={`${pct1y >= 0 ? '+' : ''}${(pct1y * 100).toFixed(1)}%`}
                         tone={pct1y >= 0 ? 'gain' : 'loss'} />
                  )}
                  {hover.marketCap != null && hover.marketCap > 0 && (
                    <Row label="Market cap" value={fmtCap(hover.marketCap, hover.currency)} />
                  )}
                  {hover.pe != null && hover.pe > 0 && hover.pe < 200 && (
                    <Row label="P/E (trailing)" value={`${hover.pe.toFixed(1)}×`} />
                  )}
                  {hover.pb != null && hover.pb > 0 && hover.pb < 100 && (
                    <Row label="P/Book" value={`${hover.pb.toFixed(2)}×`} />
                  )}
                </tbody>
              </table>

              <div className="mt-2 pt-2 border-t border-[var(--ink-4)] text-[10px] uppercase tracking-[0.14em] text-[var(--amber-bright)]">
                Click bubble to open full breakdown →
              </div>
            </div>
          );
        })()}

        {/* Empty state */}
        {visibleNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--bone-faint)] text-[12px] font-mono uppercase tracking-widest">
            No bubbles match this filter
          </div>
        )}
      </div>

      <div className="text-[11px] text-[var(--muted)] leading-snug px-1">
        Each <span className="text-[var(--bone)]">cell</span> is a sector — its area is proportional to the number of listed companies, so you instantly see which segments dominate TASE.
        Bubbles inside are sized by <span className="text-[var(--bone)]">{METRIC_LABEL[metric].toLowerCase()}</span>.
        Wheel / drag to navigate. Click a sector chip to isolate it (the cell expands to the full canvas).
      </div>
    </div>
  );
}

/** Currency-formatting helpers.
 *
 *  Yahoo's TASE quirk that bites here: when Yahoo reports `currency: "ILA"`
 *  for a TASE listing, the *price* field is in agorot (₪/100) but the
 *  *marketCap* field is in shekel. They labelled both with the same code.
 *  So `fmtPrice` does the agorot→shekel divide; `fmtCap` does NOT.
 */
function fmtCap(v: number, ccy?: string): string {
  const c = (ccy ?? '').toUpperCase();
  const symbol = c === 'USD' ? '$' : c === 'ILA' || c === 'ILS' ? '₪' : '';
  // marketCap in ILA is already in shekel (Yahoo quirk) — no conversion.
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${symbol}${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${symbol}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${symbol}${(v / 1e3).toFixed(1)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

function fmtPrice(v: number, ccy?: string): string {
  const c = (ccy ?? '').toUpperCase();
  const symbol = c === 'USD' ? '$' : c === 'ILA' || c === 'ILS' ? '₪' : '';
  // price in ILA is in agorot (1/100 ₪) — divide by 100 for display.
  const adjusted = c === 'ILA' ? v / 100 : v;
  const decimals = adjusted >= 100 ? 2 : adjusted >= 10 ? 2 : 3;
  return `${symbol}${adjusted.toFixed(decimals)}`;
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'gain' | 'loss' }) {
  const cls =
    tone === 'gain' ? 'text-[var(--gain)]' :
    tone === 'loss' ? 'text-[var(--loss)]' :
    'text-[var(--bone)]';
  return (
    <tr>
      <td className="text-[var(--bone-faint)] pr-3 py-[1.5px] whitespace-nowrap">{label}</td>
      <td className={`text-right py-[1.5px] ${cls}`}>{value}</td>
    </tr>
  );
}
