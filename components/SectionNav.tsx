'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; label: string };

export function SectionNav({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const targets = items
      .map(i => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    if (!targets.length) return;

    const obs = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    targets.forEach(t => obs.observe(t));
    return () => obs.disconnect();
  }, [items]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <div className="sticky top-0 z-30 -mx-6 px-6 bg-[var(--ink-1)]/85 backdrop-blur-md border-b border-[var(--ink-4)]">
      <div className="flex items-center gap-1 overflow-x-auto py-2.5 -mb-px">
        {items.map(i => (
          <button
            key={i.id}
            onClick={() => scrollTo(i.id)}
            className={`shrink-0 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em] border transition-colors ${
              active === i.id
                ? 'border-[var(--amber)] text-[var(--bone)] bg-[var(--amber)]/10'
                : 'border-transparent text-[var(--bone-faint)] hover:text-[var(--bone)] hover:border-[var(--ink-4)]'
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}
