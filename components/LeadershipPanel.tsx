import type { PersonProfile, TeamMakeup } from '@/lib/people';
import { formatPlainMoney, formatMoney } from '@/lib/format';

type Props = {
  profiles: PersonProfile[];
  makeup: TeamMakeup;
  currency?: string | null;
};

function initials(name: string): string {
  return name
    .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function cleanName(name: string): string {
  return name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+/i, '').trim();
}

const ROLE_HUE: Record<string, string> = {
  'founder-ceo':     'var(--amber-bright)',
  'chairman':        'var(--amber)',
  'ceo':             'var(--amber)',
  'president':       'var(--amber)',
  'cto-technical':   'var(--signal)',
  'cfo':             'var(--gain)',
  'coo':             'var(--bone)',
  'product':         'var(--highlight)',
  'cmo-revenue':     'var(--bone-dim)',
  'general-counsel': 'var(--bone-faint)',
  'business':        'var(--bone-faint)',
  'other':           'var(--bone-faint)',
};

export function LeadershipPanel({ profiles, makeup, currency }: Props) {
  if (!profiles.length) {
    return (
      <div className="card p-6">
        <div className="eyebrow">LEADERSHIP</div>
        <div className="mt-2 text-sm text-[var(--bone-faint)]">No officer data published for this listing.</div>
      </div>
    );
  }

  // Aggregate team-level technical signals across all profiles.
  const teamTech = computeTeamTechSignals(profiles);

  return (
    <div className="card p-6">
      <div className="mb-5">
        <div className="eyebrow">LEADERSHIP · WHO ACTUALLY RUNS THIS</div>
        <div className="font-display text-[28px] text-[var(--bone)] mt-1 tracking-[-0.025em]">
          The people running the company
        </div>
        <div className="mt-1 text-[12.5px] text-[var(--bone-dim)] max-w-[640px]">
          Names &amp; titles from the company’s filings. Biographies, education and
          prior employers enriched live from Wikipedia &amp; Wikidata. We highlight
          founders, technical leaders, elite schools, FAANG-class prior employers
          and Unit-8200-style backgrounds — the real signals of execution talent.
        </div>
      </div>

      {/* ── Team-makeup readout (top stats) ─────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)] mb-3">
        <Stat
          label="FOUNDERS STILL ON BOARD"
          value={makeup.founders}
          accent={makeup.founders > 0 ? 'amber' : 'muted'}
          hint={makeup.founders > 0
            ? `${makeup.founders} of ${makeup.total} disclosed officers`
            : 'No founders disclosed in the named officers'}
        />
        <Stat
          label="TECHNICAL EXECUTIVES"
          value={makeup.technical}
          accent={makeup.technical > 0 ? 'signal' : 'muted'}
          hint={makeup.technical > 0
            ? 'CTO, Chief Scientist, R&D, AI/Engineering officers'
            : 'No technical C-level disclosed'}
        />
        <Stat
          label="MEDIAN AGE"
          value={makeup.medianAge ?? '—'}
          hint={makeup.oldestYearBorn != null
            ? `Born ${makeup.youngestYearBorn} ↔ ${makeup.oldestYearBorn}`
            : 'Age not disclosed for all officers'}
        />
        <Stat
          label="OFFICERS WITH PUBLIC PROFILE"
          value={`${makeup.withWikipedia}/${makeup.total}`}
          accent={makeup.withWikipedia > 0 ? 'gain' : 'muted'}
          hint="Public Wikipedia pages — a rough proxy for prominence"
        />
      </div>

      {/* ── Technical talent readout ───────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)] mb-5">
        <Stat label="RESEARCHER / PhD COUNT" value={teamTech.researcherCount} accent={teamTech.researcherCount > 0 ? 'signal' : 'muted'} hint="PhDs, professors, named-scientist roles" />
        <Stat label="EX-FAANG / TOP-TECH"   value={teamTech.exFaangCount}     accent={teamTech.exFaangCount > 0 ? 'gain' : 'muted'}     hint="Prior employer at Google · Meta · Microsoft · Apple · Intel · NVIDIA · IBM …" />
        <Stat label="ELITE-SCHOOL EDUCATED" value={teamTech.eliteSchoolCount} accent={teamTech.eliteSchoolCount > 0 ? 'gain' : 'muted'} hint="Technion · Weizmann · MIT · Stanford · Harvard · …" />
        <Stat label="MILITARY-TECH (8200/TALPIOT)" value={teamTech.militaryTechCount} accent={teamTech.militaryTechCount > 0 ? 'amber' : 'muted'} hint="Israeli elite tech-intel units — historically a feeder for great founders" />
      </div>

      {/* ── Officer cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--ink-4)] border border-[var(--ink-4)]">
        {profiles.map((p, i) => (
          <OfficerCard key={`${p.name}-${i}`} p={p} currency={currency} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-[var(--muted)]">
        <div>
          Compensation figures: total reported pay (cash + bonus + stock awards) from the most recent annual proxy / 20-F.
          Education &amp; prior-employer data: Wikidata. Bios: English Wikipedia. Awards: Wikidata P166.
        </div>
        <div className="md:text-right">
          {makeup.totalCompensation
            ? <>Sum of disclosed officer compensation · {formatMoney(makeup.totalCompensation, currency, 1)}</>
            : ''}
        </div>
      </div>
    </div>
  );
}

function OfficerCard({ p, currency }: { p: PersonProfile; currency?: string | null }) {
  const roleHue = ROLE_HUE[p.role] ?? 'var(--bone-faint)';
  const ts = p.techSignals;
  return (
    <article className="bg-[var(--ink-2)] p-4 flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {p.thumbnailUrl ? (
            <img
              src={p.thumbnailUrl}
              alt={`Photo of ${cleanName(p.name)}`}
              width={56}
              height={56}
              className="block w-14 h-14 object-cover border border-[var(--ink-5)] bg-[var(--ink-3)] grayscale-[15%]"
            />
          ) : (
            <div
              className="w-14 h-14 flex items-center justify-center border bg-[var(--ink-3)] font-mono text-[14px] tracking-wider"
              style={{ borderColor: roleHue, color: roleHue }}
            >
              {initials(p.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] text-[var(--bone)] leading-tight">
            {cleanName(p.name)}
            {p.wikipediaUrl && (
              <a
                href={p.wikipediaUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-1.5 inline-block text-[10px] font-mono text-[var(--amber-bright)] hover:text-[var(--bone)]"
                title="Open Wikipedia profile"
              >
                WIKI ↗
              </a>
            )}
            {p.qid && (
              <a
                href={`https://www.wikidata.org/wiki/${p.qid}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1.5 inline-block text-[10px] font-mono text-[var(--bone-faint)] hover:text-[var(--amber-bright)]"
                title="Open Wikidata entity"
              >
                {p.qid}
              </a>
            )}
          </div>
          {p.title && (
            <div className="text-[12px] text-[var(--bone-dim)] mt-1 leading-snug">{p.title}</div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill color={roleHue}>{p.roleLabel}</Pill>
            {p.isFounder && <Pill color="var(--amber-bright)">Founder</Pill>}
            {p.isTechnical && !p.isFounder && <Pill color="var(--signal)">Technical</Pill>}
            {ts?.hasResearch && <Pill color="var(--gain)">Researcher</Pill>}
            {ts?.militaryTechFlags?.length ? <Pill color="var(--amber)">Unit 8200 / Talpiot</Pill> : null}
          </div>
        </div>
      </div>

      {p.bio && (
        <p className="text-[12.5px] leading-relaxed text-[var(--bone-dim)] line-clamp-5">
          {p.bio}
        </p>
      )}

      {/* Research credentials from OpenAlex — when we found a confident match */}
      {p.research && (
        <a
          href={p.research.url}
          target="_blank"
          rel="noreferrer"
          className="block border border-[var(--gain)]/40 bg-[var(--gain)]/5 hover:bg-[var(--gain)]/10 p-3 transition-colors -mx-1"
        >
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="eyebrow text-[var(--gain)]">RESEARCH · OPENALEX</span>
            <span className="font-mono text-[10px] text-[var(--bone-faint)]">profile ↗</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[12px]">
            <Metric small label="Works" value={p.research.works.toLocaleString()} />
            <Metric small label="Citations" value={p.research.citations.toLocaleString()} accent="gain" />
            <Metric small label="h-index" value={p.research.hIndex?.toString() ?? '—'} accent="gain" />
          </div>
          {p.research.topConcepts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {p.research.topConcepts.slice(0, 4).map(c => (
                <span key={c} className="font-mono text-[10px] uppercase tracking-[0.06em] px-1.5 py-[1px] border border-[var(--ink-5)] text-[var(--bone-dim)]">
                  {c}
                </span>
              ))}
            </div>
          )}
          {p.research.orcid && (
            <div className="mt-1.5 font-mono text-[10px] text-[var(--bone-faint)]">ORCID · {p.research.orcid}</div>
          )}
        </a>
      )}

      {/* Education & prior employers — highlight elite & top-tech matches */}
      {(p.education && p.education.length > 0) || (p.priorEmployers && p.priorEmployers.length > 0) ? (
        <div className="text-[11px] space-y-1.5 pt-2 border-t border-[var(--ink-4)]">
          {p.education && p.education.length > 0 && (
            <Row label="EDU" items={p.education} highlight={ts?.eliteSchools ?? []} hue="var(--gain)" />
          )}
          {p.priorEmployers && p.priorEmployers.length > 0 && (
            <Row label="PRIOR" items={p.priorEmployers} highlight={ts?.topTechEmployers ?? []} hue="var(--signal)" />
          )}
          {p.awards && p.awards.length > 0 && (
            <Row label="AWARDS" items={p.awards.slice(0, 4)} highlight={[]} hue="var(--amber-bright)" />
          )}
          {p.fields && p.fields.length > 0 && (
            <Row label="FIELD" items={p.fields.slice(0, 4)} highlight={[]} hue="var(--bone-dim)" />
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-[var(--bone-faint)] mt-auto pt-2 border-t border-[var(--ink-4)]">
        {p.yearBorn != null
          ? <span>born {p.yearBorn}</span>
          : p.age != null
            ? <span>age {p.age}</span>
            : null}
        {p.wikiDescription && (
          <span className="text-[var(--bone-dim)]">{p.wikiDescription}</span>
        )}
        {ts && ts.techScore > 0 && (
          <span
            className={`ml-auto font-mono px-1.5 py-[1px] border ${
              ts.techScore >= 60 ? 'border-[var(--gain)] text-[var(--gain)]' :
              ts.techScore >= 35 ? 'border-[var(--signal)] text-[var(--signal)]' :
              'border-[var(--bone-faint)] text-[var(--bone-faint)]'
            }`}
          >
            TECH · {ts.techScore}/100
          </span>
        )}
        {p.totalPay != null && (
          <span className="text-[var(--bone-dim)]">comp · {formatPlainMoney(p.totalPay, currency, 0)}</span>
        )}
      </div>
    </article>
  );
}

function Row({ label, items, highlight, hue }: { label: string; items: string[]; highlight: string[]; hue: string }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="eyebrow text-[var(--bone-faint)] shrink-0 w-12">{label}</span>
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {items.slice(0, 8).map(item => {
          const hot = highlight.some(h => h.toLowerCase() === item.toLowerCase());
          return (
            <span
              key={item}
              className={`inline-block px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-[0.06em] border ${hot ? 'text-[var(--bone)]' : 'text-[var(--bone-faint)]'}`}
              style={{ borderColor: hot ? hue : 'var(--ink-5)', background: hot ? `${hue.replace('var(--', 'color-mix(in oklch, var(--')}, transparent 88%)` : 'transparent' }}
            >
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="font-mono text-[9.5px] tracking-[0.16em] uppercase px-1.5 py-[1.5px] border"
      style={{ borderColor: color, color }}
    >
      {children}
    </span>
  );
}

function Metric({ label, value, accent = 'default', small }: { label: string; value: React.ReactNode; accent?: 'default' | 'gain' | 'signal' | 'amber'; small?: boolean }) {
  const color =
    accent === 'gain'   ? 'text-[var(--gain)]' :
    accent === 'signal' ? 'text-[var(--signal)]' :
    accent === 'amber'  ? 'text-[var(--amber-bright)]' :
    'text-[var(--bone)]';
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--bone-faint)]">{label}</div>
      <div className={`numeric ${small ? 'text-[14px]' : 'text-[18px]'} mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function Stat({
  label, value, accent = 'default', hint,
}: {
  label: string;
  value: React.ReactNode;
  accent?: 'default' | 'amber' | 'signal' | 'gain' | 'loss' | 'muted';
  hint?: React.ReactNode;
}) {
  const color =
    accent === 'amber'  ? 'text-[var(--amber-bright)]' :
    accent === 'signal' ? 'text-[var(--signal)]' :
    accent === 'gain'   ? 'text-[var(--gain)]' :
    accent === 'loss'   ? 'text-[var(--loss)]' :
    accent === 'muted'  ? 'text-[var(--bone-faint)]' :
    'text-[var(--bone)]';
  return (
    <div className="bg-[var(--ink-2)] p-3 flex flex-col">
      <div className="eyebrow">{label}</div>
      <div className={`numeric text-[24px] leading-none mt-1.5 ${color}`}>{value}</div>
      {hint && <div className="text-[11px] text-[var(--muted)] mt-1.5 leading-snug">{hint}</div>}
    </div>
  );
}

function computeTeamTechSignals(profiles: PersonProfile[]): {
  researcherCount: number;
  exFaangCount: number;
  eliteSchoolCount: number;
  militaryTechCount: number;
} {
  let researcherCount = 0;
  let exFaangCount = 0;
  let eliteSchoolCount = 0;
  let militaryTechCount = 0;
  for (const p of profiles) {
    const t = p.techSignals;
    if (!t) continue;
    if (t.hasResearch) researcherCount++;
    if (t.topTechEmployers.length > 0) exFaangCount++;
    if (t.eliteSchools.length > 0) eliteSchoolCount++;
    if (t.militaryTechFlags.length > 0) militaryTechCount++;
  }
  return { researcherCount, exFaangCount, eliteSchoolCount, militaryTechCount };
}
