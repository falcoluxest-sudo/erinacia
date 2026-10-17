-- Erinacia — initial schema (PostgreSQL / Supabase).
-- Every user-owned row belongs to an organization, so the same schema serves
-- personal use now and multiple paying institutions later (row-level security).
-- Shared reference data (food tables, requirements) has organization_id NULL.

create extension if not exists pgcrypto;

-- Tenancy ---------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country char(2) not null default 'PT',
  locale text not null default 'pt-PT',
  currency char(3) not null default 'EUR',
  plan text not null default 'personal',
  created_at timestamptz not null default now()
);

create table memberships (
  organization_id uuid not null references organizations on delete cascade,
  user_id uuid not null, -- auth.users(id) on Supabase
  role text not null check (role in ('owner', 'nutritionist', 'keeper', 'viewer')),
  primary key (organization_id, user_id)
);

create or replace function is_member(org uuid) returns boolean
language sql stable as $$
  select exists (select 1 from memberships m where m.organization_id = org and m.user_id = auth.uid())
$$;

-- Reference data ----------------------------------------------------------------

create table nutrients (
  key text primary key,
  unit text not null,
  category text not null,
  label jsonb not null -- {"pt": "...", "en": "..."}
);

create table food_sources (
  id text primary key,            -- 'insa-pt', 'ciqual-fr', 'usda-fdc', 'banco-erinacia'
  name text not null,
  country char(2),
  version text,
  url text,
  license text,                   -- terms that govern redistribution/commercial use
  commercial_use_ok boolean       -- null = not yet verified
);

create table foods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations on delete cascade, -- null = shared table
  source_id text references food_sources,
  source_code text,
  name jsonb not null,            -- localised names
  food_group text,
  dry_matter numeric not null check (dry_matter > 0 and dry_matter <= 100),
  energy jsonb not null default '{}', -- kcal/100 g as fed per energy model
  sample_count int,
  reference text,
  created_at timestamptz not null default now(),
  unique (source_id, source_code)
);

create table food_nutrients (
  food_id uuid not null references foods on delete cascade,
  nutrient_key text not null references nutrients,
  value_as_fed numeric not null,
  primary key (food_id, nutrient_key)
);

create table metabolic_formulas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations on delete cascade,
  "group" text not null,
  type text not null check (type in ('NEM', 'TMB', 'NEP')),
  constant numeric not null,
  exponent numeric not null,
  weight_unit text not null check (weight_unit in ('kg', 'g')),
  energy_unit text not null check (energy_unit in ('kcal', 'kJ')),
  year int,
  reference text
);

create table requirement_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations on delete cascade,
  "group" text not null,
  reference text
);

create table requirement_values (
  profile_id uuid not null references requirement_profiles on delete cascade,
  nutrient_key text not null,     -- catalog key or water/metabolizable_energy/kcal_per_g_protein
  min_dm numeric,
  max_dm numeric,
  primary key (profile_id, nutrient_key),
  check (min_dm is not null or max_dm is not null)
);

create table intake_references (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations on delete cascade,
  "group" text not null,
  percent_body_weight numeric not null,
  basis text not null check (basis in ('DM', 'asFed')),
  reference text
);

create table growth_curves (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations on delete cascade,
  species text not null,
  name text not null,
  points jsonb,                   -- [{ "ageDays": 30, "grams": 200 }, ...]
  gompertz jsonb,                 -- { "asymptoteGrams", "b", "k" }
  reference text
);

-- Institution data --------------------------------------------------------------

create table sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  name text not null,             -- sector / enclosure / rehab room
  parent_id uuid references sites
);

create table animals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  site_id uuid references sites,
  common_name text not null,
  scientific_name text,
  nickname text,
  sex text check (sex in ('male', 'female', 'unknown')),
  birth_date date,
  age_class text,
  physiological_state text,
  group_size int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table weighings (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals on delete cascade,
  measured_on date not null,
  grams numeric not null check (grams > 0),
  body_condition numeric,
  body_condition_scale text,      -- '1-5' | '1-9'
  note text
);

create table food_prices (
  organization_id uuid not null references organizations on delete cascade,
  food_id uuid not null references foods on delete cascade,
  price_per_kg numeric not null,
  valid_from date not null default current_date,
  primary key (organization_id, food_id, valid_from)
);

create table diets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations on delete cascade,
  animal_id uuid references animals on delete set null,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  energy_model text not null,
  metabolic_formula_id uuid references metabolic_formulas,
  requirement_profile_id uuid references requirement_profiles,
  weight_mode text not null default 'predefined',
  weight_kg numeric,
  energy_adjustment numeric not null default 0,
  energy_override_kcal numeric,
  animals int not null default 1,
  vessels int not null default 1,
  meals_per_day int not null default 1,
  created_by uuid,
  created_at timestamptz not null default now(),
  replaces_id uuid references diets -- history of changes ("Alterações")
);

create table diet_items (
  diet_id uuid not null references diets on delete cascade,
  food_id uuid not null references foods,
  inclusion_as_fed numeric not null check (inclusion_as_fed >= 0),
  intake_fraction numeric not null default 1,
  presentation text,              -- 'picado médio', 'inteiro', ...
  feeding_times text[],           -- {'19:00','23:00'}
  weekdays int[],                 -- 1 = Monday
  position int not null default 0,
  primary key (diet_id, food_id)
);

create table leftover_logs (
  id uuid primary key default gen_random_uuid(),
  diet_id uuid not null references diets on delete cascade,
  food_id uuid not null references foods,
  logged_on date not null,
  offered_grams numeric not null,
  leftover_grams numeric not null,
  photo_path text,
  logged_by uuid
);

-- Row-level security --------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['foods','metabolic_formulas','requirement_profiles','intake_references','growth_curves'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (organization_id is null or is_member(organization_id))', t || '_read', t);
    execute format('create policy %I on %I for all using (organization_id is not null and is_member(organization_id))', t || '_write', t);
  end loop;
  foreach t in array array['sites','animals','food_prices','diets'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (is_member(organization_id))', t || '_member', t);
  end loop;
end $$;

alter table weighings enable row level security;
create policy weighings_member on weighings for all
  using (exists (select 1 from animals a where a.id = animal_id and is_member(a.organization_id)));

alter table diet_items enable row level security;
create policy diet_items_member on diet_items for all
  using (exists (select 1 from diets d where d.id = diet_id and is_member(d.organization_id)));

alter table leftover_logs enable row level security;
create policy leftover_logs_member on leftover_logs for all
  using (exists (select 1 from diets d where d.id = diet_id and is_member(d.organization_id)));
