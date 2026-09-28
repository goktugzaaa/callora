-- =============================================================================
-- Callora — initial schema
--
-- Multi-tenant AI receptionist. Every tenant-owned row carries `business_id`
-- and is protected by row-level security. Cross-tenant references are made
-- impossible at the database level with composite foreign keys
-- (business_id, <fk>) -> <table>(business_id, id).
--
-- Sections
--   1. Extensions & helpers
--   2. Platform tables (profiles, admins, settings)
--   3. Tenant tables (businesses, members, settings, catalog, schedule)
--   4. CRM & messaging (customers, conversations, messages)
--   5. Appointments (with overlap protection)
--   6. Integrations & usage (WhatsApp, AI usage, rate limits)
--   7. Triggers
--   8. Row-level security
--   9. RPC functions
--  10. Realtime
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions & helpers
-- -----------------------------------------------------------------------------

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Platform tables
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  locale text not null default 'en' check (locale in ('en', 'ar', 'tr')),
  created_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Tenant tables
-- -----------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  category text not null default 'beauty_salon'
    check (category in ('beauty_salon', 'spa', 'clinic', 'dental', 'barbershop', 'other')),
  description text not null default '',
  timezone text not null default 'Asia/Amman' check (public.is_valid_timezone(timezone)),
  currency text not null default 'JOD' check (currency ~ '^[A-Z]{3}$'),
  phone text,
  email text,
  address text,
  maps_url text,
  -- Platform-controlled fields (see protect_business_platform_fields trigger)
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended')),
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'scale')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- owner/admin: full control · staff: day-to-day operations · viewer: read-only
  role text not null default 'owner' check (role in ('owner', 'admin', 'staff', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_id_idx on public.business_members (user_id);

create table public.assistant_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  enabled boolean not null default true,
  assistant_name text not null default 'Layla' check (char_length(assistant_name) between 1 and 40),
  tone text not null default 'warm' check (tone in ('warm', 'professional', 'luxury', 'playful')),
  languages text[] not null default '{en,ar}'
    check (cardinality(languages) > 0 and languages <@ array['en', 'ar', 'tr']),
  greeting text not null default '',
  instructions text not null default '' check (char_length(instructions) <= 4000),
  updated_at timestamptz not null default now()
);

create table public.booking_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  slot_interval_min int not null default 15 check (slot_interval_min between 5 and 120),
  min_notice_min int not null default 60 check (min_notice_min between 0 and 10080),
  max_advance_days int not null default 60 check (max_advance_days between 1 and 365),
  buffer_min int not null default 0 check (buffer_min between 0 and 120),
  cancellation_notice_hours int not null default 2 check (cancellation_notice_hours between 0 and 168),
  auto_confirm boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Opening hours in the business's local time. Several rows per weekday allow
-- split shifts (e.g. 10:00–13:00 and 16:00–21:00). No row = closed.
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  opens_at time not null,
  closes_at time not null,
  check (closes_at > opens_at)
);
create index working_hours_business_idx on public.working_hours (business_id, weekday);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  title text not null default '',
  color text not null default '#7c6cf2' check (color ~ '^#[0-9a-fA-F]{6}$'),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, id)
);

-- Optional personal schedule. A staff member without rows here works the
-- business's opening hours; with rows, their shifts are intersected with them.
create table public.staff_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  staff_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  check (ends_at > starts_at),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade
);
create index staff_hours_staff_idx on public.staff_hours (staff_id, weekday);

-- Closures and leave. staff_id null = the whole business is closed (e.g. Eid).
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  check (ends_at > starts_at),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade
);
create index time_off_business_idx on public.time_off (business_id, starts_at);

-- Service names/descriptions are localized maps: {"en": "Haircut", "ar": "قص شعر"}.
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name jsonb not null check (jsonb_typeof(name) = 'object' and name <> '{}'::jsonb),
  description jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  duration_min int not null check (duration_min between 5 and 600),
  price numeric(10, 2) check (price >= 0), -- null = price on consultation
  price_is_from boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create index services_business_idx on public.services (business_id, sort_order);

-- Which staff can perform which service. A service with no rows here can be
-- performed by any active staff member.
create table public.staff_services (
  business_id uuid not null,
  staff_id uuid not null,
  service_id uuid not null,
  primary key (staff_id, service_id),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade,
  foreign key (business_id, service_id) references public.services (business_id, id) on delete cascade
);
create index staff_services_service_idx on public.staff_services (service_id);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  answer text not null check (char_length(answer) between 1 and 2000),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_business_idx on public.faqs (business_id, sort_order);

-- -----------------------------------------------------------------------------
-- 4. CRM & messaging
-- -----------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text check (char_length(name) <= 120),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'), -- E.164
  email text,
  language text check (language in ('en', 'ar', 'tr')),
  notes text not null default '',
  source text not null default 'whatsapp' check (source in ('whatsapp', 'web', 'voice', 'manual')),
  stage text not null default 'lead' check (stage in ('lead', 'customer')),
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, phone)
);
create index customers_business_idx on public.customers (business_id, last_contact_at desc);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  channel text not null check (channel in ('whatsapp', 'web', 'voice')),
  external_id text not null, -- WhatsApp wa_id, or the web session id
  mode text not null default 'ai' check (mode in ('ai', 'human')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  needs_attention boolean not null default false,
  handover_reason text,
  language text check (language in ('en', 'ar', 'tr')),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  created_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, channel, external_id),
  foreign key (business_id, customer_id) references public.customers (business_id, id) on delete cascade
);
create index conversations_business_idx on public.conversations (business_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  conversation_id uuid not null,
  role text not null check (role in ('customer', 'assistant', 'staff', 'system')),
  content text not null,
  -- Backend actions the assistant took to produce this reply (tool calls)
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  external_id text, -- WhatsApp message id (wamid); makes webhook retries idempotent
  delivery_status text check (delivery_status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (business_id, conversation_id) references public.conversations (business_id, id) on delete cascade
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create unique index messages_external_id_key on public.messages (business_id, external_id)
  where external_id is not null;

-- -----------------------------------------------------------------------------
-- 5. Appointments
-- -----------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  service_id uuid not null,
  staff_id uuid not null,
  conversation_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- ends_at + the business's buffer; the overlap guard below uses this range
  blocked_until timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  source text not null default 'manual' check (source in ('whatsapp', 'web', 'voice', 'manual')),
  price numeric(10, 2),
  notes text not null default '',
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and blocked_until >= ends_at),
  foreign key (business_id, customer_id) references public.customers (business_id, id) on delete cascade,
  foreign key (business_id, service_id) references public.services (business_id, id),
  foreign key (business_id, staff_id) references public.staff (business_id, id),
  foreign key (business_id, conversation_id) references public.conversations (business_id, id)
    on delete set null (conversation_id),
  -- The database, not the AI, is the final authority on availability:
  -- two active appointments can never overlap for the same staff member.
  constraint appointments_no_overlap exclude using gist (
    staff_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);
create index appointments_business_starts_idx on public.appointments (business_id, starts_at);
create index appointments_customer_idx on public.appointments (customer_id, starts_at);

-- -----------------------------------------------------------------------------
-- 6. Integrations & usage
-- -----------------------------------------------------------------------------

-- Each business connects its own WhatsApp Business number.
create table public.whatsapp_accounts (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  phone_number_id text not null unique,
  waba_id text not null,
  display_phone_number text not null default '',
  verified_name text not null default '',
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  connected_at timestamptz not null default now()
);

-- Access tokens live in their own table with RLS enabled and no policies:
-- only the server (service role) can read them. Values are AES-256-GCM encrypted.
create table public.whatsapp_credentials (
  business_id uuid primary key references public.whatsapp_accounts (business_id) on delete cascade,
  access_token_encrypted text not null,
  updated_at timestamptz not null default now()
);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  conversation_id uuid,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  tool_calls int not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_business_idx on public.ai_usage (business_id, created_at);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);

-- -----------------------------------------------------------------------------
-- 7. Triggers
-- -----------------------------------------------------------------------------

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger assistant_settings_updated_at before update on public.assistant_settings
  for each row execute function public.set_updated_at();
create trigger booking_settings_updated_at before update on public.booking_settings
  for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- New auth user -> profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locale text := new.raw_user_meta_data ->> 'locale';
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when v_locale in ('en', 'ar', 'tr') then v_locale else 'en' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only platform admins (or the server) may change status, plan, trial or demo flags.
create or replace function public.protect_business_platform_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_platform_admin() and (
    new.status is distinct from old.status
    or new.plan is distinct from old.plan
    or new.trial_ends_at is distinct from old.trial_ends_at
    or new.is_demo is distinct from old.is_demo
  ) then
    raise exception 'Only platform administrators can change status, plan or trial fields'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Keep the inbox list fresh: newest message time + preview on the conversation.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(new.content, 160)
   where id = new.conversation_id;

  if new.role = 'customer' then
    update public.customers c
       set last_contact_at = new.created_at
      from public.conversations v
     where v.id = new.conversation_id and c.id = v.customer_id;
  end if;
  return new;
end;
$$;

create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

-- A lead becomes a customer once they have an appointment.
create or replace function public.promote_lead_to_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.customers set stage = 'customer'
   where id = new.customer_id and stage = 'lead';
  return new;
end;
$$;

create trigger appointments_promote_lead after insert on public.appointments
  for each row execute function public.promote_lead_to_customer();

-- -----------------------------------------------------------------------------
-- 8. Row-level security
-- -----------------------------------------------------------------------------

-- Businesses the current user belongs to (optionally with one of p_roles).
-- Used as `business_id in (select ...)` so Postgres evaluates it once per query.
create or replace function public.member_business_ids(p_roles text[] default null)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.business_id
    from public.business_members m
   where m.user_id = (select auth.uid())
     and (p_roles is null or m.role = any (p_roles));
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

create trigger businesses_protect_platform_fields before update on public.businesses
  for each row execute function public.protect_business_platform_fields();

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_settings enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.assistant_settings enable row level security;
alter table public.booking_settings enable row level security;
alter table public.working_hours enable row level security;
alter table public.staff enable row level security;
alter table public.staff_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.services enable row level security;
alter table public.staff_services enable row level security;
alter table public.faqs enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;
alter table public.whatsapp_accounts enable row level security;
alter table public.whatsapp_credentials enable row level security; -- no policies: server only
alter table public.ai_usage enable row level security;
alter table public.rate_limits enable row level security;          -- no policies: server only

-- Profiles & platform
create policy "own profile: read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_platform_admin()));
create policy "own profile: update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "admins: read own row" on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_platform_admin()));

create policy "platform settings: admins" on public.platform_settings
  for all to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- Businesses (created through the create_business RPC)
create policy "businesses: members read" on public.businesses
  for select to authenticated
  using (id in (select public.member_business_ids()) or (select public.is_platform_admin()));
create policy "businesses: owners update" on public.businesses
  for update to authenticated
  using (id in (select public.member_business_ids(array['owner', 'admin'])) or (select public.is_platform_admin()))
  with check (id in (select public.member_business_ids(array['owner', 'admin'])) or (select public.is_platform_admin()));

create policy "members: read teammates" on public.business_members
  for select to authenticated
  using (business_id in (select public.member_business_ids()) or (select public.is_platform_admin()));

-- Configuration tables: every member reads, owners/admins write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'assistant_settings', 'booking_settings', 'working_hours', 'staff', 'staff_hours',
    'time_off', 'services', 'staff_services', 'faqs'
  ] loop
    execute format(
      'create policy "%1$s: members read" on public.%1$I for select to authenticated
         using (business_id in (select public.member_business_ids()) or (select public.is_platform_admin()))', t);
    execute format(
      'create policy "%1$s: owners insert" on public.%1$I for insert to authenticated
         with check (business_id in (select public.member_business_ids(array[''owner'', ''admin''])))', t);
    execute format(
      'create policy "%1$s: owners update" on public.%1$I for update to authenticated
         using (business_id in (select public.member_business_ids(array[''owner'', ''admin''])))
         with check (business_id in (select public.member_business_ids(array[''owner'', ''admin''])))', t);
    execute format(
      'create policy "%1$s: owners delete" on public.%1$I for delete to authenticated
         using (business_id in (select public.member_business_ids(array[''owner'', ''admin''])))', t);
  end loop;
end;
$$;

-- Operational tables: every member reads, staff and above write, owners delete.
do $$
declare
  t text;
begin
  foreach t in array array['customers', 'conversations', 'messages', 'appointments'] loop
    execute format(
      'create policy "%1$s: members read" on public.%1$I for select to authenticated
         using (business_id in (select public.member_business_ids()) or (select public.is_platform_admin()))', t);
    execute format(
      'create policy "%1$s: staff insert" on public.%1$I for insert to authenticated
         with check (business_id in (select public.member_business_ids(array[''owner'', ''admin'', ''staff''])))', t);
    execute format(
      'create policy "%1$s: staff update" on public.%1$I for update to authenticated
         using (business_id in (select public.member_business_ids(array[''owner'', ''admin'', ''staff''])))
         with check (business_id in (select public.member_business_ids(array[''owner'', ''admin'', ''staff''])))', t);
    execute format(
      'create policy "%1$s: owners delete" on public.%1$I for delete to authenticated
         using (business_id in (select public.member_business_ids(array[''owner'', ''admin''])))', t);
  end loop;
end;
$$;

-- Integrations & usage: members read; writes happen on the server.
create policy "whatsapp: members read" on public.whatsapp_accounts
  for select to authenticated
  using (business_id in (select public.member_business_ids()) or (select public.is_platform_admin()));
create policy "whatsapp: owners disconnect" on public.whatsapp_accounts
  for delete to authenticated
  using (business_id in (select public.member_business_ids(array['owner', 'admin'])));

create policy "ai usage: members read" on public.ai_usage
  for select to authenticated
  using (business_id in (select public.member_business_ids()) or (select public.is_platform_admin()));

-- -----------------------------------------------------------------------------
-- 9. RPC functions
-- -----------------------------------------------------------------------------

-- Creates a tenant and makes the caller its owner, with default settings.
create or replace function public.create_business(
  p_name text,
  p_slug text,
  p_category text,
  p_timezone text,
  p_currency text,
  p_languages text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_business uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.businesses (name, slug, category, timezone, currency)
  values (p_name, p_slug, p_category, p_timezone, p_currency)
  returning id into v_business;

  insert into public.business_members (business_id, user_id, role)
  values (v_business, v_user, 'owner');

  insert into public.assistant_settings (business_id, languages)
  values (v_business, p_languages);

  insert into public.booking_settings (business_id)
  values (v_business);

  return v_business;
end;
$$;

-- Fixed-window rate limiter for public endpoints (server only).
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
     set hits = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                  else r.hits + 1
                end,
         window_start = case
                          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                          else r.window_start
                        end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function public.create_business(text, text, text, text, text, text[]) from public, anon;
grant execute on function public.create_business(text, text, text, text, text, text[]) to authenticated;
revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. Realtime — live inbox and calendar in the dashboard (RLS still applies)
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversations, public.messages, public.appointments;
  end if;
end;
$$;
