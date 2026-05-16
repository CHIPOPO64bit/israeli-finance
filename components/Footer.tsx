export function Footer() {
  return (
    <footer className="mt-32 border-t border-[var(--ink-4)] bg-[var(--ink-1)]">
      <div className="mx-auto max-w-[1680px] px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-[12px]">
        <div>
          <div className="font-display text-[20px] text-[var(--bone)] tracking-[-0.03em]">BORSA</div>
          <p className="mt-2 text-[var(--bone-faint)] leading-relaxed max-w-[20rem]">
            A working atlas of Israeli public companies. The filings as filed; the people as named.
            No predictions, no speculation — only the books.
          </p>
        </div>
        <div>
          <div className="eyebrow">DATA</div>
          <ul className="mt-3 space-y-1.5 text-[var(--bone-dim)]">
            <li>Live quotes via Yahoo Finance</li>
            <li>Disclosures via TASE · MAYA</li>
            <li>Profiles · Officers · Filings</li>
            <li>Cached 5 minutes</li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">PRIMARY SOURCES</div>
          <ul className="mt-3 space-y-1.5">
            <li><a className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)]" target="_blank" rel="noreferrer" href="https://maya.tase.co.il/en">maya.tase.co.il ↗</a></li>
            <li><a className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)]" target="_blank" rel="noreferrer" href="https://www.isa.gov.il/">Israeli Securities Authority ↗</a></li>
            <li><a className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)]" target="_blank" rel="noreferrer" href="https://market.tase.co.il/en">market.tase.co.il ↗</a></li>
            <li><a className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)]" target="_blank" rel="noreferrer" href="https://www.magna.isa.gov.il/">MAGNA disclosure system ↗</a></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">COLOPHON</div>
          <ul className="mt-3 space-y-1.5 text-[var(--bone-dim)]">
            <li>Set in Fraunces & JetBrains Mono</li>
            <li>Hebrew in Frank Ruhl Libre</li>
            <li>Built with Next.js · Tailwind</li>
            <li className="text-[var(--bone-faint)]">For research only — not investment advice.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--ink-4)] py-4 text-center eyebrow">
        © {new Date().getFullYear()} · BORSA — Tel Aviv ↔ Wall Street
      </div>
    </footer>
  );
}
