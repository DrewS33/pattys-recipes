-- ============================================================
-- Patty's Recipe App — Supabase Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- ---- 1. PROFILES --------------------------------------------
-- Auto-created for every new user via trigger.

create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  display_name text,
  created_at   timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);

-- Trigger: create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---- 2. RECIPES --------------------------------------------

create table if not exists public.recipes (
  id               text primary key,
  user_id          uuid references auth.users on delete cascade not null,
  name             text not null,
  description      text not null default '',
  difficulty       text not null default 'Medium',
  protein_type     text not null default 'Other',
  meal_type        text not null default 'Dinner',
  prep_minutes     integer not null default 0,
  cook_minutes     integer not null default 0,
  total_minutes    integer not null default 0,
  default_servings integer not null default 4,
  tags             text[] not null default '{}',
  image            text,
  notes            text,
  is_favorite      boolean not null default false,
  rating           integer,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);

alter table public.recipes enable row level security;

create policy "recipes: select own"
  on public.recipes for select using (auth.uid() = user_id);

create policy "recipes: insert own"
  on public.recipes for insert with check (auth.uid() = user_id);

create policy "recipes: update own"
  on public.recipes for update using (auth.uid() = user_id);

create policy "recipes: delete own"
  on public.recipes for delete using (auth.uid() = user_id);


-- ---- 3. RECIPE INGREDIENTS ---------------------------------

create table if not exists public.recipe_ingredients (
  id              uuid default gen_random_uuid() primary key,
  recipe_id       text references public.recipes on delete cascade not null,
  user_id         uuid references auth.users on delete cascade not null,
  ingredient_name text not null,
  quantity        numeric not null default 0,
  unit            text not null default '',
  grocery_section text not null,
  prep_note       text,
  merge_key       text,
  sort_order      integer not null default 0
);

create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index if not exists recipe_ingredients_user_id_idx   on public.recipe_ingredients (user_id);

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients: select own"
  on public.recipe_ingredients for select using (auth.uid() = user_id);

create policy "recipe_ingredients: insert own"
  on public.recipe_ingredients for insert with check (auth.uid() = user_id);

create policy "recipe_ingredients: update own"
  on public.recipe_ingredients for update using (auth.uid() = user_id);

create policy "recipe_ingredients: delete own"
  on public.recipe_ingredients for delete using (auth.uid() = user_id);


-- ---- 4. RECIPE INSTRUCTIONS --------------------------------

create table if not exists public.recipe_instructions (
  id               uuid default gen_random_uuid() primary key,
  recipe_id        text references public.recipes on delete cascade not null,
  user_id          uuid references auth.users on delete cascade not null,
  step_number      integer not null,
  instruction_text text not null
);

create index if not exists recipe_instructions_recipe_id_idx on public.recipe_instructions (recipe_id);
create index if not exists recipe_instructions_user_id_idx   on public.recipe_instructions (user_id);

alter table public.recipe_instructions enable row level security;

create policy "recipe_instructions: select own"
  on public.recipe_instructions for select using (auth.uid() = user_id);

create policy "recipe_instructions: insert own"
  on public.recipe_instructions for insert with check (auth.uid() = user_id);

create policy "recipe_instructions: update own"
  on public.recipe_instructions for update using (auth.uid() = user_id);

create policy "recipe_instructions: delete own"
  on public.recipe_instructions for delete using (auth.uid() = user_id);


-- ---- 5. SHOPPING SELECTIONS --------------------------------
-- Manually chosen recipes and their serving multipliers for the shopping list.
-- (Planner entries are derived separately and not stored here.)

create table if not exists public.shopping_selections (
  user_id            uuid references auth.users on delete cascade not null,
  recipe_id          text references public.recipes on delete cascade not null,
  serving_multiplier numeric not null default 1,
  created_at         timestamptz default now() not null,
  primary key (user_id, recipe_id)
);

create index if not exists shopping_selections_user_id_idx on public.shopping_selections (user_id);

alter table public.shopping_selections enable row level security;

create policy "shopping_selections: select own"
  on public.shopping_selections for select using (auth.uid() = user_id);

create policy "shopping_selections: insert own"
  on public.shopping_selections for insert with check (auth.uid() = user_id);

create policy "shopping_selections: update own"
  on public.shopping_selections for update using (auth.uid() = user_id);

create policy "shopping_selections: delete own"
  on public.shopping_selections for delete using (auth.uid() = user_id);


-- ---- 6. SHOPPING ITEM CHECKS --------------------------------
-- Persists which shopping list items the user has checked off.
-- item_key format: "normalizedname|unit"  (matches the app's itemKey() helper)

create table if not exists public.shopping_item_checks (
  user_id    uuid references auth.users on delete cascade not null,
  item_key   text not null,
  updated_at timestamptz default now() not null,
  primary key (user_id, item_key)
);

create index if not exists shopping_item_checks_user_id_idx on public.shopping_item_checks (user_id);

alter table public.shopping_item_checks enable row level security;

create policy "shopping_item_checks: select own"
  on public.shopping_item_checks for select using (auth.uid() = user_id);

create policy "shopping_item_checks: insert own"
  on public.shopping_item_checks for insert with check (auth.uid() = user_id);

create policy "shopping_item_checks: update own"
  on public.shopping_item_checks for update using (auth.uid() = user_id);

create policy "shopping_item_checks: delete own"
  on public.shopping_item_checks for delete using (auth.uid() = user_id);


-- ---- 7. PLANNER ENTRIES ------------------------------------

create table if not exists public.planner_entries (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  planned_date date not null,
  meal_slot    text not null check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  recipe_id    text references public.recipes on delete set null,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  unique (user_id, planned_date, meal_slot)
);

create index if not exists planner_entries_user_id_idx on public.planner_entries (user_id);

alter table public.planner_entries enable row level security;

create policy "planner_entries: select own"
  on public.planner_entries for select using (auth.uid() = user_id);

create policy "planner_entries: insert own"
  on public.planner_entries for insert with check (auth.uid() = user_id);

create policy "planner_entries: update own"
  on public.planner_entries for update using (auth.uid() = user_id);

create policy "planner_entries: delete own"
  on public.planner_entries for delete using (auth.uid() = user_id);


-- ---- 8. PANTRY ITEMS ----------------------------------------

create table if not exists public.pantry_items (
  id           text not null,
  user_id      uuid references auth.users on delete cascade not null,
  display_name text not null,
  category     text not null,
  is_in_pantry boolean not null default false,
  is_custom    boolean not null default false,
  is_recurring boolean not null default false,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  primary key (user_id, id)
);

create index if not exists pantry_items_user_id_idx on public.pantry_items (user_id);

alter table public.pantry_items enable row level security;

create policy "pantry_items: select own"
  on public.pantry_items for select using (auth.uid() = user_id);

create policy "pantry_items: insert own"
  on public.pantry_items for insert with check (auth.uid() = user_id);

create policy "pantry_items: update own"
  on public.pantry_items for update using (auth.uid() = user_id);

create policy "pantry_items: delete own"
  on public.pantry_items for delete using (auth.uid() = user_id);


-- ---- 9. STORES ----------------------------------------------

create table if not exists public.stores (
  id         text not null,
  user_id    uuid references auth.users on delete cascade not null,
  store_name text not null,
  color      text,
  sort_order integer not null default 0,
  primary key (user_id, id)
);

create index if not exists stores_user_id_idx on public.stores (user_id);

alter table public.stores enable row level security;

create policy "stores: select own"
  on public.stores for select using (auth.uid() = user_id);

create policy "stores: insert own"
  on public.stores for insert with check (auth.uid() = user_id);

create policy "stores: update own"
  on public.stores for update using (auth.uid() = user_id);

create policy "stores: delete own"
  on public.stores for delete using (auth.uid() = user_id);


-- ---- 10. CATEGORY STORE DEFAULTS ----------------------------
-- Maps each grocery section to a preferred store for this user.

create table if not exists public.category_store_defaults (
  user_id         uuid references auth.users on delete cascade not null,
  grocery_section text not null,
  store_id        text not null,
  primary key (user_id, grocery_section)
);

create index if not exists category_store_defaults_user_id_idx on public.category_store_defaults (user_id);

alter table public.category_store_defaults enable row level security;

create policy "category_store_defaults: select own"
  on public.category_store_defaults for select using (auth.uid() = user_id);

create policy "category_store_defaults: insert own"
  on public.category_store_defaults for insert with check (auth.uid() = user_id);

create policy "category_store_defaults: update own"
  on public.category_store_defaults for update using (auth.uid() = user_id);

create policy "category_store_defaults: delete own"
  on public.category_store_defaults for delete using (auth.uid() = user_id);


-- ---- 11. INGREDIENT STORE OVERRIDES -------------------------
-- Per-ingredient store assignment that overrides the category default.

create table if not exists public.ingredient_store_overrides (
  user_id         uuid references auth.users on delete cascade not null,
  normalized_name text not null,
  store_id        text not null,
  primary key (user_id, normalized_name)
);

create index if not exists ingredient_store_overrides_user_id_idx on public.ingredient_store_overrides (user_id);

alter table public.ingredient_store_overrides enable row level security;

create policy "ingredient_store_overrides: select own"
  on public.ingredient_store_overrides for select using (auth.uid() = user_id);

create policy "ingredient_store_overrides: insert own"
  on public.ingredient_store_overrides for insert with check (auth.uid() = user_id);

create policy "ingredient_store_overrides: update own"
  on public.ingredient_store_overrides for update using (auth.uid() = user_id);

create policy "ingredient_store_overrides: delete own"
  on public.ingredient_store_overrides for delete using (auth.uid() = user_id);
