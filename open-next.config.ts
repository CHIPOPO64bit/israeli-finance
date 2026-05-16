import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No incremental cache override — Next.js's data cache is satisfied by the
// in-memory TTL caches in lib/yahoo.ts, lib/sec.ts, lib/wikidata.ts. R2 can
// be added later if we want cross-instance cache persistence; see the note
// at the bottom of wrangler.toml.
export default defineCloudflareConfig({});
