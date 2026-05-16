import type { CompanyVerdict, Flag, Severity } from '@/lib/flags';

const VERDICT_STYLE: Record<CompanyVerdict['verdict'], { color: string; bg: string; glyph: string }> = {
  interesting: { color: 'var(--gain)',     bg: 'var(--gain)/10',     glyph: '✓' },
  watch:       { color: 'var(--amber-bright)', bg: 'var(--amber)/10', glyph: '◐' },
  skip:        { color: 'var(--loss)',     bg: 'var(--loss)/10',     glyph: '×' },
};

const SEVERITY_TONE: Record<Severity, string> = {
  high:   'border-[var(--loss)] text-[var(--loss)]',
  medium: 'border-[var(--amber-bright)] text-[var(--amber-bright)]',
  low:    'border-[var(--bone-faint)] text-[var(--bone-faint)]',
};

const GREEN_SEVERITY_TONE: Record<Severity, string> = {
  high:   'border-[var(--gain)] text-[var(--gain)]',
  medium: 'border-[var(--gain)]/60 text-[var(--gain)]/90',
  low:    'border-[var(--bone-faint)] text-[var(--bone-dim)]',
};

export function VerdictPanel({ v }: { v: CompanyVerdict }) {
  const s = VERDICT_STYLE[v.verdict];
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
        <div className="min-w-0">
          <div className="eyebrow text-[var(--amber-bright)]">RESEARCHER VERDICT · VALUE-INVESTOR LENS</div>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <span
              className="font-display text-[34px] tracking-[-0.025em] leading-none"
              style={{ color: s.color }}
            >
              <span aria-hidden className="mr-2">{s.glyph}</span>
              {v.verdictLabel}
            </span>
          </div>
          <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-[var(--bone-dim)]">
            {v.rationale}
          </p>
        </div>

        <div className="card p-3 min-w-[180px]" style={{ borderColor: 'var(--ink-5)' }}>
          <div className="eyebrow">LIQUIDITY</div>
          <div className="text-[14px] text-[var(--bone)] mt-1">{v.liquidity.label}</div>
          {v.liquidity.dollarVolumePerDay != null && (
            <div className="font-mono text-[11px] text-[var(--bone-faint)] mt-1">
              ≈ ${fmtCompact(v.liquidity.dollarVolumePerDay)}/day
            </div>
          )}
        </div>
      </div>

      {/* Flag columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
        <FlagColumn
          title="Green flags"
          subtitle="why this could compound"
          flags={v.greenFlags}
          toneFor={s => GREEN_SEVERITY_TONE[s]}
          accent="var(--gain)"
          emptyText="No clear green flags surfaced from the filings."
        />
        <FlagColumn
          title="Red flags"
          subtitle="what to verify before buying"
          flags={v.redFlags}
          toneFor={s => SEVERITY_TONE[s]}
          accent="var(--loss)"
          emptyText="No red flags triggered — clean balance sheet & liquidity."
        />
      </div>

      <div className="mt-4 text-[11px] text-[var(--muted)] leading-snug">
        This verdict is a rule-based checklist combining the SEC-XBRL fundamentals, Yahoo valuation snapshot,
        and the leadership profile.  It is not a price prediction or investment advice — it is a structured
        first-read of the company so you can decide whether to spend more time digging.
      </div>
    </div>
  );
}

function FlagColumn({
  title, subtitle, flags, toneFor, accent, emptyText,
}: {
  title: string;
  subtitle: string;
  flags: Flag[];
  toneFor: (s: Severity) => string;
  accent: string;
  emptyText: string;
}) {
  return (
    <div className="bg-[var(--ink-2)] p-4">
      <div className="eyebrow" style={{ color: accent }}>{title.toUpperCase()}</div>
      <div className="text-[11px] text-[var(--bone-faint)] mb-3">{subtitle}</div>
      {flags.length === 0 ? (
        <div className="text-[12px] text-[var(--bone-faint)] py-3 italic">{emptyText}</div>
      ) : (
        <ul className="space-y-2">
          {flags.map(f => (
            <li key={f.key} className={`px-3 py-2 border-l-2 bg-[var(--ink-2)] ${toneFor(f.severity)}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] text-[var(--bone)]">{f.label}</span>
                <span className={`font-mono text-[9.5px] uppercase tracking-[0.16em] ${toneFor(f.severity)}`}>{f.severity}</span>
              </div>
              <div className="text-[11px] text-[var(--bone-dim)] mt-1 leading-snug">{f.hint}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}
