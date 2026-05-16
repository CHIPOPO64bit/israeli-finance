import type { SectorReadingGuide } from '@/lib/flags';

type Props = {
  guide: SectorReadingGuide;
  sectorName: string;
  industry?: string | null;
};

/** Sector-specific reading guide.
 *
 *  Inspired by Ardan's practice of switching the lens per industry — banks
 *  aren't valued by P/E, REITs aren't valued by P/B, semis aren't valued
 *  on a single year's earnings. Telling the user "here's what actually
 *  matters for this sector" up front prevents the wrong frame entirely.
 */
export function SectorContextPanel({ guide, sectorName, industry }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="eyebrow text-[var(--amber-bright)]">HOW TO READ THIS COMPANY</div>
          <div className="font-display text-[20px] text-[var(--bone)] mt-0.5 tracking-[-0.025em]">
            {sectorName}
            {industry && (
              <span className="text-[var(--bone-faint)] text-[14px] font-normal tracking-normal ml-2">
                · {industry}
              </span>
            )}
          </div>
        </div>
        {guide.cyclical && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 border border-[var(--amber-bright)] text-[var(--amber-bright)]">
            ↻ Cyclical sector
          </span>
        )}
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--bone-dim)] mb-4">
        {guide.oneLiner}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
        <div className="bg-[var(--ink-2)] p-3">
          <div className="eyebrow text-[var(--gain)]">FOCUS ON</div>
          <ul className="mt-2 space-y-1 text-[12px] text-[var(--bone)]">
            {guide.primaryMetrics.map(m => (
              <li key={m} className="flex items-baseline gap-2">
                <span className="text-[var(--gain)]">›</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[var(--ink-2)] p-3">
          <div className="eyebrow text-[var(--loss)]">WATCH OUT FOR</div>
          <ul className="mt-2 space-y-1 text-[12px] text-[var(--bone-dim)]">
            {guide.pitfalls.map(p => (
              <li key={p} className="flex items-baseline gap-2">
                <span className="text-[var(--loss)]">!</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
