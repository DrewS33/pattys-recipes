-- ============================================================
-- Migration: Default Recipe Protection System
-- Run this in the Supabase SQL Editor (safe to run multiple
-- times — all statements are idempotent).
-- ============================================================

-- ---- 1. Add default metadata columns to recipes -------------

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS is_default  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_key text;

-- Index for fast "which defaults does this user already have?" lookups
CREATE INDEX IF NOT EXISTS recipes_user_default_key_idx
  ON public.recipes (user_id, default_key)
  WHERE default_key IS NOT NULL;


-- ---- 2. deleted_default_recipes -----------------------------
-- Records every Patty default recipe a user has explicitly deleted.
-- ensureDefaultRecipes checks this table so it never re-seeds
-- a recipe the user intentionally removed.

CREATE TABLE IF NOT EXISTS public.deleted_default_recipes (
  user_id     uuid  REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  default_key text  NOT NULL,
  deleted_at  timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, default_key)
);

CREATE INDEX IF NOT EXISTS deleted_default_recipes_user_id_idx
  ON public.deleted_default_recipes (user_id);

ALTER TABLE public.deleted_default_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deleted_default_recipes: select own"
  ON public.deleted_default_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "deleted_default_recipes: insert own"
  ON public.deleted_default_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "deleted_default_recipes: delete own"
  ON public.deleted_default_recipes FOR DELETE
  USING (auth.uid() = user_id);
