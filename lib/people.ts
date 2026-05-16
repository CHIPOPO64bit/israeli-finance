/**
 * People enrichment.
 *
 *   1. Categorise every officer by their *title* — founder, CEO, CTO/technical,
 *      CFO, COO, legal, etc. This is a deterministic heuristic that runs against
 *      the title string Yahoo gives us; it costs zero network requests.
 *
 *   2. For each officer, attempt to fetch a public profile from Wikipedia
 *      (REST summary endpoint). Verifies the page is actually about that
 *      person at that company before keeping it. Cached aggressively because
 *      these biographies don't change often.
 *
 * The point of all this is to let the user *see* whether a company is run by
 * its founders, by technical people, or by professional managers — a real
 * signal about how the company operates, not a rumor.
 */

import type { Officer } from './yahoo';

export type Role =
  | 'founder-ceo'
  | 'chairman'
  | 'ceo'
  | 'president'
  | 'cfo'
  | 'coo'
  | 'cto-technical'
  | 'product'
  | 'cmo-revenue'
  | 'general-counsel'
  | 'business'
  | 'other';

export type ResearchProfile = {
  url: string;                    // OpenAlex profile
  orcid?: string;
  works: number;
  citations: number;
  hIndex?: number;
  i10Index?: number;
  topConcepts: string[];
  topAffiliations: string[];
};

export type PersonProfile = Officer & {
  // Title-derived classification
  role: Role;
  roleLabel: string;
  isFounder: boolean;
  isCEO: boolean;
  isTechnical: boolean;
  seniority: number; // 0–100

  // Wikipedia / Wikidata enrichment
  bio?: string | null;
  bioSource?: 'wikipedia' | 'wikidata';
  wikipediaUrl?: string | null;
  thumbnailUrl?: string | null;
  wikiDescription?: string | null; // e.g. "Israeli entrepreneur"

  // Deep Wikidata facts (when person matched to a QID)
  qid?: string;
  occupations?: string[];
  education?: string[];           // alma maters
  priorEmployers?: string[];      // employer history
  awards?: string[];
  notableWorks?: string[];
  fields?: string[];

  // Derived technical-signal flags
  techSignals?: TechSignals;

  // Real research credentials, fetched from OpenAlex when we have a confident match.
  research?: ResearchProfile;
};

export type TechSignals = {
  eliteSchools: string[];         // matches found in education
  topTechEmployers: string[];     // matches found in priorEmployers
  researcherFlags: string[];      // 'PhD', 'Professor', 'Researcher', ...
  militaryTechFlags: string[];    // 'Unit 8200', 'Talpiot', 'Mamram'
  hasResearch: boolean;
  isElite: boolean;
  techScore: number;              // 0–100
};

// ── Title classifier ─────────────────────────────────────────────

const TECH_PATTERNS = [
  /chief technology officer/i,
  /chief technical officer/i,
  /chief science officer/i,
  /chief scientist/i,
  /chief ai officer/i,
  /chief data officer/i,
  /chief data & ai officer/i,
  /chief engineering/i,
  /chief architect/i,
  /\bcto\b/i,
  /chief innovation/i,
  /chief medical officer/i,        // pharma: medical officers are technical
  /chief r&d/i,
  /chief research/i,
  /head of r&d/i,
  /head of engineering/i,
  /vp,?\s+engineering/i,
  /\bvp\s+r&d\b/i,
  /head of technology/i,
  /\bof\s+(global\s+)?r&d\b/i,     // "VP of Global R&D" etc.
  /\bresearch\s+(officer|head)/i,
  /\b(global\s+)?r&d\s+(officer|head|director|chief)/i,
];

const PRODUCT_PATTERNS = [
  /chief product officer/i,
  /\bcpo\b/i,
  /head of product/i,
  /vp,?\s+product/i,
];

const FOUNDER_PATTERNS = [/\bco-?founder\b/i, /\bfounder\b/i];

export function classify(title: string): Pick<PersonProfile, 'role' | 'roleLabel' | 'isFounder' | 'isCEO' | 'isTechnical' | 'seniority'> {
  const t = (title || '').trim();
  if (!t) {
    return { role: 'other', roleLabel: 'Officer', isFounder: false, isCEO: false, isTechnical: false, seniority: 20 };
  }

  const isFounder = FOUNDER_PATTERNS.some(p => p.test(t));
  const isCEO = /(chief executive officer|\bceo\b)/i.test(t);
  const isChairman = /chairman/i.test(t);
  const isPresident = /\bpresident\b/i.test(t) && !/vice\s+president|\bvp\b/i.test(t);
  const isCFO = /(chief financial officer|\bcfo\b)/i.test(t);
  const isCOO = /(chief operating officer|\bcoo\b)/i.test(t);
  const isCMO = /(chief marketing officer|\bcmo\b|chief revenue|\bcro\b|chief commercial)/i.test(t);
  const isCounsel = /(general counsel|chief legal)/i.test(t);

  const isTechnical = TECH_PATTERNS.some(p => p.test(t));
  const isProduct = PRODUCT_PATTERNS.some(p => p.test(t));

  let role: Role = 'other';
  let seniority = 30;

  if (isFounder && isCEO) { role = 'founder-ceo'; seniority = 100; }
  else if (isChairman) { role = 'chairman'; seniority = 95; }
  else if (isCEO) { role = 'ceo'; seniority = 92; }
  else if (isPresident) { role = 'president'; seniority = 80; }
  else if (isTechnical) { role = 'cto-technical'; seniority = 70; }
  else if (isCFO) { role = 'cfo'; seniority = 68; }
  else if (isCOO) { role = 'coo'; seniority = 65; }
  else if (isProduct) { role = 'product'; seniority = 60; }
  else if (isCMO) { role = 'cmo-revenue'; seniority = 55; }
  else if (isCounsel) { role = 'general-counsel'; seniority = 50; }
  else if (/chief|\bsvp\b|senior vice president/i.test(t)) { role = 'business'; seniority = 45; }
  else if (/\bvp\b|vice president/i.test(t)) { role = 'business'; seniority = 35; }

  if (isFounder && role !== 'founder-ceo') seniority = Math.max(seniority, 78);

  // Friendly role label
  const roleLabel = (() => {
    if (role === 'founder-ceo')        return 'Founder · CEO';
    if (role === 'chairman')           return 'Chairman';
    if (role === 'ceo')                return 'Chief Executive';
    if (role === 'president')          return 'President';
    if (role === 'cto-technical')      return 'Technology';
    if (role === 'cfo')                return 'Finance';
    if (role === 'coo')                return 'Operations';
    if (role === 'product')            return 'Product';
    if (role === 'cmo-revenue')        return 'Revenue · Marketing';
    if (role === 'general-counsel')    return 'Legal';
    if (role === 'business')           return 'Business';
    return 'Officer';
  })();

  return { role, roleLabel, isFounder, isCEO, isTechnical, seniority };
}

// ── Wikipedia lookup ─────────────────────────────────────────────

const UA = 'BORSA Research (david1711ks@gmail.com)';

import https from 'node:https';

function wikipediaJson<T = unknown>(url: string): Promise<T | null> {
  return new Promise(resolve => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      res => {
        if (res.statusCode !== 200) { res.resume(); return resolve(null); }
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T); }
          catch { resolve(null); }
        });
        res.on('error', () => resolve(null));
      },
    );
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => req.destroy());
  });
}

type WikiSummary = {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
};

function cleanName(name: string): string {
  return name
    .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.|Sir|Lord|Lady)\s+/i, '')
    .replace(/,?\s+(Jr\.|Sr\.|I{2,3}|IV|V|CFA|CPA|MBA|PhD|M\.B\.A\.|Ph\.D\.|M\.D\.|J\.D\.)$/i, '')
    .replace(/\s+M\.D\.|\s+Ph\.D\.|\s+CFA|\s+CPA|\s+J\.D\.|\s+M\.B\.A\.|\s+B\.A\.|\s+B\.Sc\./gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Decide whether a Wikipedia summary is *probably* the person we asked for.
 *
 *   Strong signals (any of these is sufficient):
 *     • The page explicitly mentions the company / ticker / short name.
 *     • The page's short description is something like
 *       "Israeli entrepreneur", "Israeli businessman", "tech CEO"...
 *
 *   Negative signals (reject):
 *     • The bio describes the person as a footballer / actor / musician /
 *       politician — common false-positive categories for plain names.
 */
const FALSE_POSITIVE = /\b(footballer|cricketer|musician|singer|actor|actress|painter|sculptor|poet|novelist|playwright|monk|priest|rabbi|politician|senator|congressman|admiral|fighter pilot|baseball|basketball|hockey|tennis|olympic|saint|king|queen|prince|princess|sultan|emperor)\b/i;
const EXEC_CONTEXT = /\b(founder|co-?founder|chief executive|\bceo\b|chairman|president|chief technology|cto|cfo|coo|executive|entrepreneur|businessman|businesswoman|investor|engineer|technologist)\b/i;
const ISRAELI_OR_NEARBY = /\b(israeli?|tel aviv|haifa|jerusalem)\b/i;

function looksLikeMatch(summary: WikiSummary | null, hints: string[]): boolean {
  if (!summary || !summary.extract) return false;
  const text = `${summary.description ?? ''}\n${summary.extract}`.toLowerCase();
  // Strong negative: page is clearly about someone in a different profession.
  if (FALSE_POSITIVE.test(text)) return false;
  // Direct match on a hint (company name / ticker / short name).
  for (const h of hints) {
    const hl = (h || '').trim().toLowerCase();
    if (hl.length >= 3 && text.includes(hl)) return true;
  }
  // Otherwise accept Israeli + executive context (founder/CEO/exec/etc).
  return ISRAELI_OR_NEARBY.test(text) && EXEC_CONTEXT.test(text);
}

const profileCache = new Map<string, { value: Partial<PersonProfile> | null; expiresAt: number }>();
const PROFILE_TTL = 24 * 60 * 60 * 1000;

async function fetchWikipediaProfile(rawName: string, hints: string[]): Promise<Partial<PersonProfile> | null> {
  const name = cleanName(rawName);
  if (!name || name.split(/\s+/).length < 2) return null; // need at least first+last name

  const cacheKey = `${name}|${hints.join(',')}`;
  const hit = profileCache.get(cacheKey);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.value;

  // 1) Direct summary lookup by underscored name
  const slug = encodeURIComponent(name.replace(/\s+/g, '_'));
  const direct = await wikipediaJson<WikiSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}?redirect=true`);

  const usable = (s: WikiSummary | null) => {
    if (!s || !s.extract) return false;
    if (s.type === 'disambiguation') return false;
    if (s.type && s.type !== 'standard') return false;
    return true;
  };

  let summary: WikiSummary | null = null;
  if (usable(direct) && looksLikeMatch(direct, hints)) {
    summary = direct;
  } else {
    // 2) Fall back to opensearch with hints
    const q = encodeURIComponent(`${name} ${hints.slice(0, 2).join(' ')}`);
    const search = await wikipediaJson<[string, string[], string[], string[]]>(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=3&namespace=0&format=json`,
    );
    if (search && Array.isArray(search[1])) {
      for (const candidate of search[1]) {
        if (candidate.split(/\s+/).length < 2) continue;
        const slug2 = encodeURIComponent(candidate.replace(/\s+/g, '_'));
        const s2 = await wikipediaJson<WikiSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug2}?redirect=true`);
        if (usable(s2) && looksLikeMatch(s2, [...hints, name.split(/\s+/).slice(-1)[0]])) {
          summary = s2;
          break;
        }
      }
    }
  }

  if (!summary) {
    profileCache.set(cacheKey, { value: null, expiresAt: now + PROFILE_TTL });
    return null;
  }

  const profile: Partial<PersonProfile> = {
    bio: summary.extract,
    bioSource: 'wikipedia',
    wikipediaUrl: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
    thumbnailUrl: summary.thumbnail?.source ?? null,
    wikiDescription: summary.description ?? null,
  };
  profileCache.set(cacheKey, { value: profile, expiresAt: now + PROFILE_TTL });
  return profile;
}

// ── Wikidata fallback for companies without SEC officer disclosures ──

import { findCompanyQid, getCompanyOfficers, findPersonQid, enrichPerson, type WikidataPerson } from './wikidata';
import { findResearcher } from './openalex';

// ── Technical-signal heuristics ─────────────────────────────────

const ELITE_SCHOOL_PATTERNS = [
  /\btechnion\b/i,
  /\bweizmann\b/i,
  /\bhebrew university\b/i,
  /\btel aviv university\b/i,
  /\bben-?gurion university\b/i,
  /\bidc herzliya\b|\breichman university\b/i,
  /\bmit\b|\bmassachusetts institute of technology\b/i,
  /\bstanford\b/i,
  /\bharvard\b/i,
  /\bprinceton\b/i,
  /\bcaltech|california institute of technology\b/i,
  /\bberkeley\b/i,
  /\bcarnegie mellon\b/i,
  /\boxford\b/i, /\bcambridge\b/i, /\bimperial college\b/i,
  /\bcolumbia university\b/i, /\byale\b/i, /\bcornell\b/i, /\bjohns hopkins\b/i,
  /\beth zurich\b|\bswiss federal institute of technology\b/i,
  /\binsead\b/i, /\blondon business school\b/i, /\bwharton\b/i,
];
const TOP_TECH_EMPLOYERS = [
  /\bgoogle\b/i, /\balphabet\b/i,
  /\bmeta\b|\bfacebook\b/i,
  /\bmicrosoft\b/i,
  /\bapple\b/i,
  /\bamazon\b|\baws\b/i,
  /\bnvidia\b/i,
  /\bintel\b/i, /\bmellanox\b/i,
  /\bibm\b/i,
  /\boracle\b/i,
  /\bsalesforce\b/i,
  /\bcisco\b/i,
  /\bvmware\b/i,
  /\bsap\b/i,
  /\bsiemens\b/i,
  /\bnetflix\b/i,
  /\bnokia\b/i,
  /\bqualcomm\b/i,
  /\btsmc\b/i, /\bsamsung\b/i, /\bsony\b/i,
  /\bairbnb\b/i, /\buber\b/i, /\bstripe\b/i,
  /\bbain & company\b/i, /\bmckinsey\b/i, /\bbcg\b/i, /\bgoldman sachs\b/i, /\bjpmorgan\b/i,
];
const MILITARY_TECH = [
  /\bunit 8200\b/i,
  /\btalpiot\b/i,
  /\bmamram\b/i,
  /\bidf\b.*\b(intelligence|cyber|sigint)\b/i,
  /\bidf c4i\b/i,
  /\bmafat\b/i,
];
const RESEARCHER_OCCUPATIONS = [
  /\b(computer|data|materials?|biomedical|chemical|electrical|biomedical|software|systems?)? ?scientist\b/i,
  /\bresearcher\b/i,
  /\bprofessor\b/i,
  /\bpostdoc/i,
  /\bphd\b|doctoral/i,
  /\binventor\b/i,
  /\bengineer\b/i,
  /\bmathematician\b/i,
  /\bphysicist\b/i,
  /\bchemist\b/i,
  /\bbiologist\b/i,
];

function matchAll(haystack: string[], patterns: RegExp[]): string[] {
  const out = new Set<string>();
  for (const h of haystack) {
    for (const p of patterns) {
      const m = h.match(p);
      if (m) out.add(h);
    }
  }
  return Array.from(out);
}

function matchText(text: string, patterns: RegExp[]): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) out.push(m[0]);
  }
  return unique(out);
}

function computeTechSignals(p: Pick<PersonProfile, 'education' | 'priorEmployers' | 'occupations' | 'fields' | 'awards' | 'bio' | 'title' | 'wikiDescription'>): TechSignals {
  const edu = p.education ?? [];
  const emp = p.priorEmployers ?? [];
  const occ = p.occupations ?? [];
  const text = [p.bio ?? '', p.wikiDescription ?? '', p.title ?? '', ...(p.fields ?? []), ...(p.awards ?? [])].join(' ');

  const eliteSchools     = matchAll(edu, ELITE_SCHOOL_PATTERNS);
  const topTechEmployers = matchAll(emp, TOP_TECH_EMPLOYERS);
  const researcherFlags  = matchAll(occ, RESEARCHER_OCCUPATIONS).concat(matchText(text, [/\bph\.?d\b|doctoral/i, /\bprofessor\b/i, /\bresearcher\b/i]));
  const militaryTechFlags = matchText(text, MILITARY_TECH);

  let score = 0;
  if (eliteSchools.length > 0)     score += 25;
  if (topTechEmployers.length > 0) score += 25;
  if (researcherFlags.length > 0)  score += 25;
  if (militaryTechFlags.length > 0)score += 15;
  if ((p.awards ?? []).length > 0) score += 10;
  score = Math.min(100, score);

  return {
    eliteSchools,
    topTechEmployers,
    researcherFlags: unique(researcherFlags),
    militaryTechFlags,
    hasResearch: researcherFlags.length > 0,
    isElite: eliteSchools.length > 0 || topTechEmployers.length > 0,
    techScore: score,
  };
}

function wikidataPersonToProfile(p: WikidataPerson): PersonProfile {
  const title = p.positionLabel ?? 'Officer';
  const klass = classify(title);
  const base: PersonProfile = {
    name: p.name,
    title,
    age: undefined,
    totalPay: undefined,
    yearBorn: p.birthDate ? Number(p.birthDate.slice(0, 4)) || undefined : undefined,
    ...klass,
    qid: p.qid,
    occupations: p.occupations,
    education: p.educationLabel,
    priorEmployers: p.priorEmployersLabel,
    awards: p.awards,
    notableWorks: p.notableWorks,
    fields: p.fields,
    bio: p.wikipediaExtract ?? p.description ?? undefined,
    bioSource: p.wikipediaExtract ? 'wikipedia' : 'wikidata',
    wikipediaUrl: p.wikipediaUrl ?? null,
    thumbnailUrl: p.imageUrl ?? null,
    wikiDescription: p.description ?? null,
  };
  base.techSignals = computeTechSignals(base);
  return base;
}

/**
 * Enrich a SEC/Yahoo officer with Wikidata facts (education, prior employers,
 * awards, full bio) when we can find a confident QID match. Computes the
 * technical-signal scorecard for everyone.
 */
async function enrichWithWikidata(
  base: PersonProfile,
  companyQid: string | null,
  companyName: string,
): Promise<PersonProfile> {
  // Only bother for senior people — saves rate budget on a 10-person grid.
  if (base.seniority < 50 && !base.isTechnical && !base.isFounder) {
    base.techSignals = computeTechSignals(base);
    return base;
  }
  // Strip honorifics AND military ranks before searching Wikidata.
  const cleanedName = base.name
    .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.|Sir|Lord|Lady|Hon\.|Rev\.)\s+/i, '')
    .replace(/^(Brig\.?\s?Gen\.?|Maj\.?\s?Gen\.?|Lt\.?\s?Gen\.?|Lt\.?\s?Col\.?|Maj\.?|Col\.?|Cpt\.?|Capt\.?|Cmdr\.?|Gen\.?|Adm\.?)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const qid = await findPersonQid(cleanedName, {
    companyName,
    companyQid: companyQid ?? undefined,
  }).catch(() => null);
  if (!qid) {
    base.techSignals = computeTechSignals(base);
    return base;
  }
  const enrichment = await enrichPerson(qid).catch(() => ({} as Partial<WikidataPerson>));
  const next: PersonProfile = {
    ...base,
    qid,
    occupations:    enrichment.occupations ?? base.occupations,
    education:      enrichment.educationLabel ?? base.education,
    priorEmployers: enrichment.priorEmployersLabel ?? base.priorEmployers,
    awards:         enrichment.awards ?? base.awards,
    notableWorks:   enrichment.notableWorks ?? base.notableWorks,
    fields:         enrichment.fields ?? base.fields,
    wikipediaUrl:   enrichment.wikipediaUrl ?? base.wikipediaUrl,
    bio:            enrichment.wikipediaExtract ?? enrichment.description ?? base.bio,
    bioSource:      enrichment.wikipediaExtract ? 'wikipedia' : (enrichment.description ? 'wikidata' : base.bioSource),
    wikiDescription: enrichment.description ?? base.wikiDescription,
    thumbnailUrl:   enrichment.imageUrl ?? base.thumbnailUrl,
  };
  next.techSignals = computeTechSignals(next);

  // Researcher credential lookup — only fire when the heuristic strongly suggests
  // a research background (PhD / Professor / Scientist / Engineer w/ academic hint).
  if (next.techSignals.hasResearch || next.isTechnical || (next.occupations ?? []).some(o => /scientist|engineer|inventor|professor|researcher/i.test(o))) {
    const research = await findResearcher(cleanedName, {
      institutions: next.education,
      fields: next.fields,
    }).catch(() => null);
    if (research) {
      next.research = {
        url: research.url,
        orcid: research.orcid,
        works: research.worksCount,
        citations: research.citationCount,
        hIndex: research.hIndex,
        i10Index: research.i10Index,
        topConcepts: research.topConcepts,
        topAffiliations: research.topAffiliations,
      };
      // Boost tech score for real researchers — papers and citations are the
      // hardest objective evidence of technical depth.
      const bonus = Math.min(40, Math.floor(research.citationCount / 50) + (research.hIndex ?? 0));
      next.techSignals = {
        ...next.techSignals,
        techScore: Math.min(100, next.techSignals.techScore + bonus),
        hasResearch: true,
      };
    }
  }
  return next;
}

export async function getOfficersFromWikidata(companyName: string, shortName?: string): Promise<PersonProfile[]> {
  const candidates = unique([companyName, shortName ?? '']).filter(Boolean);
  for (const name of candidates) {
    const qid = await findCompanyQid(name);
    if (!qid) continue;
    const people = await getCompanyOfficers(qid, { limit: 10 });
    if (people.length > 0) return people.map(wikidataPersonToProfile);
  }
  return [];
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ── Public entry point ───────────────────────────────────────────

export async function enrichOfficers(
  officers: Officer[],
  hints: { companyName: string; shortName?: string; tickers?: string[] },
): Promise<PersonProfile[]> {
  const allHints = [hints.companyName, hints.shortName ?? '', ...(hints.tickers ?? [])].filter(Boolean);

  // Find the company's Wikidata QID once so person searches can be scoped to
  // its employees/officers — dramatically reduces false-positive matches.
  const companyQid = await findCompanyQid(hints.companyName).catch(() => null);

  const base = await Promise.all(
    officers.map(async o => {
      const klass = classify(o.title ?? '');
      const shouldLookup = klass.seniority >= 55 || klass.isFounder || klass.isCEO || klass.isTechnical;
      let wiki: Partial<PersonProfile> | null = null;
      if (shouldLookup) {
        wiki = await fetchWikipediaProfile(o.name, allHints).catch(() => null);
      }
      return { ...o, ...klass, ...(wiki ?? {}) } as PersonProfile;
    }),
  );

  // Sort first so we know which are "top" — enrich the top 6 deeply with
  // Wikidata (education, prior employers, awards). Skip the rest; sufficient
  // for the team-makeup readout.
  base.sort((a, b) => {
    if (a.seniority !== b.seniority) return b.seniority - a.seniority;
    return (b.totalPay ?? 0) - (a.totalPay ?? 0);
  });

  const enriched = await Promise.all(
    base.map(async (p, i) => {
      if (i < 6) return enrichWithWikidata(p, companyQid, hints.companyName);
      // For the rest, still compute tech signals from whatever data we have.
      const next = { ...p };
      next.techSignals = computeTechSignals(next);
      return next;
    }),
  );
  return enriched;
}

// ── Team-level summary derived from the roster ───────────────────

export type TeamMakeup = {
  total: number;
  founders: number;
  technical: number;
  business: number;
  finance: number;
  legal: number;
  withWikipedia: number;
  medianAge?: number;
  oldestYearBorn?: number;
  youngestYearBorn?: number;
  totalCompensation?: number;
};

export function teamMakeup(profiles: PersonProfile[]): TeamMakeup {
  const total = profiles.length;
  const founders = profiles.filter(p => p.isFounder).length;
  const technical = profiles.filter(p => p.isTechnical || p.role === 'cto-technical').length;
  const business = profiles.filter(p => p.role === 'business' || p.role === 'coo' || p.role === 'cmo-revenue' || p.role === 'product').length;
  const finance = profiles.filter(p => p.role === 'cfo').length;
  const legal = profiles.filter(p => p.role === 'general-counsel').length;
  const withWikipedia = profiles.filter(p => !!p.wikipediaUrl).length;
  const ages = profiles.map(p => p.age).filter((a): a is number => typeof a === 'number');
  const years = profiles.map(p => p.yearBorn).filter((y): y is number => typeof y === 'number');
  const sortedAges = [...ages].sort((a, b) => a - b);
  const medianAge = sortedAges.length ? sortedAges[Math.floor(sortedAges.length / 2)] : undefined;
  const totalCompensation = profiles.reduce((s, p) => s + (p.totalPay ?? 0), 0) || undefined;
  return {
    total,
    founders,
    technical,
    business,
    finance,
    legal,
    withWikipedia,
    medianAge,
    oldestYearBorn: years.length ? Math.min(...years) : undefined,
    youngestYearBorn: years.length ? Math.max(...years) : undefined,
    totalCompensation,
  };
}
