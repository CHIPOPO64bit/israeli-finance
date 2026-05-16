/**
 * Wikidata SPARQL queries — dynamic people data for *any* company that has a
 * Wikidata entry. Powers leadership lookup for TASE-only companies that have
 * no SEC filings (banks, real-estate, food, regional names…).
 *
 *   Public endpoint: https://query.wikidata.org/sparql
 *   No auth, generous rate limits (60s timeout per query).
 */

import https from 'node:https';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'BORSA-Research/1.0 (david1711ks@gmail.com)';

export type WikidataPerson = {
  qid: string;                    // Q-number, e.g. Q1234
  name: string;
  description?: string;           // "Israeli entrepreneur"
  positionLabel?: string;         // "chief executive officer", "founder", "chairperson"
  positionStart?: string;         // ISO date
  positionEnd?: string;           // ISO date or null = present
  birthDate?: string;
  occupations?: string[];
  educationLabel?: string[];      // alma maters
  priorEmployersLabel?: string[]; // P108 employer history
  awards?: string[];              // P166 awards received
  notableWorks?: string[];        // P800 notable works
  positionsHeld?: string[];       // P39 positions (CEO at X, board at Y)
  fields?: string[];              // P101 field of work
  doctoralAdvisor?: string[];     // P184 (PhD signal)
  wikipediaUrl?: string;
  wikipediaExtract?: string;      // longer bio from Wikipedia REST
  imageUrl?: string;
};

// ── HTTP + cache ─────────────────────────────────────────────────

function httpsGetJson<T>(url: string): Promise<T | null> {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/sparql-results+json,application/json;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      },
    }, res => {
      if (!res.statusCode || res.statusCode >= 400) { res.resume(); return resolve(null); }
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T); }
        catch { resolve(null); }
      });
      res.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15_000, () => req.destroy());
  });
}

type SparqlBinding = Record<string, { value: string; type?: string }>;
type SparqlResponse = { results?: { bindings?: SparqlBinding[] } };

async function sparql(query: string): Promise<SparqlBinding[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const data = await httpsGetJson<SparqlResponse>(url);
  return data?.results?.bindings ?? [];
}

const cache = new Map<string, { value: unknown; expiresAt: number }>();
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;
  const value = await fn();
  cache.set(key, { value, expiresAt: now + ttl });
  return value;
}

// ── Find a company's Wikidata QID by name ────────────────────────

export async function findCompanyQid(name: string): Promise<string | null> {
  if (!name) return null;
  return cached(`wd:qid:${name}`, 24 * 60 * 60 * 1000, async () => {
    // 1) Direct site-link by exact label, prefer items that are instances of
    //    "company" (Q4830453) / "public company" (Q891723) / "business" (Q4830453).
    const q = `
      SELECT ?item WHERE {
        ?item rdfs:label "${name.replace(/"/g, '\\"')}"@en .
        ?item wdt:P31/wdt:P279* wd:Q4830453 .
        OPTIONAL { ?item wdt:P17 ?country }
      }
      LIMIT 1
    `;
    const rows = await sparql(q);
    if (rows[0]?.item?.value) {
      const m = rows[0].item.value.match(/Q\d+$/);
      return m?.[0] ?? null;
    }
    // 2) wbsearchentities — fuzzy fallback.
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&format=json&limit=5`;
    const data = await httpsGetJson<{ search?: { id: string; description?: string; label?: string }[] }>(url);
    const hit = data?.search?.find(r => /company|corporation|firm|israeli|tase/i.test(r.description ?? '')) ?? data?.search?.[0];
    return hit?.id ?? null;
  });
}

// ── Get officers of a Wikidata company ───────────────────────────

const POSITION_PROPS: Record<string, string> = {
  CEO:         'P169',
  founder:     'P112',
  chairperson: 'P488',
  board:       'P3320',
};

export async function getCompanyOfficers(qid: string, opts: { limit?: number } = {}): Promise<WikidataPerson[]> {
  if (!qid) return [];
  return cached(`wd:officers:${qid}`, 24 * 60 * 60 * 1000, async () => {
    // Combined query: CEO + founders + chairperson + board members in one round-trip.
    const props = Object.values(POSITION_PROPS).map(p => `wdt:${p}`).join(' | ');
    const query = `
      SELECT DISTINCT ?person ?personLabel ?personDescription ?birth ?image
             ?role ?roleLabel ?wikipedia
      WHERE {
        wd:${qid} (${props}) ?person .
        OPTIONAL { ?person wdt:P569 ?birth }
        OPTIONAL { ?person wdt:P18  ?image }
        OPTIONAL {
          wd:${qid} ?p ?person .
          ?prop wikibase:directClaim ?p ; rdfs:label ?roleLabel .
          FILTER (LANG(?roleLabel) = "en")
          BIND(?prop AS ?role)
        }
        OPTIONAL {
          ?wikipedia schema:about ?person ;
                     schema:isPartOf <https://en.wikipedia.org/> .
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT ${opts.limit ?? 12}
    `;
    const rows = await sparql(query);
    const byQid = new Map<string, WikidataPerson>();
    for (const r of rows) {
      const personIri = r.person?.value;
      if (!personIri) continue;
      const m = personIri.match(/Q\d+$/);
      if (!m) continue;
      const pq = m[0];
      const existing = byQid.get(pq);
      const role = r.roleLabel?.value;
      const merged: WikidataPerson = existing ?? {
        qid: pq,
        name: r.personLabel?.value ?? pq,
        description: r.personDescription?.value,
        birthDate: r.birth?.value,
        imageUrl: r.image?.value
          ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(r.image.value.split('/').pop()!)}?width=200`
          : undefined,
        wikipediaUrl: r.wikipedia?.value,
        positionLabel: role,
      };
      if (existing && role) {
        const labels = (existing.positionLabel ?? '').split(', ').filter(Boolean);
        if (!labels.includes(role)) labels.push(role);
        existing.positionLabel = labels.join(', ');
      }
      byQid.set(pq, merged);
    }
    return Array.from(byQid.values());
  });
}

// ── Find a person QID by name (with company hint to disambiguate) ────

export async function findPersonQid(name: string, hints: { companyName?: string; companyQid?: string } = {}): Promise<string | null> {
  if (!name || name.split(/\s+/).length < 2) return null;
  const key = `wd:person:qid:${name}|${hints.companyName ?? ''}|${hints.companyQid ?? ''}`;
  return cached(key, 24 * 60 * 60 * 1000, async () => {
    const cName = hints.companyName?.toLowerCase();
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&format=json&limit=8`;
    const data = await httpsGetJson<{ search?: { id: string; description?: string; label?: string }[] }>(url);
    const candidates = data?.search ?? [];
    if (!candidates.length) return null;

    // Negative filter — drop obvious wrong-profession namesakes.
    const negativeRe = /\b(footballer|cricketer|musician|singer|actor|actress|painter|sculptor|poet|novelist|playwright|monk|priest|rabbi|politician|senator|admiral|baseball|basketball|hockey|tennis|olympic|saint|king|queen|prince|princess|sultan|emperor)\b/i;
    const surviving = candidates.filter(c => !negativeRe.test(c.description ?? ''));
    if (!surviving.length) return null;

    // 1) Description mentions the company name explicitly.
    const byCompany = cName ? surviving.find(c => (c.description ?? '').toLowerCase().includes(cName)) : null;
    if (byCompany) return byCompany.id;

    // 2) Description matches an executive / entrepreneur / engineer pattern.
    const execLikeRe = /\b(entrepreneur|businessman|businesswoman|engineer|scientist|executive|founder|chairman|chairperson|director|programmer|investor|computer scientist)\b/i;
    const byExec = surviving.find(c => execLikeRe.test(c.description ?? ''));
    if (byExec) return byExec.id;

    // 3) Default to the first surviving candidate (label match is exact).
    return surviving[0].id;
  });
}

// ── Enrich a single person with deeper Wikidata + Wikipedia facts ────

export async function enrichPerson(qid: string): Promise<Partial<WikidataPerson>> {
  if (!qid) return {};
  return cached(`wd:person:enrich:${qid}`, 24 * 60 * 60 * 1000, async () => {
    const q = `
      SELECT DISTINCT ?occLabel ?eduLabel ?empLabel ?awardLabel ?workLabel ?fieldLabel ?descLabel ?image ?wikipedia
      WHERE {
        OPTIONAL { wd:${qid} wdt:P106 ?occ }
        OPTIONAL { wd:${qid} wdt:P69 ?edu }
        OPTIONAL { wd:${qid} wdt:P108 ?emp }
        OPTIONAL { wd:${qid} wdt:P166 ?award }
        OPTIONAL { wd:${qid} wdt:P800 ?work }
        OPTIONAL { wd:${qid} wdt:P101 ?field }
        OPTIONAL { wd:${qid} schema:description ?descLabel . FILTER (LANG(?descLabel) = "en") }
        OPTIONAL { wd:${qid} wdt:P18 ?image }
        OPTIONAL {
          ?wikipedia schema:about wd:${qid} ;
                     schema:isPartOf <https://en.wikipedia.org/> .
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 60
    `;
    const rows = await sparql(q);
    const occupations = unique(rows.map(r => r.occLabel?.value).filter(Boolean) as string[]);
    const education   = unique(rows.map(r => r.eduLabel?.value).filter(Boolean) as string[]);
    const employers   = unique(rows.map(r => r.empLabel?.value).filter(Boolean) as string[]);
    const awards      = unique(rows.map(r => r.awardLabel?.value).filter(Boolean) as string[]);
    const works       = unique(rows.map(r => r.workLabel?.value).filter(Boolean) as string[]);
    const fields      = unique(rows.map(r => r.fieldLabel?.value).filter(Boolean) as string[]);
    const description = rows[0]?.descLabel?.value;
    const image = rows[0]?.image?.value;
    const wikipediaUrl = rows[0]?.wikipedia?.value;

    // Pull a richer Wikipedia extract if we have a page link.
    let wikipediaExtract: string | undefined;
    if (wikipediaUrl) {
      const slug = decodeURIComponent(wikipediaUrl.split('/').pop()!);
      const sum = await httpsGetJson<{ extract?: string; thumbnail?: { source?: string } }>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}?redirect=true`,
      );
      wikipediaExtract = sum?.extract;
    }

    return {
      occupations,
      educationLabel: education,
      priorEmployersLabel: employers,
      awards,
      notableWorks: works,
      fields,
      description,
      imageUrl: image
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image.split('/').pop()!)}?width=240`
        : undefined,
      wikipediaUrl,
      wikipediaExtract,
    };
  });
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
