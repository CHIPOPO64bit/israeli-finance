import type { DiamondSignals, SignalItem } from '@/lib/growth';
import { diamondTotal } from '@/lib/growth';

type Props = {
  diamond: DiamondSignals;
};

const BUCKET_META: Record<SignalItem['bucket'], { label: string; hint: string; hue: string }> = {
  growth:     { label: 'GROWTH',     hint: 'How fast it compounds',         hue: 'var(--amber)' },
  quality:    { label: 'QUALITY',    hint: 'Margins, conversion, who runs it', hue: 'var(--gain)' },
  value:      { label: 'VALUE',      hint: 'Price vs. what you’re buying',  hue: 'var(--signal)' },
  durability: { label: 'DURABILITY', hint: 'Will it still be here in 10 yrs?', hue: 'var(--highlight)' },
};

export function FundamentalsPanel({ diamond }: Props) {
  const total = diamondTotal(diamond);
  const bucketScore: Record<SignalItem['bucket'], number> = {
    growth:     diamond.growthScore,
    quality:    diamond.qualityScore,
    value:      diamond.valueScore,
    durability: diamond.durabilityScore,
  };

  const isInformative = diamond.signals.length >= 4;

  if (!isInformative) {
    return (
      <div className="card p-6">
        <div className="eyebrow text-[var(--amber-bright)]">DIAMOND SIGNALS</div>
        <div className="font-display text-[26px] text-[var(--bone)] mt-1 tracking-[-0.025em]">Not enough data filed yet</div>
        <div className="mt-2 text-[12.5px] text-[var(--bone-dim)]">
          Need at least 3–5 years of XBRL-tagged filings (10-K / 20-F) before the fundamentals scoreboard becomes meaningful.
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="eyebrow text-[var(--amber-bright)]">FUNDAMENTAL SIGNALS · HIDDEN-DIAMOND SCOREBOARD</div>
          <div className="font-display text-[28px] text-[var(--bone)] mt-1 tracking-[-0.025em]">
            What the filings actually say
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--bone-dim)] max-w-[680px]">
            Each signal is a structured condition that historically separates compounders from value-traps —
            sustained growth, margin expansion, cash-on-balance-sheet, founder leadership, reasonable price.
            Green = signal triggered. <span className="text-[var(--bone-faint)]">Not a prediction; a checklist.</span>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-right">
            <div className="eyebrow text-[var(--bone-faint)]">COMPOSITE</div>
            <div className={`numeric text-[44px] leading-none mt-1 ${
              total >= 70 ? 'text-[var(--gain)]' :
              total >= 50 ? 'text-[var(--amber-bright)]' :
              total >= 30 ? 'text-[var(--bone)]' :
              'text-[var(--loss)]'
            }`}>
              {total}<span className="text-[var(--bone-faint)] text-[20px]">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bucket scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)] mb-5">
        {(Object.keys(BUCKET_META) as SignalItem['bucket'][]).map(b => {
          const score = bucketScore[b];
          const meta = BUCKET_META[b];
          return (
            <div key={b} className="bg-[var(--ink-2)] p-4">
              <div className="eyebrow flex items-center gap-2">
                <span style={{ color: meta.hue }}>●</span>
                {meta.label}
              </div>
              <div className={`numeric text-[28px] leading-none mt-1.5 ${
                score >= 70 ? 'text-[var(--gain)]' :
                score >= 50 ? 'text-[var(--bone)]' :
                score >= 30 ? 'text-[var(--amber-bright)]' :
                'text-[var(--bone-faint)]'
              }`}>{score}<span className="text-[var(--bone-faint)] text-[13px]">/100</span></div>
              {/* simple track bar */}
              <div className="mt-2 h-[3px] bg-[var(--ink-4)] relative">
                <div className="absolute top-0 bottom-0 left-0" style={{ width: `${score}%`, background: meta.hue }} />
              </div>
              <div className="mt-2 text-[11px] text-[var(--bone-faint)]">{meta.hint}</div>
            </div>
          );
        })}
      </div>

      {/* Individual signals — grouped by bucket */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(BUCKET_META) as SignalItem['bucket'][]).map(b => {
          const items = diamond.signals.filter(s => s.bucket === b);
          if (!items.length) return null;
          return (
            <div key={b}>
              <div className="eyebrow mb-2" style={{ color: BUCKET_META[b].hue }}>
                {BUCKET_META[b].label}
              </div>
              <ul className="space-y-1.5">
                {items.map(s => (
                  <li
                    key={s.key}
                    className={`px-3 py-2 border-l-2 ${
                      s.good === true ? 'border-[var(--gain)] bg-[var(--gain)]/5' :
                      s.good === false ? 'border-[var(--loss)] bg-[var(--loss)]/5' :
                      'border-[var(--ink-5)] bg-[var(--ink-2)]/40'
                    }`}
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[12px] text-[var(--bone)]">{s.label}</span>
                      <span className={`numeric text-[12px] ${
                        s.good === true ? 'text-[var(--gain)]' :
                        s.good === false ? 'text-[var(--loss)]' :
                        'text-[var(--bone-dim)]'
                      }`}>{s.value}</span>
                    </div>
                    {s.hint && (
                      <div className="text-[10.5px] text-[var(--bone-faint)] mt-1 leading-snug">{s.hint}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-[11px] text-[var(--muted)] leading-snug">
        Source data: SEC XBRL (financials) + Yahoo (valuation snapshot) + Wikidata (founder &amp; leadership flags).
        The scorecard is a transparent rule-set, not a predictive model. Every input is shown above so you can second-guess every column.
      </div>
    </div>
  );
}
