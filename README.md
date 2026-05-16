# BORSA — Atlas of Israeli Public Companies

A working terminal for Israeli public companies — financials as filed, the
people who run them, and links to primary disclosures. **No predictions, no
price targets, only the books.**

```
75 companies · 14 sectors · TASE · NASDAQ · NYSE
Updates every 5 minutes · Server-cached
```

## What it does

- **Search any Israeli public company** — by ticker, English name, Hebrew name, or shortname. `/` from anywhere to focus.
- **Filter by sector** — Software, Cybersecurity, Semis, Pharma, Defense, Energy, Banking, Insurance, Real Estate, Telecom, Industrials, Retail, Shipping, Fintech.
- **Real breakdown per company** — live quote, 1-year price chart with adjustable range, 6 KPI tiles (revenue, margin, P/E, ROE, debt/equity, employees), business profile, annual + quarterly P&L, balance sheet, cash flow, named officers with titles and compensation.
- **Primary sources, surfaced** — every detail page links straight to MAYA (TASE disclosures), MAGNA (ISA), the SEC for dual-listed names, and the company's own IR site. We don't summarise the filings; we link you to them.

## Stack

- **Next.js 16** (App Router, RSC, Turbopack)
- **Tailwind CSS v4** for tokens; bespoke design system in `app/globals.css`
- **Typography** — Fraunces (display serif), Geist (sans), JetBrains Mono (numerics), Frank Ruhl Libre (Hebrew)
- **Data** — `yahoo-finance2` for live quotes / fundamentals / officers; deep links to TASE MAYA & ISA MAGNA for filings
- **Charts** — Recharts
- **Caching** — 5-minute in-memory TTL per process (quote batch + per-symbol snapshot)

## Run

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build
npm run start  # production server
```

## Architecture

```
app/
  layout.tsx               root layout + fonts
  page.tsx                 home — ticker, hero, sector filter, company grid
  globals.css              design tokens (ink ladder, accents, motion)
  c/[symbol]/
    page.tsx               company detail
    loading.tsx            shimmer skeleton
    not-found.tsx          404
lib/
  companies.ts             curated catalog of 75 Israeli companies
  sectors.ts               14 sector taxonomy with hues + glyphs + Hebrew labels
  yahoo.ts                 Yahoo Finance wrapper + cache + types
  format.ts                ILS/USD/ILA money, percentages, dates
components/
  Header.tsx               flag-strip, brand mark, nav
  Footer.tsx               sources & colophon
  Ticker.tsx               marquee of live featured prices
  SearchBar.tsx            client autocomplete (EN+HE), keyboard nav, `/` shortcut
  SectorFilter.tsx         chip filter with counts + sector glyphs
  CompanyCard.tsx          grid tile (sector, name EN/HE, ticker, market cap, 1D)
  PriceChart.tsx           Recharts area chart with 1M/3M/6M/1Y range
  MetricTile.tsx           KPI tile with eyebrow / value / sub
  LeadershipPanel.tsx      officers, scored by seniority, initials + comp
  FinancialsTable.tsx      tabbed Annual / Quarterly / Balance / Cash Flow
  ReportsPanel.tsx         primary-source links (MAYA, MAGNA, SEC, IR)
  SectorBadge.tsx          coloured sector tag
```

## Currency handling

TASE quotes come back from Yahoo as **agorot** (currency code `ILA`, 1/100 ILS).
We normalise to shekel at the display layer (`lib/format.ts`), so a TASE listing at
`₪74.69` is what's shown — not "7,469". US listings remain in USD untouched. We
never silently mix currencies.

## Adding a company

Edit `lib/companies.ts` — each row carries the primary Yahoo ticker (`symbol`),
optional TASE ticker (`symbolTA`), sector key, Hebrew + English names, and
optional metadata (founded year, HQ, tagline, website). The catalog drives the
search, the grid, and the sector counts.

## Data attribution

- **Financials** — for SEC-listed Israeli companies (35 of them, including Teva, Check Point, NICE, Wix, monday, JFrog, ICL, Elbit, Tower Semi, ZIM, Lemonade, Pagaya, …): pulled directly from **SEC EDGAR** and **SEC XBRL companyfacts** — the same machine-readable numbers the company filed in its 10-K / 20-F / 10-Q. Every row in the Financials table links to its source filing.
- **Live quotes & company descriptions** — Yahoo Finance via `yahoo-finance2`.
- **Officer profiles** — names & titles from the SEC; biographies & photos from Wikipedia where the person has a public page.
- **TASE disclosures** — deep links into MAYA and the ISA's MAGNA portal.
- BORSA is a research tool. Not investment advice.

## Deploying to Cloudflare

The app is configured for one-click deploy as a Cloudflare Worker via
`@opennextjs/cloudflare`. The Worker bundles Next.js (server-side rendering,
data fetching from SEC + Yahoo + Wikipedia) and serves the static assets.

```bash
# Local production-equivalent preview
npm run cf:preview

# Manual deploy (requires CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
npm run cf:deploy
```

### CI/CD via GitHub Actions

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) deploys on every
push to `main`. It:

1. Builds the Next.js app (`next build`)
2. Bundles it into a Worker (`opennextjs-cloudflare build`)
3. Ensures the R2 cache bucket exists
4. Deploys via `wrangler deploy`

**Required GitHub secrets**:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template, scope to your account |
| `CLOUDFLARE_ACCOUNT_ID` | Right sidebar on any zone or worker page in the dashboard |

### Pointing finance.hyperbolic.center at the Worker

After first deploy:

1. Cloudflare dashboard → Workers & Pages → `borsa` → **Settings → Triggers → Custom Domains**.
2. Add `finance.hyperbolic.center`.
3. Cloudflare will auto-provision the TLS cert and add the route.

(If `hyperbolic.center` is on a *different* Cloudflare account, add a CNAME from `finance` to `borsa.<your-subdomain>.workers.dev` instead.)

## What it deliberately does **not** do

- No "price targets," no analyst-consensus drag-the-arrow charts, no
  sentiment-of-the-day. It links to the filings — *those* are the source of
  truth.
- No silent currency conversions or unit shenanigans. If a number is in
  agorot, the page shows shekels and says so.
- No fake "AI summary" of an annual report — read the report.
