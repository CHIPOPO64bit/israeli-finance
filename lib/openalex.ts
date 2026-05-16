/**
 * OpenAlex — public, free, no-auth scholarly graph (200M+ works, 100M+
 * authors). Used to pull *real* research credentials for officers flagged
 * as researchers / scientists / PhDs.
 *
 *   GET https://api.openalex.org/authors?search={name}&per_page=N
 *
 *   We expose: works_count, cited_by_count, h-index, top affiliations &
 *   research concepts, ORCID. Strong objective signal of technical depth.
 */

import https from 'node:https';

const BASE = 'https://api.openalex.org';
const UA = 'BORSA-Research/1.0 (david1711ks@gmail.com)';

export type OpenAlexProfile = {
  openAlexId: string;             // e.g. "A5009126679"
  url: string;                    // OpenAlex profile URL
  orcid?: string;
  displayName: string;
  worksCount: number;
  citationCount: number;
  hIndex?: number;
  i10Index?: number;
  topAffiliations: string[];      // institution names
  topConcepts: string[];          // research topics
  firstWorkYear?: number;
};

function getJson<T>(url: string): Promise<T | null> {
  return new Promise(resolve => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, res => {
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
    req.setTimeout(8000, () => req.destroy());
  });
}

const cache = new Map<string, { value: OpenAlexProfile | null; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

type AuthorsResp = {
  meta: { count: number };
  results: {
    id: string;
    orcid?: string;
    display_name: string;
    works_count: number;
    cited_by_count: number;
    relevance_score?: number;
    summary_stats?: { h_index?: number; i10_index?: number };
    affiliations?: { institution?: { display_name?: string }; years?: number[] }[];
    x_concepts?: { display_name: string; level?: number; score?: number }[];
    counts_by_year?: { year: number; works_count: number }[];
  }[];
};

/**
 * Look up a person on OpenAlex. We're conservative — only return a hit when
 * the relevance score is meaningful AND the works count is non-trivial.
 * Otherwise we'd attach random people's research records to executives.
 */
export async function findResearcher(name: string, hints: { fields?: string[]; institutions?: string[] } = {}): Promise<OpenAlexProfile | null> {
  if (!name || name.split(/\s+/).length < 2) return null;
  const cacheKey = `oa:${name}|${(hints.fields ?? []).join(',')}|${(hints.institutions ?? []).join(',')}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const url = `${BASE}/authors?search=${encodeURIComponent(name)}&per_page=5`;
  const data = await getJson<AuthorsResp>(url);
  if (!data?.results?.length) {
    cache.set(cacheKey, { value: null, expiresAt: Date.now() + TTL_MS });
    return null;
  }

  // Score candidates: prefer high relevance + works_count >= 3 + matching affiliation hints.
  let best = null as OpenAlexProfile | null;
  let bestScore = -Infinity;
  for (const r of data.results) {
    if (r.works_count < 3) continue;
    const affs = (r.affiliations ?? []).map(a => a.institution?.display_name ?? '').filter(Boolean);
    let score = (r.relevance_score ?? 0) + r.works_count / 5 + (r.cited_by_count / 100);
    if (hints.institutions?.some(h => affs.some(a => a.toLowerCase().includes(h.toLowerCase())))) score += 1000;
    if (score > bestScore) {
      bestScore = score;
      const concepts = (r.x_concepts ?? []).slice(0, 5).map(c => c.display_name);
      const years = (r.counts_by_year ?? []).map(c => c.year).filter(y => typeof y === 'number');
      best = {
        openAlexId: r.id.replace(/^https?:\/\/openalex\.org\//, ''),
        url: r.id,
        orcid: r.orcid?.replace(/^https?:\/\/orcid\.org\//, ''),
        displayName: r.display_name,
        worksCount: r.works_count,
        citationCount: r.cited_by_count,
        hIndex: r.summary_stats?.h_index,
        i10Index: r.summary_stats?.i10_index,
        topAffiliations: Array.from(new Set(affs)).slice(0, 4),
        topConcepts: concepts,
        firstWorkYear: years.length ? Math.min(...years) : undefined,
      };
    }
  }

  // Require minimum relevance — saves us from random namesakes with 3 papers.
  if (best && (best.citationCount < 50 && best.worksCount < 8)) best = null;

  cache.set(cacheKey, { value: best, expiresAt: Date.now() + TTL_MS });
  return best;
}
