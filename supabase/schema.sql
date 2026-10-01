-- AI Compare / Supabase Postgres 15+  (schema v2)
-- Apply in the Supabase SQL editor, then run: npm run db:seed
-- Server environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_*).
-- Reapplying this file is non-destructive for catalog records, favorites, watchlists,
-- subscribers, and analytics.
--
-- Design
--   * The application reads and writes a validated catalog snapshot through
--     get_catalog() / save_catalog() (optimistic concurrency + advisory lock).
--   * save_catalog() also projects the snapshot into normalized, indexed tables
--     (providers, models, pricing, capabilities, benchmarks, sources, events…)
--     for SQL analytics, the future public Data API, and ingestion pipelines.
--   * pricing_history is append-only and records every published price change.
--   * Product tables (favorites, watchlists, subscribers, analytics) are separate
--     and never touched by catalog publishing.

begin;

-- ---------------------------------------------------------------------------
-- Snapshot state
-- ---------------------------------------------------------------------------
create table if not exists public.catalog_state (
  singleton boolean primary key default true check (singleton),
  updated_at timestamptz not null,
  updated_by text,
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta) = 'object')
);
alter table public.catalog_state add column if not exists updated_by text;
alter table public.catalog_state add column if not exists meta jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Catalog entities
-- ---------------------------------------------------------------------------
create table if not exists public.providers (
  id text primary key,
  slug text not null,
  name text not null,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  sort_order integer not null check (sort_order >= 0),
  updated_at timestamptz not null,
  constraint providers_slug_unique unique (slug) deferrable initially deferred
);
alter table public.providers add column if not exists kind text;
alter table public.providers add column if not exists country text;
alter table public.providers add column if not exists founded integer;
alter table public.providers add column if not exists website text;
alter table public.providers add column if not exists updated_by text;
alter table public.providers drop constraint if exists providers_record_identity;

create table if not exists public.models (
  id text primary key,
  slug text not null,
  provider_id text not null references public.providers(id),
  name text not null,
  version text not null,
  status text not null,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  sort_order integer not null check (sort_order >= 0),
  updated_at timestamptz not null,
  constraint models_slug_unique unique (slug) deferrable initially deferred
);
-- v1 → v2 column changes.
alter table public.models drop constraint if exists models_record_identity;
alter table public.models drop constraint if exists models_status_check;
alter table public.models drop column if exists model_type;
alter table public.models add column if not exists family text;
alter table public.models add column if not exists primary_category text;
alter table public.models add column if not exists release_date date;
alter table public.models add column if not exists context_tokens bigint;
alter table public.models add column if not exists max_output_tokens bigint;
alter table public.models add column if not exists openness text;
alter table public.models add column if not exists api_available boolean;
alter table public.models add column if not exists updated_by text;
update public.models set status = 'active' where status = 'available';
alter table public.models add constraint models_status_check check (status in ('active', 'preview', 'deprecated', 'retired'));

create index if not exists models_provider_id_idx on public.models(provider_id);
create index if not exists models_status_idx on public.models(status);
create index if not exists models_release_idx on public.models(release_date desc nulls last);
create index if not exists models_family_idx on public.models(provider_id, family);
create index if not exists models_context_idx on public.models(context_tokens desc nulls last);

-- Family/version view used for timelines.
create or replace view public.model_versions with (security_invoker = true) as
select provider_id, family, id as model_id, name, version, status, release_date
from public.models;

create table if not exists public.categories (
  id text primary key,
  label text not null
);

create table if not exists public.model_categories (
  model_id text not null references public.models(id) on delete cascade,
  category_id text not null references public.categories(id),
  is_primary boolean not null default false,
  primary key (model_id, category_id)
);
create index if not exists model_categories_category_idx on public.model_categories(category_id);

-- v1 table names kept for compatibility; v2 uses model_capabilities.
drop table if exists public.capabilities cascade;
create table if not exists public.model_capabilities (
  model_id text not null references public.models(id) on delete cascade,
  capability text not null,
  value boolean,
  source_url text,
  source_label text,
  verified_at timestamptz,
  note text,
  primary key (model_id, capability)
);
create index if not exists model_capabilities_enabled_idx on public.model_capabilities(capability, model_id) where value is true;

create or replace view public.model_modalities with (security_invoker = true) as
select model_id,
  bool_or(value) filter (where capability = 'text') as text,
  bool_or(value) filter (where capability in ('imageInput')) as image_input,
  bool_or(value) filter (where capability in ('imageOutput', 'imageEditing')) as image_output,
  bool_or(value) filter (where capability in ('audioInput')) as audio_input,
  bool_or(value) filter (where capability in ('audioOutput')) as audio_output,
  bool_or(value) filter (where capability in ('videoInput')) as video_input,
  bool_or(value) filter (where capability in ('videoOutput')) as video_output
from public.model_capabilities
group by model_id;

drop table if exists public.pricing cascade;
create table if not exists public.model_pricing (
  model_id text not null references public.models(id) on delete cascade,
  kind text not null check (kind in ('input', 'cachedInput', 'output', 'other', 'subscription')),
  value numeric check (value is null or value >= 0),
  text_value text,
  currency text not null default 'USD',
  unit text not null,
  source_url text,
  source_label text,
  verified_at timestamptz,
  note text,
  primary key (model_id, kind)
);

-- Append-only: one row per published price change.
create table if not exists public.pricing_history (
  id bigint generated always as identity primary key,
  model_id text not null,
  kind text not null,
  value numeric,
  text_value text,
  currency text not null default 'USD',
  source_url text,
  recorded_at timestamptz not null default now()
);
create index if not exists pricing_history_model_idx on public.pricing_history(model_id, kind, recorded_at desc);

create table if not exists public.benchmarks (
  id text primary key,
  name text not null,
  category text not null,
  unit text not null,
  higher_is_better boolean not null,
  url text not null,
  description text not null
);
-- v1 stored per-model rows in a table named "benchmarks"; detect and replace it.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'benchmarks' and column_name = 'model_id') then
    drop table public.benchmarks cascade;
    create table public.benchmarks (
      id text primary key, name text not null, category text not null, unit text not null,
      higher_is_better boolean not null, url text not null, description text not null
    );
  end if;
end $$;
drop table if exists public.benchmark_sources cascade;

create table if not exists public.benchmark_results (
  id text primary key,
  model_id text not null references public.models(id) on delete cascade,
  benchmark_id text not null references public.benchmarks(id),
  score numeric not null,
  display text,
  version text,
  evaluated_at date not null,
  conditions text,
  reported_by text not null check (reported_by in ('provider', 'independent')),
  source_url text not null,
  source_label text not null
);
create index if not exists benchmark_results_benchmark_idx on public.benchmark_results(benchmark_id, score desc);

drop table if exists public.model_releases cascade;
create table if not exists public.release_events (
  id text primary key,
  model_id text not null references public.models(id) on delete cascade,
  event_date date not null,
  event_type text not null check (event_type in ('release', 'update', 'pricing', 'api-feature', 'context', 'modality', 'deprecation', 'retirement')),
  title text not null,
  description text not null,
  source_url text not null,
  source_label text not null
);
create index if not exists release_events_date_idx on public.release_events(event_date desc);

-- Every cited source, and per-fact provenance ("data_sources").
create table if not exists public.sources (
  url text primary key,
  label text not null,
  last_checked_at timestamptz not null
);

create table if not exists public.model_sources (
  source_id bigint generated always as identity primary key,
  model_id text not null references public.models(id) on delete cascade,
  field text not null,
  value jsonb,
  source_url text references public.sources(url),
  source_name text,
  verified_at timestamptz,
  status text not null check (status in ('verified', 'unknown')),
  unique (model_id, field)
);
create or replace view public.data_sources with (security_invoker = true) as
select source_id, model_id, field, value, source_url, source_name, verified_at, status from public.model_sources;

drop table if exists public.trending_metrics cascade;

-- ---------------------------------------------------------------------------
-- Monetization
-- ---------------------------------------------------------------------------
create table if not exists public.affiliate_links (
  id text primary key,
  target_type text not null check (target_type in ('model', 'provider')),
  target_id text not null,
  label text not null,
  destination_url text not null,
  affiliate_url text,
  utm_campaign text,
  is_affiliate boolean not null,
  enabled boolean not null,
  updated_at timestamptz not null
);

create table if not exists public.sponsored_placements (
  id text primary key,
  slot text not null check (slot in ('home', 'models', 'comparison', 'provider', 'newsletter')),
  sponsor text not null,
  title text not null,
  description text not null,
  url text not null,
  provider_id text,
  model_id text,
  enabled boolean not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  updated_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Users and personal data (Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references public.models(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, model_id)
);

create table if not exists public.watchlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('model', 'provider')),
  target_id text not null,
  alerts text[] not null default array['pricing', 'release', 'deprecation', 'update'],
  created_at timestamptz not null default now(),
  last_notified_at timestamptz,
  primary key (user_id, target_type, target_id)
);

-- Notification outbox: a worker matches release_events/pricing_history to watchlists.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notifications_pending_idx on public.notifications(created_at) where sent_at is null;

create table if not exists public.saved_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_ids text[] not null check (cardinality(model_ids) between 2 and 4),
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  list text not null check (list in ('newsletter', 'pro-waitlist', 'api-waitlist')),
  source text not null,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now(),
  unique (email, list)
);

-- ---------------------------------------------------------------------------
-- Analytics (consented, no IP addresses)
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  path text,
  session_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_name_time_idx on public.analytics_events(name, created_at desc);
create index if not exists analytics_events_time_idx on public.analytics_events(created_at desc);

create or replace view public.page_views with (security_invoker = true) as
select id, path, session_id, created_at from public.analytics_events where name = 'page_view';
create or replace view public.comparison_events with (security_invoker = true) as
select id, name, props ->> 'models' as models, session_id, created_at from public.analytics_events where name in ('comparison_created', 'comparison_viewed');
create or replace view public.outbound_clicks with (security_invoker = true) as
select id, props ->> 'kind' as target_type, props ->> 'id' as target_id, props ->> 'dest' as destination,
  coalesce((props ->> 'affiliate')::boolean, false) as is_affiliate, created_at
from public.analytics_events where name = 'outbound_click';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'catalog_state', 'providers', 'models', 'categories', 'model_categories', 'model_capabilities', 'model_pricing',
    'pricing_history', 'benchmarks', 'benchmark_results', 'release_events', 'sources', 'model_sources',
    'affiliate_links', 'sponsored_placements', 'users', 'favorites', 'watchlists', 'notifications',
    'saved_comparisons', 'newsletter_subscribers', 'analytics_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists watchlists_own on public.watchlists;
create policy watchlists_own on public.watchlists for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists saved_comparisons_own on public.saved_comparisons;
create policy saved_comparisons_own on public.saved_comparisons for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists users_own on public.users;
create policy users_own on public.users for select to authenticated using ((select auth.uid()) = id);
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Snapshot read
-- ---------------------------------------------------------------------------
create or replace function public.get_catalog()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'schemaVersion', coalesce((s.meta ->> 'schemaVersion')::int, 1),
    'providers', coalesce((select jsonb_agg(p.record order by p.sort_order, p.id) from public.providers p), '[]'::jsonb),
    'models', coalesce((select jsonb_agg(m.record order by m.sort_order, m.id) from public.models m), '[]'::jsonb),
    'benchmarks', coalesce(s.meta -> 'benchmarks', '[]'::jsonb),
    'links', coalesce(s.meta -> 'links', '[]'::jsonb),
    'sponsored', coalesce(s.meta -> 'sponsored', '[]'::jsonb),
    'changelog', coalesce(s.meta -> 'changelog', '[]'::jsonb),
    'updatedAt', to_char(s.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) || case when s.updated_by is null then '{}'::jsonb else jsonb_build_object('updatedBy', s.updated_by) end
  from public.catalog_state s
  where s.singleton = true;
$function$;

-- ---------------------------------------------------------------------------
-- Snapshot write + normalized projection
-- PostgREST runs this in a transaction. PT409 maps to HTTP 409.
-- A NULL expected version is allowed only for first initialization.
-- ---------------------------------------------------------------------------
create or replace function public.save_catalog(p_catalog jsonb, p_expected_updated_at text default null)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public
set timezone = 'UTC'
as $function$
declare
  v_current timestamptz;
  v_next timestamptz;
  v_current_version text;
begin
  if jsonb_typeof(p_catalog) is distinct from 'object'
    or jsonb_typeof(p_catalog -> 'providers') is distinct from 'array'
    or jsonb_typeof(p_catalog -> 'models') is distinct from 'array'
    or jsonb_typeof(p_catalog -> 'updatedAt') is distinct from 'string'
  then
    raise exception using errcode = 'PT422', message = 'Invalid catalog snapshot shape.';
  end if;

  perform pg_advisory_xact_lock(1847573921, 1);
  select s.updated_at into v_current from public.catalog_state s where s.singleton = true for update;

  if found then
    v_current_version := to_char(v_current at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    if p_expected_updated_at is distinct from v_current_version then
      raise exception using errcode = 'PT409', message = 'Catalog changed; reload before saving.';
    end if;
  elsif p_expected_updated_at is not null then
    raise exception using errcode = 'PT409', message = 'Catalog is not initialized; reload before saving.';
  end if;

  if exists (select 1 from jsonb_array_elements(p_catalog -> 'models') model
             where not exists (select 1 from jsonb_array_elements(p_catalog -> 'providers') provider where provider ->> 'id' = model ->> 'providerId')) then
    raise exception using errcode = 'PT422', message = 'A model references a missing provider.';
  end if;

  -- Providers and models (upsert keeps favorites/watchlists for stable IDs).
  insert into public.providers (id, slug, name, kind, country, founded, website, record, sort_order, updated_at, updated_by)
  select item ->> 'id', item ->> 'slug', item ->> 'name', item ->> 'kind', item ->> 'country', (item ->> 'founded')::int,
         item ->> 'website', item, (position - 1)::int, (item ->> 'updatedAt')::timestamptz, item ->> 'updatedBy'
  from jsonb_array_elements(p_catalog -> 'providers') with ordinality as entries(item, position)
  on conflict (id) do update set slug = excluded.slug, name = excluded.name, kind = excluded.kind, country = excluded.country,
    founded = excluded.founded, website = excluded.website, record = excluded.record, sort_order = excluded.sort_order,
    updated_at = excluded.updated_at, updated_by = excluded.updated_by;

  insert into public.models (id, slug, provider_id, name, version, status, family, primary_category, release_date, context_tokens,
    max_output_tokens, openness, api_available, record, sort_order, updated_at, updated_by)
  select item ->> 'id', item ->> 'slug', item ->> 'providerId', item ->> 'name', item ->> 'version', item ->> 'status',
    item ->> 'family', item -> 'categories' ->> 0, (item -> 'releaseDate' ->> 'value')::date,
    (item -> 'contextWindow' ->> 'value')::bigint, (item -> 'maxOutput' ->> 'value')::bigint,
    item -> 'openness' ->> 'value', (item -> 'apiAvailable' ->> 'value')::boolean,
    item, (position - 1)::int, (item ->> 'updatedAt')::timestamptz, item ->> 'updatedBy'
  from jsonb_array_elements(p_catalog -> 'models') with ordinality as entries(item, position)
  on conflict (id) do update set slug = excluded.slug, provider_id = excluded.provider_id, name = excluded.name,
    version = excluded.version, status = excluded.status, family = excluded.family, primary_category = excluded.primary_category,
    release_date = excluded.release_date, context_tokens = excluded.context_tokens, max_output_tokens = excluded.max_output_tokens,
    openness = excluded.openness, api_available = excluded.api_available, record = excluded.record,
    sort_order = excluded.sort_order, updated_at = excluded.updated_at, updated_by = excluded.updated_by;

  delete from public.models m where not exists (select 1 from jsonb_array_elements(p_catalog -> 'models') item where item ->> 'id' = m.id);
  delete from public.providers p where not exists (select 1 from jsonb_array_elements(p_catalog -> 'providers') item where item ->> 'id' = p.id);

  -- Price history: record changes before replacing current prices.
  insert into public.pricing_history (model_id, kind, value, text_value, source_url)
  select model ->> 'id', fact.key, (fact.value ->> 'value')::numeric, null, fact.value -> 'source' ->> 'url'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_each(model -> 'pricing') fact
  where fact.key in ('input', 'cachedInput', 'output')
    and fact.value ->> 'value' is not null
    and not exists (
      select 1 from public.model_pricing current_price
      where current_price.model_id = model ->> 'id' and current_price.kind = fact.key
        and current_price.value is not distinct from (fact.value ->> 'value')::numeric
    );

  -- Scope projection replacement to this snapshot's models. Supabase REST
  -- enables pg_safeupdate, which rejects unqualified DELETE statements.
  delete from public.model_categories
  where model_id in (select model ->> 'id' from jsonb_array_elements(p_catalog -> 'models') model);
  delete from public.model_capabilities
  where model_id in (select model ->> 'id' from jsonb_array_elements(p_catalog -> 'models') model);
  delete from public.model_pricing
  where model_id in (select model ->> 'id' from jsonb_array_elements(p_catalog -> 'models') model);
  delete from public.benchmark_results
  where model_id in (select model ->> 'id' from jsonb_array_elements(p_catalog -> 'models') model);
  delete from public.release_events
  where model_id in (select model ->> 'id' from jsonb_array_elements(p_catalog -> 'models') model);
  delete from public.model_sources
  where model_id in (select model ->> 'id' from jsonb_array_elements(p_catalog -> 'models') model);

  insert into public.categories (id, label)
  select distinct category, initcap(replace(category, '-', ' '))
  from jsonb_array_elements(p_catalog -> 'models') model cross join lateral jsonb_array_elements_text(model -> 'categories') category
  on conflict (id) do nothing;

  insert into public.model_categories (model_id, category_id, is_primary)
  select model ->> 'id', category, ordinality = 1
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_array_elements_text(model -> 'categories') with ordinality as c(category, ordinality);

  insert into public.model_capabilities (model_id, capability, value, source_url, source_label, verified_at, note)
  select model ->> 'id', fact.key, (fact.value ->> 'value')::boolean, fact.value -> 'source' ->> 'url',
    fact.value -> 'source' ->> 'label', (fact.value -> 'source' ->> 'checkedAt')::timestamptz, fact.value ->> 'note'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_each(model -> 'capabilities') fact;

  insert into public.model_pricing (model_id, kind, value, text_value, currency, unit, source_url, source_label, verified_at, note)
  select model ->> 'id', fact.key,
    case when fact.key = 'other' then null else (fact.value ->> 'value')::numeric end,
    case when fact.key = 'other' then fact.value ->> 'value' else null end,
    'USD', case when fact.key = 'subscription' then 'month' when fact.key = 'other' then 'verbatim' else '1M tokens' end,
    fact.value -> 'source' ->> 'url', fact.value -> 'source' ->> 'label', (fact.value -> 'source' ->> 'checkedAt')::timestamptz, fact.value ->> 'note'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_each(model -> 'pricing') fact
  where fact.key in ('input', 'cachedInput', 'output', 'other', 'subscription');

  insert into public.benchmarks (id, name, category, unit, higher_is_better, url, description)
  select item ->> 'id', item ->> 'name', item ->> 'category', item ->> 'unit', (item ->> 'higherIsBetter')::boolean, item ->> 'url', item ->> 'description'
  from jsonb_array_elements(coalesce(p_catalog -> 'benchmarks', '[]'::jsonb)) item
  on conflict (id) do update set name = excluded.name, category = excluded.category, unit = excluded.unit,
    higher_is_better = excluded.higher_is_better, url = excluded.url, description = excluded.description;

  insert into public.benchmark_results (id, model_id, benchmark_id, score, display, version, evaluated_at, conditions, reported_by, source_url, source_label)
  select model ->> 'id' || ':' || (result ->> 'id'), model ->> 'id', result ->> 'benchmarkId', (result ->> 'score')::numeric,
    result ->> 'display', result ->> 'version', (result ->> 'evaluatedAt')::date, result ->> 'conditions',
    result ->> 'reportedBy', result -> 'source' ->> 'url', result -> 'source' ->> 'label'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_array_elements(model -> 'benchmarks') result;

  insert into public.release_events (id, model_id, event_date, event_type, title, description, source_url, source_label)
  select model ->> 'id' || ':' || (event ->> 'id'), model ->> 'id', (event ->> 'date')::date, event ->> 'type',
    event ->> 'title', event ->> 'description', event -> 'source' ->> 'url', event -> 'source' ->> 'label'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_array_elements(model -> 'releases') event;

  -- Source registry and per-fact provenance.
  insert into public.sources (url, label, last_checked_at)
  select distinct on (src ->> 'url') src ->> 'url', src ->> 'label', (src ->> 'checkedAt')::timestamptz
  from jsonb_path_query(p_catalog, 'strict $.**.source ? (@.type() == "object")') as src
  order by src ->> 'url', (src ->> 'checkedAt')::timestamptz desc
  on conflict (url) do update set label = excluded.label, last_checked_at = greatest(public.sources.last_checked_at, excluded.last_checked_at);

  insert into public.model_sources (model_id, field, value, source_url, source_name, verified_at, status)
  select model ->> 'id', fact.key, fact.value -> 'value', fact.value -> 'source' ->> 'url', fact.value -> 'source' ->> 'label',
    (fact.value -> 'source' ->> 'checkedAt')::timestamptz,
    case when fact.value -> 'value' = 'null'::jsonb then 'unknown' else 'verified' end
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_each(model) fact
  where jsonb_typeof(fact.value) = 'object' and fact.value ? 'value' and fact.value ? 'updatedAt';

  -- Monetization records.
  delete from public.affiliate_links existing
  where not exists (
    select 1 from jsonb_array_elements(coalesce(p_catalog -> 'links', '[]'::jsonb)) item
    where item ->> 'id' = existing.id
  );
  insert into public.affiliate_links (id, target_type, target_id, label, destination_url, affiliate_url, utm_campaign, is_affiliate, enabled, updated_at)
  select item ->> 'id', item ->> 'targetType', item ->> 'targetId', item ->> 'label', item ->> 'destinationUrl', item ->> 'affiliateUrl',
    item ->> 'utmCampaign', (item ->> 'isAffiliate')::boolean, (item ->> 'enabled')::boolean, (item ->> 'updatedAt')::timestamptz
  from jsonb_array_elements(coalesce(p_catalog -> 'links', '[]'::jsonb)) item
  on conflict (id) do update set target_type = excluded.target_type, target_id = excluded.target_id,
    label = excluded.label, destination_url = excluded.destination_url, affiliate_url = excluded.affiliate_url,
    utm_campaign = excluded.utm_campaign, is_affiliate = excluded.is_affiliate, enabled = excluded.enabled,
    updated_at = excluded.updated_at;

  delete from public.sponsored_placements existing
  where not exists (
    select 1 from jsonb_array_elements(coalesce(p_catalog -> 'sponsored', '[]'::jsonb)) item
    where item ->> 'id' = existing.id
  );
  insert into public.sponsored_placements (id, slot, sponsor, title, description, url, provider_id, model_id, enabled, starts_at, ends_at, updated_at)
  select item ->> 'id', item ->> 'slot', item ->> 'sponsor', item ->> 'title', item ->> 'description', item ->> 'url', item ->> 'providerId',
    item ->> 'modelId', (item ->> 'enabled')::boolean, (item ->> 'startsAt')::timestamptz, (item ->> 'endsAt')::timestamptz, (item ->> 'updatedAt')::timestamptz
  from jsonb_array_elements(coalesce(p_catalog -> 'sponsored', '[]'::jsonb)) item
  on conflict (id) do update set slot = excluded.slot, sponsor = excluded.sponsor, title = excluded.title,
    description = excluded.description, url = excluded.url, provider_id = excluded.provider_id,
    model_id = excluded.model_id, enabled = excluded.enabled, starts_at = excluded.starts_at,
    ends_at = excluded.ends_at, updated_at = excluded.updated_at;

  v_next := date_trunc('milliseconds', clock_timestamp());
  if v_current is not null and v_next <= v_current then v_next := v_current + interval '1 millisecond'; end if;

  insert into public.catalog_state (singleton, updated_at, updated_by, meta)
  values (true, v_next, p_catalog ->> 'updatedBy', jsonb_build_object(
    'schemaVersion', coalesce((p_catalog ->> 'schemaVersion')::int, 2),
    'benchmarks', coalesce(p_catalog -> 'benchmarks', '[]'::jsonb),
    'links', coalesce(p_catalog -> 'links', '[]'::jsonb),
    'sponsored', coalesce(p_catalog -> 'sponsored', '[]'::jsonb),
    'changelog', coalesce(p_catalog -> 'changelog', '[]'::jsonb)))
  on conflict (singleton) do update set updated_at = excluded.updated_at, updated_by = excluded.updated_by, meta = excluded.meta;

  return public.get_catalog();
end;
$function$;

-- ---------------------------------------------------------------------------
-- Grants: catalog and analytics are server-only (service role).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'catalog_state', 'providers', 'models', 'categories', 'model_categories', 'model_capabilities', 'model_pricing',
    'pricing_history', 'benchmarks', 'benchmark_results', 'release_events', 'sources', 'model_sources',
    'affiliate_links', 'sponsored_placements', 'users', 'favorites', 'watchlists', 'notifications',
    'saved_comparisons', 'newsletter_subscribers', 'analytics_events'
  ] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

grant usage on schema public to service_role, authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.watchlists to authenticated;
grant select, insert, delete on public.saved_comparisons to authenticated;
grant select on public.users, public.notifications to authenticated;

revoke all on public.model_versions, public.model_modalities, public.data_sources, public.page_views,
  public.comparison_events, public.outbound_clicks from public, anon, authenticated;
grant select on public.model_versions, public.model_modalities, public.data_sources, public.page_views,
  public.comparison_events, public.outbound_clicks to service_role;

revoke all on function public.get_catalog() from public, anon, authenticated;
revoke all on function public.save_catalog(jsonb, text) from public, anon, authenticated;
grant execute on function public.get_catalog() to service_role;
grant execute on function public.save_catalog(jsonb, text) to service_role;

notify pgrst, 'reload schema';
commit;
