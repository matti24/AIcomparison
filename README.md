# AI Compare

A source-linked, independent AI model directory and comparison app. Built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Radix primitives, and Supabase-ready PostgreSQL persistence.

## Run locally

Use Node.js 24 LTS and npm.

```powershell
npm install
npm run setup:local
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001). The included **AI Compare: development server** VS Code task uses port 3001 because port 3000 was already occupied in the original workspace. Normal `npm run dev` starts on the first available Next.js development port.

The local setup generates a private, git-ignored `.env.local` containing random admin credentials. It never overwrites an existing environment file or prints credentials. Set `NEXT_PUBLIC_SITE_URL` to the actual origin, including the port, for canonical URLs, social metadata, robots, and the sitemap.

The initial app works without database credentials. Its editable reference dataset lives in [src/data/catalog.ts](src/data/catalog.ts). In local mode, published admin changes are persisted to `.data/catalog.json`; when no saved catalog exists, the seed is used. Existing saved catalogs are not overwritten when the seed changes.

## What works

- Responsive homepage with source-linked model cards, editorial trend collections, recent releases, coding, multimodal, and open-model collections.
- Search by model, provider, product, capability, or documented shortcuts such as `cheap API`, `models with video`, and `open source reasoning`.
- Directory filters, URL-persisted sorting, card/table views, and meaningful empty states.
- Two-to-four-model comparison with difference highlighting, source links, swapping, adding, sharing, copying, and swipeable mobile cards.
- Shareable version-specific URLs: `/compare/model-a-vs-model-b`.
- Individual model profiles with capabilities, pricing, independently recorded benchmarks, release timelines, source notes, and related models.
- Company profiles that distinguish companies, products, and individual model versions.
- Two-step model finder with explained, rule-based recommendations and an explicit no-match state.
- Local-browser favorites, recently viewed models, comparison selections, and a watchlist release/update feed.
- Light/dark mode, keyboard search (`Ctrl+K` / `Cmd+K`), accessible dialogs, technical tooltips, responsive loading states, error states, and reduced-motion support.
- Protected admin studio for adding/updating providers and model versions, prices, capabilities, benchmarks, editorial selections, and release events.
- Per-model and per-comparison metadata, Open Graph image, robots rules, and a dynamically generated sitemap.

## Data principles

Read the app's `/methodology` page for the visitor-facing explanation.

- Known technical and pricing facts include `{ value, source, updatedAt, note? }`.
- Sources include `{ label, url, checkedAt }`.
- Unknown values are `null`, never fabricated or treated as zero/false/free.
- Prices are USD per million tokens where that billing unit applies. Image/video or hosting costs with different billing units are not converted to invented token rates.
- Product subscriptions are separate from model API pricing.
- Open weights and open-source licenses are different categories.
- Benchmark entries remain separate, each with a name, reported score, date, source, and optional methodology note. There is no combined "AI score."
- "Trending", "most popular", coding picks, and popular comparison starting points are explicitly editorial, not observed traffic, market share, or performance rankings.
- The catalog is a curated snapshot, not a live provider synchronization service. Check fact-level dates and official sources before making a purchasing or deployment decision.
- Deprecated model versions remain searchable; preview versions are labeled.
- Finder performance is an editorial use-case fit, not an objective best-model claim. A speed-based recommendation needs a documented speed category.
- The search shortcut `cheap` means input price at most $1/1M tokens; `large context` means at least 128,000 tokens. Unknown specifications do not match supported-capability filters.

## Catalog administration

Open `/admin` and sign in with the `ADMIN_PASSWORD` value from your private `.env.local`.

For a hosted deployment, configure:

```text
ADMIN_PASSWORD=<a strong random value of at least 16 characters>
ADMIN_SESSION_SECRET=<an independent random value of at least 32 characters>
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

Never prefix server credentials with `NEXT_PUBLIC_`, commit `.env.local`, or expose a Supabase service-role key to browser code.

### Editing workflow

1. Sign in to the catalog studio.
2. Choose **Model versions** or **Providers**.
3. Add a new record, or open **Details**, **Pricing**, **Capabilities**, **Benchmarks**, or **Releases** on an existing model.
4. Edit the structured JSON in the focused editor. Its data guide and validation errors describe required fields.
5. Choose **Validate & apply** to update the in-memory draft.
6. Choose **Publish catalog** to persist the complete validated snapshot.

All known facts need provenance. New-model templates intentionally start with unknown specifications. Add source-backed facts rather than copying assumptions from a different model version. Keep record IDs stable, use unique URL slugs without `-vs-`, and use an existing provider ID. Retire a model with `status: "deprecated"` rather than removing its historical record.

Providers can use a local `/logos/name.svg` (also PNG or WebP) or `logo: ""` for the built-in name monogram. Remote logo URLs are rejected. A new company does not require a logo upload or a UI redesign.

Publishing checks `expectedUpdatedAt` and rejects stale edits with HTTP 409. Export your draft before reloading and merging someone else's changes. A publication error leaves the draft intact; the UI never reports an unsuccessful save as published. Browser refresh warns about unpublished changes, but drafts are not a replacement for a saved export.

Admin access uses a signed eight-hour, HttpOnly, SameSite=Strict cookie, timing-safe password verification, bounded JSON requests, same-origin mutation checks, and a login-attempt limit. Production cookies require HTTPS. Changing the password or session secret invalidates existing sessions.

If you deploy behind a reverse proxy, preserve the original `Host` header and HTTPS forwarding so same-origin checks see the browser-facing authority and scheme. Arbitrary forwarded-host headers are not trusted.

The built-in login limiter is process-local and deliberately does not trust spoofable forwarded IP headers. For a multi-instance public deployment, also use a shared edge/reverse-proxy rate limit or replace the single-admin auth adapter with your organization's identity provider.

## Supabase / PostgreSQL

Local filesystem mode is for a local machine or one Node server with persistent writable storage. **Do not rely on local file persistence in an ephemeral/serverless or multi-instance deployment.**

To use Supabase:

1. Create a Supabase project.
2. Apply [supabase/schema.sql](supabase/schema.sql) using the project's SQL editor.
3. Set both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment.
4. Run `npm run db:seed` with those variables loaded.
5. Restart the app and confirm the admin studio displays **Supabase** storage.

The schema/store pair uses a transactional catalog snapshot with optimistic concurrency and structured provider/model records. Relational catalog surfaces expose capabilities, prices, sources, benchmark entries, model releases, and editorial trends. Favorites have a separate future account-backed storage surface; the current app intentionally saves personal watchlists only in the browser.

Both Supabase variables must be set together. Database errors are surfaced rather than silently falling back to seed/local data. The browser never receives the service-role key, and no hosted database is provisioned automatically.

For a self-hosted local-file deployment, `AI_COMPARE_DATA_DIR` can point to a writable persistent directory (absolute or relative to the process working directory). Runtime catalog files are not traced into the production bundle. Local publication uses an atomic replacement and a filesystem lock; Supabase publication uses a transaction and a PostgreSQL advisory lock. The seed command is non-destructive when an existing catalog is present.

The app does not fetch external AI providers at runtime, send watchlist notification emails, or claim live trend/usage data. Release events and verified changes entered by an editor feed the watchlist; a future notification worker can consume those events without changing the UI's model data contract.

## Architecture

| Area | Location |
| --- | --- |
| App Router pages and API routes | [src/app](src/app) |
| Reusable product UI | [src/components](src/components) |
| shadcn/ui primitives | [src/components/ui](src/components/ui) |
| Provider/model/fact contracts | [src/lib/types.ts](src/lib/types.ts) |
| Editable seed catalog | [src/data/catalog.ts](src/data/catalog.ts) |
| Strict catalog validation | [src/lib/catalog-schema.ts](src/lib/catalog-schema.ts) |
| Local/Supabase persistence | [src/lib/catalog-store.ts](src/lib/catalog-store.ts) |
| Shared filters, search, sorting, finder | [src/lib/catalog.ts](src/lib/catalog.ts) |
| Comparison row definitions | [src/lib/comparison.ts](src/lib/comparison.ts) |
| Browser persistence and app state | [src/lib/browser-store.ts](src/lib/browser-store.ts), [src/components/app-provider.tsx](src/components/app-provider.tsx) |
| Admin auth and bounded requests | [src/lib/admin-auth.ts](src/lib/admin-auth.ts), [src/lib/admin-http.ts](src/lib/admin-http.ts) |
| Database schema | [supabase/schema.sql](supabase/schema.sql) |
| Unit and browser tests | [tests](tests) |

Add model/provider records to the seed or studio, not UI components. Cards, filters, profiles, comparison rows, and the finder derive their content from the shared catalog. Popular comparison shortcuts select actual model versions from provider families; the comparison page itself is fully dynamic.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

The included **AI Compare: production build** VS Code task runs the production build.

For browser tests, start the application first:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_BASE_URL = "http://localhost:3001"
npm run test:e2e
```

The Playwright suite covers discovery, filters, sorting, global keyboard search, two-to-four-model comparisons, swapping, link sharing, watchlist persistence, the finder, themes, company pages, invalid URLs, mobile layout, and protected admin publishing with conflict rejection.

Authenticated browser tests load the private local admin password from `.env.local`; that test is skipped if credentials are not configured. It temporarily updates one model and restores the original catalog in a `finally` block. Run these tests only against a development/test instance, never a production catalog.

For a production server:

```powershell
npm run build
npm run start -- --port 3001
```

Supabase deployment requires your own project credentials and infrastructure validation. The local app and persistence can be tested without them.

## Branding

Provider marks are used to identify their respective companies. They remain the property of their respective owners and do not imply endorsement. Local icon assets and their upstream attribution/license are in [public/logos](public/logos).
