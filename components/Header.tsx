import Link from 'next/link';

export function Header() {
  return (
    <header className="relative border-b border-[var(--ink-4)] bg-[var(--ink-1)]/85 backdrop-blur-sm">
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-[var(--flag-blue)]" />
        <div className="w-24 bg-[var(--bone)]" />
        <div className="flex-1 bg-[var(--flag-blue)]" />
      </div>

      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-display text-[28px] font-light tracking-[-0.04em] text-[var(--bone)] group-hover:text-[var(--amber-bright)] transition-colors">
            BORSA
          </span>
          <span className="font-heb text-[18px] text-[var(--bone-faint)] -translate-y-[2px]">
            בורסה
          </span>
          <span className="hidden md:inline-block eyebrow ml-3 border-l border-[var(--ink-4)] pl-3">
            Atlas of Israeli Public Companies
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-[12px]">
          <span className="hidden md:flex items-center gap-2 eyebrow">
            <span className="live-dot" />
            LIVE · TASE & US-LISTED
          </span>
          <Link href="/" className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)] tracking-wide">
            COMPANIES
          </Link>
          <a
            href="/map"
            target="_blank"
            rel="noopener"
            className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)] tracking-wide"
            title="Opens the market map in a new tab"
          >
            MAP ↗
          </a>
          <Link href="/macro" className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)] tracking-wide">
            MACRO
          </Link>
          <Link href="/#sectors" className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)] tracking-wide">
            SECTORS
          </Link>
          <a
            href="https://maya.tase.co.il/en"
            target="_blank"
            rel="noreferrer"
            className="underline-thread text-[var(--bone-dim)] hover:text-[var(--amber-bright)] tracking-wide"
          >
            MAYA ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
