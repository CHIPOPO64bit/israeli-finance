import type { Filing } from '@/lib/sec';
import type { Company } from '@/lib/companies';

type Props = {
  company: Company;
  filings?: Filing[];
  hasCIK: boolean;
};

const FORM_LABEL: Record<string, { en: string; he?: string; weight: 'primary' | 'event' | 'other' }> = {
  '10-K':   { en: 'Annual Report (10-K)',        weight: 'primary' },
  '10-K/A': { en: 'Annual Report — Amended',     weight: 'primary' },
  '20-F':   { en: 'Annual Report (20-F)',        weight: 'primary' },
  '20-F/A': { en: 'Annual Report — Amended',     weight: 'primary' },
  '10-Q':   { en: 'Quarterly Report (10-Q)',     weight: 'primary' },
  '10-Q/A': { en: 'Quarterly Report — Amended',  weight: 'primary' },
  '6-K':    { en: 'Foreign Issuer Report (6-K)', weight: 'event' },
  '8-K':    { en: 'Material Event (8-K)',        weight: 'event' },
  'F-1':    { en: 'IPO Registration (F-1)',      weight: 'other' },
  'S-1':    { en: 'IPO Registration (S-1)',      weight: 'other' },
  'DEF 14A':{ en: 'Proxy Statement',             weight: 'other' },
  'DEFA14A':{ en: 'Additional Proxy Materials',  weight: 'other' },
  'F-3':    { en: 'Securities Registration',     weight: 'other' },
  'S-1/A':  { en: 'IPO Reg. — Amended',          weight: 'other' },
  'F-1/A':  { en: 'IPO Reg. — Amended',          weight: 'other' },
  '40-F':   { en: 'Canadian Cross-Listing',      weight: 'primary' },
};

function fmtBytes(n?: number): string {
  if (!n) return '—';
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export function FilingsPanel({ company, filings, hasCIK }: Props) {
  const isTASE = company.symbol.endsWith('.TA');
  const enName = encodeURIComponent(company.englishName);
  const heName = encodeURIComponent(company.hebrewName);

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <span className="live-dot" />
            PRIMARY FILINGS · GROUND TRUTH
          </div>
          <div className="font-display text-[28px] text-[var(--bone)] mt-1 tracking-[-0.025em]">
            The reports themselves
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--bone-dim)] max-w-[640px]">
            These are the exact documents filed by the company with the regulator
            — not summaries, not aggregator copies. Click to download the original PDF/HTML.
          </div>
        </div>
      </div>

      {hasCIK && filings && filings.length > 0 && (
        <>
          <div className="eyebrow mb-2 text-[var(--amber-bright)]">SEC EDGAR · {filings.length} RECENT FILINGS</div>
          <div className="border border-[var(--ink-4)]">
            {filings.slice(0, 12).map((f) => {
              const meta = FORM_LABEL[f.form] ?? { en: f.form, weight: 'other' as const };
              const tagColor =
                meta.weight === 'primary' ? 'text-[var(--amber-bright)] border-[var(--amber)]' :
                meta.weight === 'event'   ? 'text-[var(--signal)] border-[var(--signal)]/40' :
                'text-[var(--bone-faint)] border-[var(--ink-5)]';
              return (
                <a
                  key={f.accession}
                  href={f.primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 p-3 border-b border-[var(--ink-4)] last:border-b-0 hover:bg-[var(--ink-3)] transition-colors"
                >
                  <span className={`font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-1 border ${tagColor} shrink-0 w-[88px] text-center`}>
                    {f.form}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] text-[var(--bone)] group-hover:text-[var(--amber-bright)] truncate">
                      {meta.en}
                      {f.primaryDocDescription && <span className="text-[var(--bone-faint)]"> · {f.primaryDocDescription}</span>}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--bone-faint)] mt-0.5 flex flex-wrap gap-x-3">
                      <span>filed {f.filingDate}</span>
                      {f.reportDate && <span>covers {f.reportDate}</span>}
                      {f.size != null && <span>{fmtBytes(f.size)}</span>}
                      {f.isInlineXBRL && <span className="text-[var(--gain)]">XBRL</span>}
                      <span className="text-[var(--bone-faint)]/60 truncate">{f.accession}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[12px] text-[var(--bone-faint)] group-hover:text-[var(--amber-bright)] shrink-0">↗</span>
                </a>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-[var(--muted)]">
            Source: <a className="underline-thread text-[var(--bone-dim)] hover:text-[var(--bone)]" target="_blank" rel="noreferrer" href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.symbol}&type=&dateb=&owner=include&count=40`}>SEC EDGAR full filings list ↗</a>
          </div>
        </>
      )}

      {(isTASE || company.symbolTA) && (
        <>
          {hasCIK && filings && filings.length > 0 && <div className="h-6" />}
          <div className="eyebrow mb-2 text-[var(--amber-bright)]">MAYA · TASE DISCLOSURES (HEBREW)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
            <a target="_blank" rel="noreferrer" href={`https://maya.tase.co.il/he/reports/company?q=${heName}`} className="bg-[var(--ink-2)] p-3 hover:bg-[var(--ink-3)] transition-colors">
              <div className="font-mono text-[10px] tracking-widest text-[var(--bone-faint)]">דיווחים אחרונים</div>
              <div className="text-[14px] text-[var(--bone)] group-hover:text-[var(--amber-bright)] mt-1">All recent disclosures (Hebrew)</div>
              <div className="font-mono text-[10.5px] text-[var(--bone-faint)] mt-1">maya.tase.co.il ↗</div>
            </a>
            <a target="_blank" rel="noreferrer" href={`https://maya.tase.co.il/en/reports/company?q=${enName}`} className="bg-[var(--ink-2)] p-3 hover:bg-[var(--ink-3)] transition-colors">
              <div className="font-mono text-[10px] tracking-widest text-[var(--bone-faint)]">English disclosures</div>
              <div className="text-[14px] text-[var(--bone)] group-hover:text-[var(--amber-bright)] mt-1">English filings (where filed)</div>
              <div className="font-mono text-[10.5px] text-[var(--bone-faint)] mt-1">maya.tase.co.il/en ↗</div>
            </a>
            <a target="_blank" rel="noreferrer" href={`https://www.magna.isa.gov.il/`} className="bg-[var(--ink-2)] p-3 hover:bg-[var(--ink-3)] transition-colors">
              <div className="font-mono text-[10px] tracking-widest text-[var(--bone-faint)]">REGULATOR</div>
              <div className="text-[14px] text-[var(--bone)] group-hover:text-[var(--amber-bright)] mt-1">MAGNA — Israeli Securities Authority</div>
              <div className="font-mono text-[10.5px] text-[var(--bone-faint)] mt-1">magna.isa.gov.il ↗</div>
            </a>
            {company.website && (
              <a target="_blank" rel="noreferrer" href={company.website.startsWith('http') ? company.website : `https://${company.website}`} className="bg-[var(--ink-2)] p-3 hover:bg-[var(--ink-3)] transition-colors">
                <div className="font-mono text-[10px] tracking-widest text-[var(--bone-faint)]">COMPANY</div>
                <div className="text-[14px] text-[var(--bone)] group-hover:text-[var(--amber-bright)] mt-1">Investor Relations site</div>
                <div className="font-mono text-[10.5px] text-[var(--bone-faint)] mt-1">{company.website.replace(/^https?:\/\//, '')} ↗</div>
              </a>
            )}
          </div>
        </>
      )}

      {!hasCIK && !isTASE && !company.symbolTA && (
        <div className="text-[13px] text-[var(--bone-faint)] py-6 text-center">
          No public regulator-filed reports indexed for this listing. Check the company’s investor relations site directly.
        </div>
      )}
    </div>
  );
}
