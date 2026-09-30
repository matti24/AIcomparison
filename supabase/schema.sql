-- AI Compare / Supabase Postgres 15+
-- Apply this file in the Supabase SQL editor, then run: npm run db:seed
-- Server environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_*).
-- Reapplying this schema does not reset catalog records or favorites.
-- The server validates snapshots with catalogSchema before calling save_catalog.

begin;

create table if not exists public.catalog_state (
  singleton boolean primary key default true check (singleton),
  updated_at timestamptz not null
);

create table if not exists public.providers (
  id text primary key,
  slug text not null,
  name text not null,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  sort_order integer not null check (sort_order >= 0),
  updated_at timestamptz not null,
  constraint providers_slug_unique unique (slug) deferrable initially deferred,
  constraint providers_record_identity check (
    record ->> 'id' = id and record ->> 'slug' = slug and record ->> 'name' = name
  )
);

create table if not exists public.models (
  id text primary key,
  slug text not null,
  provider_id text not null references public.providers(id),
  name text not null,
  version text not null,
  model_type text not null check (model_type in (
    'general', 'reasoning', 'coding', 'image', 'video', 'speech', 'embedding', 'research'
  )),
  status text not null check (status in ('available', 'preview', 'deprecated')),
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  sort_order integer not null check (sort_order >= 0),
  updated_at timestamptz not null,
  constraint models_slug_unique unique (slug) deferrable initially deferred,
  constraint models_record_identity check (
    record ->> 'id' = id
    and record ->> 'slug' = slug
    and record ->> 'providerId' = provider_id
    and record ->> 'name' = name
    and record ->> 'version' = version
    and record ->> 'type' = model_type
    and record ->> 'status' = status
  )
);

create index if not exists models_provider_id_idx on public.models(provider_id);
create index if not exists models_type_status_idx on public.models(model_type, status);

create table if not exists public.capabilities (
  model_id text not null references public.models(id) on delete cascade,
  capability text not null check (capability in (
    'text', 'imageInput', 'imageOutput', 'audioInput', 'audioOutput',
    'videoInput', 'videoOutput', 'webSearch', 'toolCalling',
    'structuredOutputs', 'reasoning', 'coding', 'multilingual',
    'fineTuning', 'selfHosting'
  )),
  value boolean,
  source jsonb check (source is null or jsonb_typeof(source) = 'object'),
  updated_at timestamptz not null,
  note text,
  primary key (model_id, capability),
  check (value is null or source is not null)
);

create index if not exists capabilities_enabled_idx
  on public.capabilities(capability, model_id) where value is true;

create table if not exists public.pricing (
  model_id text not null references public.models(id) on delete cascade,
  kind text not null check (kind in ('input', 'output', 'subscription')),
  value numeric check (value is null or (value >= 0 and value <= 9007199254740991)),
  currency text not null check (currency = 'USD'),
  unit text not null check (unit in ('1M tokens', 'month')),
  source jsonb check (source is null or jsonb_typeof(source) = 'object'),
  updated_at timestamptz not null,
  note text,
  primary key (model_id, kind),
  check (value is null or source is not null),
  check (
    (kind = 'subscription' and unit = 'month')
    or (kind in ('input', 'output') and unit = '1M tokens')
  )
);

create table if not exists public.benchmark_sources (
  id text primary key,
  label text not null check (length(btrim(label)) > 0),
  url text not null check (url ~ '^https?://'),
  checked_at timestamptz not null,
  record jsonb not null check (jsonb_typeof(record) = 'object')
);

create table if not exists public.benchmarks (
  model_id text not null references public.models(id) on delete cascade,
  id text not null,
  name text not null,
  score text not null,
  benchmark_date date not null,
  source_id text not null references public.benchmark_sources(id),
  note text,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  primary key (model_id, id)
);

create table if not exists public.model_releases (
  model_id text not null references public.models(id) on delete cascade,
  id text not null,
  release_date date not null,
  title text not null,
  description text not null,
  release_type text not null check (release_type in ('release', 'pricing', 'capability', 'deprecation')),
  source jsonb not null check (jsonb_typeof(source) = 'object'),
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  primary key (model_id, id)
);

create index if not exists model_releases_date_idx on public.model_releases(release_date desc);

-- These are editorial selections, not page views, adoption, or invented analytics.
create table if not exists public.trending_metrics (
  model_id text primary key references public.models(id) on delete cascade,
  editorial_rank bigint not null check (editorial_rank >= 1 and editorial_rank <= 9007199254740991),
  trending boolean not null,
  origin text not null default 'editorial' check (origin = 'editorial'),
  rationale text not null check (length(btrim(rationale)) >= 20),
  updated_at timestamptz not null
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references public.models(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, model_id)
);

alter table public.catalog_state enable row level security;
alter table public.providers enable row level security;
alter table public.models enable row level security;
alter table public.capabilities enable row level security;
alter table public.pricing enable row level security;
alter table public.benchmark_sources enable row level security;
alter table public.benchmarks enable row level security;
alter table public.model_releases enable row level security;
alter table public.trending_metrics enable row level security;
alter table public.favorites enable row level security;

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace view public.catalog_model_summary
with (security_invoker = true) as
select
  m.id,
  m.slug,
  m.name,
  m.version,
  m.model_type,
  m.status,
  p.id as provider_id,
  p.name as provider_name,
  (m.record -> 'contextWindow' ->> 'value')::bigint as context_tokens,
  input_price.value as input_usd_per_million,
  output_price.value as output_usd_per_million,
  trend.editorial_rank,
  trend.trending,
  trend.origin
from public.models m
join public.providers p on p.id = m.provider_id
left join public.pricing input_price on input_price.model_id = m.id and input_price.kind = 'input'
left join public.pricing output_price on output_price.model_id = m.id and output_price.kind = 'output'
left join public.trending_metrics trend on trend.model_id = m.id;

-- One SQL statement gives a consistent MVCC snapshot of metadata and both arrays.
-- No state row means "not initialized", distinct from an intentionally empty catalog.
create or replace function public.get_catalog()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'providers', coalesce(
      (select jsonb_agg(p.record order by p.sort_order, p.id) from public.providers p),
      '[]'::jsonb
    ),
    'models', coalesce(
      (select jsonb_agg(m.record order by m.sort_order, m.id) from public.models m),
      '[]'::jsonb
    ),
    'updatedAt', to_char(s.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  from public.catalog_state s
  where s.singleton = true;
$function$;

-- PostgREST runs this function in a transaction. PT409 maps to HTTP 409.
-- A NULL expected version is allowed only for first initialization (the seed script).
create or replace function public.save_catalog(
  p_catalog jsonb,
  p_expected_updated_at text default null
)
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
  v_next_version text;
begin
  if jsonb_typeof(p_catalog) is distinct from 'object'
    or jsonb_typeof(p_catalog -> 'providers') is distinct from 'array'
    or jsonb_typeof(p_catalog -> 'models') is distinct from 'array'
    or jsonb_typeof(p_catalog -> 'updatedAt') is distinct from 'string'
  then
    raise exception using errcode = 'PT422', message = 'Invalid catalog snapshot shape.';
  end if;

  -- Also serializes two initial seeds, when there is not yet a row to lock.
  perform pg_advisory_xact_lock(1847573921, 1);
  select s.updated_at into v_current
  from public.catalog_state s where s.singleton = true for update;

  if found then
    v_current_version := to_char(v_current at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    if p_expected_updated_at is distinct from v_current_version then
      raise exception using errcode = 'PT409', message = 'Catalog changed; reload before saving.';
    end if;
  elsif p_expected_updated_at is not null then
    raise exception using errcode = 'PT409', message = 'Catalog is not initialized; reload before saving.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_catalog -> 'providers') item
    group by item ->> 'id' having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_catalog -> 'providers') item
    group by item ->> 'slug' having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_catalog -> 'models') item
    group by item ->> 'id' having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(p_catalog -> 'models') item
    group by item ->> 'slug' having count(*) > 1
  ) then
    raise exception using errcode = 'PT422', message = 'Catalog IDs and slugs must be unique.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_catalog -> 'models') model
    where not exists (
      select 1 from jsonb_array_elements(p_catalog -> 'providers') provider
      where provider ->> 'id' = model ->> 'providerId'
    )
  ) then
    raise exception using errcode = 'PT422', message = 'A model references a missing provider.';
  end if;

  insert into public.providers (id, slug, name, record, sort_order, updated_at)
  select
    item ->> 'id', item ->> 'slug', item ->> 'name', item,
    (position - 1)::integer, (item ->> 'updatedAt')::timestamptz
  from jsonb_array_elements(p_catalog -> 'providers') with ordinality as entries(item, position)
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    record = excluded.record,
    sort_order = excluded.sort_order,
    updated_at = excluded.updated_at;

  -- Upsert instead of delete/reinsert preserves favorites for existing model IDs.
  insert into public.models (
    id, slug, provider_id, name, version, model_type, status, record, sort_order, updated_at
  )
  select
    item ->> 'id', item ->> 'slug', item ->> 'providerId', item ->> 'name',
    item ->> 'version', item ->> 'type', item ->> 'status', item,
    (position - 1)::integer, (item ->> 'updatedAt')::timestamptz
  from jsonb_array_elements(p_catalog -> 'models') with ordinality as entries(item, position)
  on conflict (id) do update set
    slug = excluded.slug,
    provider_id = excluded.provider_id,
    name = excluded.name,
    version = excluded.version,
    model_type = excluded.model_type,
    status = excluded.status,
    record = excluded.record,
    sort_order = excluded.sort_order,
    updated_at = excluded.updated_at;

  delete from public.models m
  where not exists (
    select 1 from jsonb_array_elements(p_catalog -> 'models') item where item ->> 'id' = m.id
  );
  delete from public.providers p
  where not exists (
    select 1 from jsonb_array_elements(p_catalog -> 'providers') item where item ->> 'id' = p.id
  );

  delete from public.capabilities;
  delete from public.pricing;
  delete from public.benchmarks;
  delete from public.benchmark_sources;
  delete from public.model_releases;
  delete from public.trending_metrics;

  insert into public.capabilities (model_id, capability, value, source, updated_at, note)
  select
    model ->> 'id',
    fact.key,
    (fact.value ->> 'value')::boolean,
    nullif(fact.value -> 'source', 'null'::jsonb),
    (fact.value ->> 'updatedAt')::timestamptz,
    fact.value ->> 'note'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_each(model -> 'capabilities') fact;

  insert into public.pricing (model_id, kind, value, currency, unit, source, updated_at, note)
  select
    model ->> 'id',
    fact.key,
    (fact.value ->> 'value')::numeric,
    model -> 'pricing' ->> 'currency',
    case when fact.key = 'subscription' then 'month' else model -> 'pricing' ->> 'unit' end,
    nullif(fact.value -> 'source', 'null'::jsonb),
    (fact.value ->> 'updatedAt')::timestamptz,
    fact.value ->> 'note'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_each(model -> 'pricing') fact
  where fact.key in ('input', 'output', 'subscription');

  insert into public.benchmark_sources (id, label, url, checked_at, record)
  select distinct
    md5((benchmark -> 'source')::text),
    benchmark -> 'source' ->> 'label',
    benchmark -> 'source' ->> 'url',
    (benchmark -> 'source' ->> 'checkedAt')::timestamptz,
    benchmark -> 'source'
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_array_elements(model -> 'benchmarks') benchmark;

  insert into public.benchmarks (model_id, id, name, score, benchmark_date, source_id, note, record)
  select
    model ->> 'id', benchmark ->> 'id', benchmark ->> 'name', benchmark ->> 'score',
    (benchmark ->> 'date')::date, md5((benchmark -> 'source')::text),
    benchmark ->> 'note', benchmark
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_array_elements(model -> 'benchmarks') benchmark;

  insert into public.model_releases (
    model_id, id, release_date, title, description, release_type, source, record
  )
  select
    model ->> 'id', release ->> 'id', (release ->> 'date')::date,
    release ->> 'title', release ->> 'description', release ->> 'type',
    release -> 'source', release
  from jsonb_array_elements(p_catalog -> 'models') model
  cross join lateral jsonb_array_elements(model -> 'releases') release;

  insert into public.trending_metrics (model_id, editorial_rank, trending, origin, rationale, updated_at)
  select
    model ->> 'id',
    (model -> 'editorial' ->> 'rank')::bigint,
    (model -> 'editorial' ->> 'trending')::boolean,
    'editorial',
    model -> 'editorial' ->> 'rationale',
    (model -> 'editorial' ->> 'updatedAt')::timestamptz
  from jsonb_array_elements(p_catalog -> 'models') model;

  v_next := date_trunc('milliseconds', clock_timestamp());
  if v_current is not null and v_next <= v_current then
    v_next := v_current + interval '1 millisecond';
  end if;
  v_next_version := to_char(v_next at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  insert into public.catalog_state (singleton, updated_at) values (true, v_next)
  on conflict (singleton) do update set updated_at = excluded.updated_at;

  return jsonb_build_object(
    'providers', p_catalog -> 'providers',
    'models', p_catalog -> 'models',
    'updatedAt', v_next_version
  );
end;
$function$;

-- Catalog access is server-only. No anon/authenticated catalog write path exists.
revoke all on table
  public.catalog_state, public.providers, public.models, public.capabilities,
  public.pricing, public.benchmark_sources, public.benchmarks,
  public.model_releases, public.trending_metrics, public.favorites
from public, anon, authenticated;

grant usage on schema public to service_role, authenticated;
grant all on table
  public.catalog_state, public.providers, public.models, public.capabilities,
  public.pricing, public.benchmark_sources, public.benchmarks,
  public.model_releases, public.trending_metrics, public.favorites
to service_role;
grant select, insert, delete on public.favorites to authenticated;

revoke all on public.catalog_model_summary from public, anon, authenticated;
grant select on public.catalog_model_summary to service_role;

revoke all on function public.get_catalog() from public, anon, authenticated;
revoke all on function public.save_catalog(jsonb, text) from public, anon, authenticated;
grant execute on function public.get_catalog() to service_role;
grant execute on function public.save_catalog(jsonb, text) to service_role;

notify pgrst, 'reload schema';
commit;
