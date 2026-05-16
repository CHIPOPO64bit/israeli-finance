import type { Company } from '@/lib/companies';

type Props = { company: Company; symbol: string };

export function ReportsPanel({ company, symbol }: Props) {
  const isTASE = symbol.endsWith('.TA') || !!company.symbolTA;
  const isUS = !symbol.endsWith('.TA');
  const enName = encodeURIComponent(company.englishName);
  const heName = encodeURIComponent(company.hebrewName);

  const links: { label: string; href: string; source: string; tag: string; en?: string; he?: string }[] = [];

  // Maya disclosures search by company name (Hebrew gives best matches)
  links.push({
    label: 'Recent disclosures (Hebrew filings)',
    href: `https://maya.tase.co.il/he/reports/company?q=${heName}`,
    source: 'MAYA · TASE',
    tag: 'PRIMARY',
    he: 'דיווחים אחרונים',
  });
  links.push({
    label: 'Recent disclosures (English filings)',
    href: `https://maya.tase.co.il/en/reports/company?q=${enName}`,
    source: 'MAYA · TASE',
    tag: 'PRIMARY',
  });

  if (isTASE) {
    links.push({
      label: 'Security overview & corporate events',
      href: `https://market.tase.co.il/en/market_data/security?security=${encodeURIComponent(symbol.replace('.TA', ''))}`,
      source: 'TASE Market',
      tag: 'CORPORATE',
    });
  }

  if (isUS) {
    links.push({
      label: 'SEC filings (10-K, 20-F, 6-K, 8-K)',
      href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(symbol)}&type=&dateb=&owner=include&count=40`,
      source: 'SEC EDGAR',
      tag: 'PRIMARY',
    });
  }

  links.push({
    label: 'MAGNA — Israeli Securities Authority',
    href: `https://www.magna.isa.gov.il/`,
    source: 'ISA · MAGNA',
    tag: 'REGULATOR',
  });

  if (company.website) {
    links.push({
      label: 'Investor relations site',
      href: company.website.startsWith('http') ? company.website : `https://${company.website}`,
      source: company.website,
      tag: 'COMPANY',
    });
  }

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="eyebrow">REPORTS · PRIMARY SOURCES</div>
          <div className="font-display text-[26px] text-[var(--bone)] mt-1 tracking-[-0.025em]">Filings, as filed</div>
        </div>
        <span className="eyebrow text-[var(--bone-faint)]">linking to the source — not summarising it</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
        {links.map(l => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="group bg-[var(--ink-2)] p-4 flex items-start justify-between gap-3 hover:bg-[var(--ink-3)] transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase px-1.5 py-[1px] border border-[var(--ink-5)] text-[var(--amber-bright)]">
                  {l.tag}
                </span>
                <span className="eyebrow">{l.source}</span>
              </div>
              <div className="text-[14px] text-[var(--bone)] group-hover:text-[var(--amber-bright)] transition-colors">
                {l.label}
              </div>
              {l.he && <div className="font-heb text-[13px] text-[var(--bone-faint)] mt-0.5">{l.he}</div>}
            </div>
            <span className="text-[var(--bone-faint)] group-hover:text-[var(--amber-bright)] text-[14px] shrink-0">↗</span>
          </a>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-[var(--muted)] leading-snug">
        BORSA links you to the original filings — not summaries. Israeli companies disclose via MAYA (the TASE announcement system, in Hebrew &amp; English) and the ISA’s MAGNA portal. Dual-listed companies also file with the U.S. SEC.
      </div>
    </div>
  );
}
