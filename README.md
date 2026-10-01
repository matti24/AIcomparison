# AI Compare

An independent, source-linked AI model database and comparison platform. Compare pricing, context windows, modalities, capabilities, benchmarks, and API access across 280+ models from 35 providers — every fact links to the page it came from.

Built with Next.js App Router, TypeScript, Tailwind CSS, Radix primitives, Recharts, Zod, and Supabase-ready PostgreSQL.

## Live deployment

- Public website: [https://ai-compare-two.vercel.app](https://ai-compare-two.vercel.app).
- Vercel project: [mattis-projects-67217926 / ai-compare](https://vercel.com/mattis-projects-67217926/ai-compare).
- Storage: Supabase Free (`ai-compare-db`, Frankfurt), with the full catalog, newsletter/waitlists, and analytics persisted in PostgreSQL. Vercel functions run in Frankfurt.
- Production admin: `/admin`. Its independent credentials are saved in the git-ignored `.data/vercel-admin.env` and configured as Vercel Secrets. Never publish that file.

The current release was deployed as an authenticated manual snapshot of the application files, not from a Git push. Changes in this workspace are not automatically published. For future Git-based deployments, connect the repository and verify that its commit authors are authorized for the Vercel project; Vercel may block deployments attributed to an unauthorized author.

Accounts, payments, and the public Data API remain intentionally gated/coming soon. Legal and contact placeholders still need the operator's details; hosting does not fill them in.

## Run locally

Use Node.js 24 LTS and npm.

```powershell
npm install
npm run setup:local      # generates a private .env.local with admin credentials
npm run dev
```

Set `NEXT_PUBLIC_SITE_URL` to the real origin (including the port) for canonical URLs, Open Graph images, robots, and sitemaps.

The app works without a database. On first request the reference catalog in [src/data](src/data) is written to `.data/catalog.json`; admin edits are persisted there. Existing saved catalogs are never overwritten automatically. After pulling new reference data, run `npm run db:seed -- --replace` (it backs up the current file first).

## Product

| Area | Route |
| --- | --- |
| Homepage: hero search, sourced trends, recent releases, popular comparisons, price overview, categories | `/` |
| Explore with URL-synced filters (provider, category, availability, modality, status, price, context), sorting, grid/table views, column selection | `/models` |
| Category landing pages (coding, reasoning, image/video generation, voice, embeddings, open source, 1M+ context, low-cost APIs, …) with derived stats, FAQ, and JSON-LD | `/models/[category]` |
| Model profile: quick stats, capability matrix, pricing, cost calculator, benchmarks + chart, versions timeline, recent changes, similar models, sources | `/models/[provider]/[model]` |
| Comparison builder and 2–4 model comparisons with sticky sections/headers/first column, “Show differences only”, objective numeric highlights, benchmark charts, calculator, generated factual summary + FAQ, copy/share, dynamic OG image | `/compare`, `/compare/a-vs-b` |
| Providers with labs vs platforms, model groups, category breakdown, release timeline | `/providers`, `/providers/[slug]` |
| Release feed (new models, updates, pricing, API features, deprecations, retirements) | `/releases` |
| Benchmark explorer (independent vs provider-reported, version/conditions/source per result) | `/benchmarks` |
| API pricing calculator and full price table | `/pricing-calculator` |
| AI Finder (4-step wizard with explained matches) | `/ai-finder` |
| Favorites and watchlist (browser storage; account sync prepared) | `/favorites`, `/watchlist` |
| Pro pricing (waitlist until billing is configured), Data API waitlist | `/pricing`, `/api` |
| Trust and legal | `/methodology`, `/about`, `/contact`, `/changelog`, `/privacy`, `/terms`, `/cookies`, `/affiliate-disclosure`, `/advertising-disclosure` |
| Admin studio (analytics dashboard, models, providers, affiliate links, sponsored placements, changelog) | `/admin` |

Global search / command palette: `Ctrl+K`, `⌘K`, or `/`. It understands intents such as “cheap coding”, “vision”, “1m context”, “open weights”, and comparisons such as “claude vs gemini”. A floating comparison tray (up to four models) persists across pages.

Old URLs keep working: `/companies/*` → `/providers/*`, `/finder` → `/ai-finder`, `/open-source`, `/image-models`, `/video-models` → category pages, and previous single-segment model URLs redirect to `/models/[provider]/[model]`.

## Data principles

Read `/methodology` for the visitor-facing version.

- Every known fact is `{ value, source: { label, url, checkedAt }, updatedAt, note? }`. Known values without a source fail validation.
- Unknown values are `null` and display as “Not disclosed” — never zero, “no”, or free.
- Prices are USD per 1M tokens at the standard tier (input, cached input, output). Non-token prices (per image/second/minute) are stored verbatim in `pricing.other`. Third-party hosted prices are labeled in notes.
- Benchmarks are stored per result with benchmark ID, score, version, evaluation date, conditions, reporter (`provider` / `independent`), and source. No combined “intelligence score”.
- Trending requires a citable `trendSource` (e.g. an official launch post). Popularity is never invented.
- Lifecycle: `active`, `preview`, `deprecated`, `retired`. Retired models stay reachable but are hidden from default lists.
- Comparison highlights mark only objective numeric extremes (lowest published price, largest context/output).

### Adding or updating reference data

Reference data lives in provider files under [src/data/providers](src/data/providers), authored with the helpers in [src/data/define.ts](src/data/define.ts). Omitted fields become explicit unknowns. Benchmark definitions are in [src/data/benchmarks.ts](src/data/benchmarks.ts).

```powershell
npx tsx scripts/check-provider-file.ts src/data/providers/openai.ts --urls   # validate one file and probe every source URL
npm run data:check                                                          # validate all provider files
```

Keep model IDs stable (they are URL slugs and database keys). Prefer official documentation, pricing pages, model cards, and announcements. The reference snapshot was verified on 2026-10-01.

## Monetization

- **Outbound / affiliate links** — every “Try” / docs / website click goes through `/go/[model|provider|sponsor]/[id]`, which counts the click (no cookies, no personal data), adds UTM parameters, and redirects to a catalog-defined destination (no open redirect). Admins manage `links` (destination URL, affiliate URL, UTM campaign, enabled). Affiliate links are disclosed on the page and use `rel="sponsored"`.
- **Sponsored placements** — slots `home`, `models`, `comparison`, `provider`, `newsletter`; always labeled “Sponsored”, never inside rankings or comparison results; scheduled with `startsAt` / `endsAt` and an enabled flag.
- **Newsletter** — “The AI Model Brief” forms on the homepage, model pages, release feed, footer, category and provider pages. Stored in `.data/subscribers.json` or the `newsletter_subscribers` table; exportable as CSV from the admin.
- **AI Compare Pro** — plans in [src/lib/billing.ts](src/lib/billing.ts). Payments are not active: the page shows a waitlist until `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, and `STRIPE_PRICE_PRO_YEARLY` are configured and a checkout route is added. The schema includes `users.plan` and `stripe_customer_id`.
- **Data API** — `/api` waitlist for a future B2B offering.

## Analytics and privacy

Product events (`page_view`, `search_performed`, `search_no_results`, `model_viewed`, `comparison_created`, `comparison_viewed`, `outbound_click`, `calculator_used`, `newsletter_subscribed`, `finder_completed`, `pro_upgrade_clicked`, `api_waitlist_joined`, `account_created`) are sent to `/api/events` only after the visitor accepts analytics in the consent banner. Events store a random per-tab session ID — no IP address, email, or name. The admin dashboard shows visitors, page views, model views, comparisons, outbound and affiliate clicks, newsletter signups, most viewed and most compared models, popular searches, and searches without results.

Legal pages use visible placeholders until you set the `NEXT_PUBLIC_LEGAL_*` / contact variables in `.env.local` (see [.env.example](.env.example)). Review them with counsel before launch.

## Accounts

Favorites, watchlists, comparisons, and recent searches work without an account (browser storage). `/sign-in` shows the coming-soon state by default, even when Marketplace installs public database keys. To opt into passwordless Supabase Auth magic links, configure the Auth Site URL and allowed redirects, then set `NEXT_PUBLIC_ACCOUNTS_ENABLED=true`, `NEXT_PUBLIC_SUPABASE_URL`, and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Account syncing and email alerts remain planned. The schema provides `users`, `favorites`, `watchlists`, `saved_comparisons`, and a `notifications` outbox with row-level security. No custom password cryptography is used.

## Catalog administration

Open `/admin` and sign in with `ADMIN_PASSWORD` from `.env.local`.

- **Analytics** — business dashboard and subscriber CSV export.
- **Models** — edit the full record or focused sections (pricing, capabilities, benchmarks, releases, editorial); deprecate, archive (retire), or reactivate. Status changes add a dated lifecycle event.
- **Providers**, **Affiliate links**, **Sponsored**, **Changelog** — JSON editors with schema validation.

Drafts stay in the browser until **Publish catalog**. Publishing validates the full snapshot, rejects stale drafts with HTTP 409, and stamps every changed model/provider with `updatedAt` and `updatedBy`. Hosted deployments need:

```text
ADMIN_PASSWORD=<16+ random characters>
ADMIN_SESSION_SECRET=<32+ random characters>
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Admin access uses a signed eight-hour HttpOnly, SameSite=Strict cookie, timing-safe password checks, same-origin mutation checks, bounded JSON bodies, and a login limiter. Use an edge rate limit or your identity provider for multi-instance deployments.

## Supabase / PostgreSQL

Local file mode is for development or a single server with persistent storage. For production:

1. Create a Supabase project and apply [supabase/schema.sql](supabase/schema.sql) (safe to reapply; it upgrades v1 schemas).
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server only.
3. Run `npm run db:seed` (or `npm run db:seed -- --replace` to load new reference data with optimistic concurrency).

The app reads/writes a validated snapshot through `get_catalog()` / `save_catalog()` (advisory lock + version check). `save_catalog()` also projects the snapshot into normalized, indexed tables — `providers`, `models`, `categories`, `model_categories`, `model_capabilities`, `model_pricing`, append-only `pricing_history`, `benchmarks`, `benchmark_results`, `release_events`, `sources`, `model_sources` (per-fact provenance, exposed as the `data_sources` view), `affiliate_links`, `sponsored_placements` — plus views `model_versions`, `model_modalities`, `page_views`, `comparison_events`, and `outbound_clicks`. Product tables (`users`, `favorites`, `watchlists`, `saved_comparisons`, `notifications`, `newsletter_subscribers`, `analytics_events`) are never touched by publishing.

All catalog deletions are scoped to snapshot model IDs or records omitted from the submitted catalog, so publishing works with Supabase REST's `pg_safeupdate` protection enabled. Do not disable that protection to work around an outdated schema; reapply the current schema instead.

Ingestion: automated synchronizers (official APIs, documentation, provider feeds) should produce provider files or catalog drafts that go through the same validation and admin review before publishing.

### Deploying the full application to Vercel

Use Node.js 24.x. [vercel.json](vercel.json) selects the Next.js framework, runs functions in Frankfurt (`fra1`) near the database, and runs `npm run build:vercel`. Before compiling, this command checks the public canonical URL, independent admin credentials, the initialized Supabase catalog, and the newsletter/analytics tables. A Vercel deployment without a database is rejected rather than falling back to ephemeral local files.

1. Sign into your Vercel account and link this working directory to a project with `npx vercel login` and `npx vercel link`. CLI deployments include the current working tree; committing or pushing is not required.
2. Connect Supabase through [Vercel Marketplace](https://supabase.com/docs/guides/integrations/vercel-marketplace), or connect an existing Supabase project. Apply [supabase/schema.sql](supabase/schema.sql) in the SQL editor.
3. Configure the Vercel project environment variables (for each deployment environment you use):
   - `SUPABASE_URL` and **either** `SUPABASE_SECRET_KEY` (current Marketplace secret) **or** `SUPABASE_SERVICE_ROLE_KEY` (legacy server-only key).
   - `ADMIN_PASSWORD` (16+ characters) and a different `ADMIN_SESSION_SECRET` (32+ characters). Use production-specific values rather than reusing your development credentials.
   - `NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app` or your actual custom-domain origin, without a path. This must be set before building because robots and public metadata use it.
4. Seed the database non-destructively with `npm run db:seed`, using the same database environment variables locally. Existing catalogs are left intact; never use `--replace` against an existing production catalog without intentionally backing up and replacing its content.
5. Run `npm run deploy:check`, then deploy the current working tree with `npx vercel --prod`. Verify the public homepage, models, comparisons, sitemaps, newsletter, and admin publishing.

[.vercelignore](.vercelignore) allowlists only application/build files. Local environment files, `.data` (including subscriber lists and backups), `.git`, editor settings, tests, and session artifacts are not uploaded. Store credentials in Vercel's server environment settings, never in source code or chat.

## SEO

- Per-page titles, descriptions, canonical URLs, Open Graph and Twitter cards; dynamic OG images for models and comparisons.
- JSON-LD: `WebSite` + search action, `BreadcrumbList`, `SoftwareApplication` (models), `Organization` (providers), `CollectionPage` + `ItemList`, and `FAQPage`.
- Comparison canonicals are order-independent; only curated combinations (popular pairs and featured flagships) are indexable, others are `noindex, follow`. Filtered explore URLs are `noindex`.
- Sitemap index at `/sitemap.xml` with `/sitemaps/{models,providers,comparisons,categories,content}.xml`, generated from the live catalog.
- Real 404 status codes for unknown models, providers, and comparisons.

## Architecture

| Area | Location |
| --- | --- |
| Pages, route handlers, OG images, sitemaps | [src/app](src/app) |
| Product UI | [src/components](src/components) |
| Types and schema (with v1 → v2 migration) | [src/lib/types.ts](src/lib/types.ts), [src/lib/catalog-schema.ts](src/lib/catalog-schema.ts) |
| Reference data | [src/data](src/data) |
| Summaries, search, filters, collections, finder, calculator | [src/lib/catalog.ts](src/lib/catalog.ts) |
| Comparison rows and generated summaries | [src/lib/comparison.ts](src/lib/comparison.ts), [src/lib/comparison-content.ts](src/lib/comparison-content.ts) |
| Catalog persistence (local file / Supabase) | [src/lib/catalog-store.ts](src/lib/catalog-store.ts) |
| Analytics, newsletter, waitlist storage | [src/lib/event-store.ts](src/lib/event-store.ts) |
| Database schema | [supabase/schema.sql](supabase/schema.sql) |
| Tests | [tests](tests) |

Pages are server-rendered. The client receives a compact model index (for search, the comparison tray, and filters) instead of the full catalog; charts are lazy-loaded.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Browser tests (against a development/test instance — the admin tests temporarily edit and then restore the catalog):

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3000"
npm run test:e2e
```

## Branding

Provider marks identify their companies, remain the property of their owners, and do not imply endorsement. Local icon assets and attribution are in [public/logos](public/logos).
