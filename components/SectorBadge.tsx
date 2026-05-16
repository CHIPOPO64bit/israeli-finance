import { SECTOR_BY_KEY, type SectorKey } from '@/lib/sectors';

export function SectorBadge({ sectorKey, size = 'md' }: { sectorKey: SectorKey; size?: 'sm' | 'md' }) {
  const s = SECTOR_BY_KEY[sectorKey];
  if (!s) return null;
  const cls = size === 'sm'
    ? 'text-[10.5px] px-2 py-[3px]'
    : 'text-[11px] px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${cls} font-mono tracking-[0.18em] uppercase text-[var(--bone)]`}
      style={{ borderColor: s.hue }}
    >
      <span style={{ color: s.hue }}>{s.glyph}</span>
      {s.en}
    </span>
  );
}
