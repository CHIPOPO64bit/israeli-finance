import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hint?: string;
  emphasis?: 'default' | 'amber' | 'signal' | 'gain' | 'loss';
};

const emphasisToColor: Record<NonNullable<Props['emphasis']>, string> = {
  default: 'text-[var(--bone)]',
  amber:   'text-[var(--amber-bright)]',
  signal:  'text-[var(--signal)]',
  gain:    'text-[var(--gain)]',
  loss:    'text-[var(--loss)]',
};

export function MetricTile({ label, value, sub, hint, emphasis = 'default' }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="eyebrow">{label}</div>
      <div className={`numeric text-[22px] leading-none mt-1 ${emphasisToColor[emphasis]}`}>
        {value}
      </div>
      {sub ? <div className="numeric text-[12px] text-[var(--bone-faint)] mt-1">{sub}</div> : null}
      {hint ? <div className="text-[11px] text-[var(--muted)] mt-1.5 leading-snug">{hint}</div> : null}
    </div>
  );
}
