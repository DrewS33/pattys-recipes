// ============================================================
// seedRecipes — manages Patty's default recipes for every user.
//
// KEY GUARANTEE:
//   ensureDefaultRecipes() inserts every Patty default recipe
//   that is missing from the user's account, UNLESS the user
//   has explicitly deleted it (recorded in deleted_default_recipes).
//
// It is safe to call at any time — it never overwrites existing
// recipes and never creates duplicates.
// ============================================================

import { supabase } from './supabase';
import { sampleRecipes } from '../data/recipes';
import { recipeToRow, ingredientsToRows, instructionsToRows } from './dbMapper';
import { DEFAULT_KEY_BY_ID } from './defaultKeys';

const BATCH_SIZE = 5;

// ---- Full seed (new accounts only) ------------------------------------------

/**
 * Inserts ALL of Patty's default recipes into a brand-new account.
 * Only called when the account has zero recipes and migration was declined
 * or there was no local data to import.
 */
export async function seedDefaultRecipes(userId: string): Promise<void> {
  for (let i = 0; i < sampleRecipes.length; i += BATCH_SIZE) {
    const batch = sampleRecipes.slice(i, i + BATCH_SIZE);

    const recipeRows = batch.map((r) => ({
      ...recipeToRow(r, userId),
      is_default: true,
      default_key: DEFAULT_KEY_BY_ID[r.id] ?? null,
    }));

    const { error: recipeErr } = await supabase
      .from('recipes')
      .insert(recipeRows);
    if (recipeErr) {
      console.error('[seed] Failed to insert recipes:', recipeErr.message);
      throw recipeErr;
    }

    const ingredientRows = batch.flatMap((r) => ingredientsToRows(r, userId));
    if (ingredientRows.length > 0) {
      const { error: ingErr } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientRows);
      if (ingErr) {
        console.error('[seed] Failed to insert ingredients:', ingErr.message);
        throw ingErr;
      }
    }

    const instructionRows = batch.flatMap((r) => instructionsToRows(r, userId));
    if (instructionRows.length > 0) {
      const { error: instErr } = await supabase
        .from('recipe_instructions')
        .insert(instructionRows);
      if (instErr) {
        console.error('[seed] Failed to insert instructions:', instErr.message);
        throw instErr;
      }
    }
  }
}

// ---- Incremental ensure (existing accounts) ---------------------------------

/**
 * Inserts any Patty default recipes the user is missing, respecting explicit
 * deletions. Safe to call at any time (login, after import, on demand).
 *
 * Matching is done by default_key — not by name — so renamed/edited copies of
 * a default are treated as already present and are never overwritten.
 *
 * Returns true if any recipes were added (caller may want to reload the list).
 */
export async function ensureDefaultRecipes(userId: string): Promise<boolean> {
  console.log('[seed:ensure] ▶ ensureDefaultRecipes called for userId:', userId);
  console.log('[seed:ensure] Master Patty defaults loaded:', sampleRecipes.length, 'recipes');

  // 1. Which defaults does the user already have? (by default_key)
  const { data: existingRows, error: existErr } = await supabase
    .from('recipes')
    .select('default_key')
    .eq('user_id', userId)
    .not('default_key', 'is', null);

  if (existErr) {
    console.error('[seed:ensure] ❌ Failed to fetch existing default keys:', existErr);
    throw existErr;
  }

  const existingKeys = new Set(
    (existingRows ?? []).map((r: { default_key: string }) => r.default_key)
  );
  console.log('[seed:ensure] User already has', existingKeys.size, 'default recipe(s) in DB:', [...existingKeys]);

  // 2. Which defaults has the user explicitly deleted?
  const { data: deletedRows, error: delErr } = await supabase
    .from('deleted_default_recipes')
    .select('default_key')
    .eq('user_id', userId);

  if (delErr) {
    console.error('[seed:ensure] ❌ Failed to fetch deleted_default_recipes:', delErr);
    throw delErr;
  }

  const deletedKeys = new Set(
    (deletedRows ?? []).map((r: { default_key: string }) => r.default_key)
  );
  console.log('[seed:ensure] User has explicitly deleted', deletedKeys.size, 'default(s):', [...deletedKeys]);

  // 3. Filter to only the defaults that are truly missing
  const missing = sampleRecipes.filter((r) => {
    const key = DEFAULT_KEY_BY_ID[r.id];
    if (!key) return false;
    if (existingKeys.has(key)) return false;
    if (deletedKeys.has(key)) return false;
    return true;
  });

  console.log('[seed:ensure] Missing defaults count:', missing.length);
  if (missing.length > 0) {
    console.log('[seed:ensure] Missing default_keys:', missing.map((r) => DEFAULT_KEY_BY_ID[r.id]));
  }

  if (missing.length === 0) {
    console.log('[seed:ensure] ✅ Nothing to restore — all defaults present or intentionally deleted.');
    return false;
  }

  // 4. Insert missing defaults in batches
  let insertedCount = 0;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map((r) => r.id);

    const recipeRows = batch.map((r) => ({
      ...recipeToRow(r, userId),
      is_default: true,
      default_key: DEFAULT_KEY_BY_ID[r.id],
    }));

    console.log(`[seed:ensure] Inserting recipe batch ${i / BATCH_SIZE + 1}:`, batch.map((r) => DEFAULT_KEY_BY_ID[r.id]));

    const { error: recipeErr } = await supabase
      .from('recipes')
      .insert(recipeRows);
    if (recipeErr) {
      console.error('[seed:ensure] ❌ Recipe insert failed:', recipeErr);
      throw recipeErr;
    }

    // Guard: only insert ingredients/instructions for recipe IDs that were
    // just created. If a recipe ID already existed in the DB (e.g. an
    // old pre-migration row without a default_key), the recipe insert above
    // would have failed first — so reaching here means all rows are new.
    // We still double-check by querying existing ingredient recipe_ids so
    // we never attempt a duplicate insert.
    const { data: existingIngRows } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id')
      .in('recipe_id', batchIds);

    const idsWithIngredients = new Set((existingIngRows ?? []).map((r: { recipe_id: string }) => r.recipe_id));
    const recipesNeedingIngredients = batch.filter((r) => !idsWithIngredients.has(r.id));

    console.log(`[seed:ensure] ${recipesNeedingIngredients.length}/${batch.length} recipes in batch need ingredient insert`);

    const ingredientRows = recipesNeedingIngredients.flatMap((r) => ingredientsToRows(r, userId));
    if (ingredientRows.length > 0) {
      const { error: ingErr } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientRows);
      if (ingErr) {
        console.error('[seed:ensure] ❌ Ingredient insert failed:', ingErr);
        throw ingErr;
      }
      console.log(`[seed:ensure] ✅ Ingredients inserted (${ingredientRows.length} rows)`);
    }

    const { data: existingInstRows } = await supabase
      .from('recipe_instructions')
      .select('recipe_id')
      .in('recipe_id', batchIds);

    const idsWithInstructions = new Set((existingInstRows ?? []).map((r: { recipe_id: string }) => r.recipe_id));
    const recipesNeedingInstructions = batch.filter((r) => !idsWithInstructions.has(r.id));

    const instructionRows = recipesNeedingInstructions.flatMap((r) => instructionsToRows(r, userId));
    if (instructionRows.length > 0) {
      const { error: instErr } = await supabase
        .from('recipe_instructions')
        .insert(instructionRows);
      if (instErr) {
        console.error('[seed:ensure] ❌ Instruction insert failed:', instErr);
        throw instErr;
      }
      console.log(`[seed:ensure] ✅ Instructions inserted (${instructionRows.length} rows)`);
    }

    insertedCount += batch.length;
  }

  console.log(`[seed:ensure] ✅ Done. Restored ${insertedCount} missing default recipe(s).`);
  return true;
}
