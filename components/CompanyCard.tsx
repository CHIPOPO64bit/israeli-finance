import Link from 'next/link';
import type { Company } from '@/lib/companies';
import type { QuotePreview } from '@/lib/yahoo';
import type { DiamondLite } from '@/lib/screener';
import { SECTOR_BY_KEY, type SectorKey } from '@/lib/sectors';
import { formatChange, formatMoney } from '@/lib/format';
import { DiamondChip } from './DiamondChip';
import { WatchStar } from './WatchStar';

type Props = { company: Company; quote?: QuotePreview; score?: DiamondLite };

export function CompanyCard({ company: c, quote, score }: Props) {
  const sec = SECTOR_BY_KEY[c.sector as SectorKey];
  const change = formatChange(quote?.changePercent);
  const changeColor =
    change.sign === 'up' ? 'text-[var(--gain)]' :
    change.sign === 'down' ? 'text-[var(--loss)]' : 'text-[var(--bone-faint)]';

  return (
    <Link
      href={`/c/${encodeURIComponent(c.symbol)}`}
      className="group relative flex flex-col card hover:bg-[var(--ink-3)]/70 transition-colors duration-300"
      style={{ borderColor: 'var(--ink-4)' }}
    >
      {/* Accent strip */}
      <span
        className="absolute left-0 top-0 h-full w-[2px] origin-top scale-y-[0.20] group-hover:scale-y-100 transition-transform duration-500 ease-out"
        style={{ background: sec?.hue }}
        aria-hidden
      />

      <div className="p-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[14px] font-mono tracking-wider" style={{ color: sec?.hue }} aria-hidden>{sec?.glyph}</span>
            <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--bone-faint)]">{sec?.en}</span>
            <WatchStar symbol={c.symbol} />
          </div>
          <div className="font-display text-[22px] leading-[1.04] tracking-[-0.025em] text-[var(--bone)] truncate">
            {c.shortName}
          </div>
          <div className="font-heb text-[14px] text-[var(--bone-dim)] mt-0.5 truncate" dir="rtl">
            {c.hebrewName}
          </div>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <div className="font-mono text-[12px] text-[var(--bone)] tracking-wider">{c.symbol}</div>
          {c.symbolTA && c.symbolTA !== c.symbol && (
            <div className="font-mono text-[10px] text-[var(--bone-faint)]">{c.symbolTA}</div>
          )}
          {score && <DiamondChip score={score} />}
        </div>
      </div>

      {c.tagline && (
        <div className="px-5 text-[12.5px] leading-snug text-[var(--bone-dim)] line-clamp-2 min-h-[36px]">
          {c.tagline}
        </div>
      )}

      <div className="px-5 py-3 mt-2 border-t border-[var(--ink-4)] flex items-center justify-between gap-2">
        <div>
          <div className="eyebrow">MARKET CAP</div>
          <div className="numeric text-[16px] text-[var(--bone)]">
            {quote ? formatMoney(quote.marketCap, quote.currency) : <span className="text-[var(--bone-faint)]">—</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow">1D</div>
          <div className={`numeric text-[14px] ${changeColor}`}>{change.text}</div>
        </div>
      </div>
    </Link>
  );
}
