import type { DiamondLite } from '@/lib/screener';

export function DiamondChip({ score, size = 'sm' }: { score: DiamondLite; size?: 'sm' | 'md' }) {
  const s = score.score;
  const color =
    s >= 70 ? 'var(--gain)' :
    s >= 50 ? 'var(--amber-bright)' :
    s >= 30 ? 'var(--bone-dim)' :
    'var(--bone-faint)';
  return (
    <span
      title={score.reasons.slice(0, 4).join(' · ') || 'Diamond-Lite score'}
      className={`inline-flex items-baseline gap-1 border font-mono ${
        size === 'sm' ? 'text-[10px] px-1.5 py-[1px]' : 'text-[11px] px-2 py-[2px]'
      }`}
      style={{ borderColor: color, color }}
    >
      <span aria-hidden>◆</span>
      <span>{s}</span>
    </span>
  );
}
