import type { Company } from '@/lib/companies';
import type { QuotePreview } from '@/lib/yahoo';
import { formatChange, currencySymbol, normalisePriceUnit } from '@/lib/format';

type Props = {
  items: { company: Company; quote?: QuotePreview }[];
};

export function Ticker({ items }: Props) {
  const valid = items.filter(it => it.quote?.price != null);
  if (valid.length === 0) return null;

  // double for seamless marquee
  const list = [...valid, ...valid];

  return (
    <div className="relative border-b border-[var(--ink-4)] bg-[var(--ink-0)] overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[var(--ink-0)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[var(--ink-0)] to-transparent z-10 pointer-events-none" />
      <div className="py-2.5">
        <div className="ticker-track">
          {list.map((it, i) => {
            const change = formatChange(it.quote?.changePercent);
            const cls =
              change.sign === 'up' ? 'text-[var(--gain)]' :
              change.sign === 'down' ? 'text-[var(--loss)]' : 'text-[var(--bone-faint)]';
            const priceN = normalisePriceUnit(it.quote?.price, it.quote?.currency);
            return (
              <span key={`${it.company.symbol}-${i}`} className="inline-flex items-baseline gap-2 font-mono text-[12px]">
                <span className="text-[var(--bone)]">{it.company.symbol}</span>
                <span className="text-[var(--bone-dim)]">
                  {priceN ? `${priceN.symbol}${priceN.value.toFixed(2)}` : '—'}
                </span>
                <span className={cls}>{change.text}</span>
                <span className="text-[var(--ink-5)]">│</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
