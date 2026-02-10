-- CGH Technik Planer Basisschema für Supabase/Postgres

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null default 'technician' check (role in ('admin', 'technician')),
  specialization text not null default 'Kombi',
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id bigint generated always as identity primary key,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table if not exists public.plan_sundays (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.plans(id) on delete cascade,
  date date not null,
  start_time text not null default '10:00',
  end_time text not null default '11:30',
  unique (plan_id, date)
);

create table if not exists public.availability (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sunday_id bigint not null references public.plan_sundays(id) on delete cascade,
  status text not null check (status in ('green', 'yellow', 'red')),
  unique(profile_id, sunday_id)
);

create table if not exists public.assignments (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sunday_id bigint not null references public.plan_sundays(id) on delete cascade,
  role_label text not null,
  unique(profile_id, sunday_id)
);

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_sundays enable row level security;
alter table public.availability enable row level security;
alter table public.assignments enable row level security;

-- Demo Policies: für schnelle Inbetriebnahme mit anon key (für Produktion einschränken)
do $$ begin
  create policy "open profiles" on public.profiles for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "open plans" on public.plans for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "open plan_sundays" on public.plan_sundays for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "open availability" on public.availability for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "open assignments" on public.assignments for all using (true) with check (true);
exception when duplicate_object then null; end $$;
