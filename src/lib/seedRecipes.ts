// ============================================================
// seedRecipes — inserts Patty's default recipes into a new
// user's account so every account starts with content.
// Called by useRecipes when a user has 0 recipes in Supabase.
// ============================================================

import { supabase } from './supabase';
import { sampleRecipes } from '../data/recipes';
import { recipeToRow, ingredientsToRows, instructionsToRows } from './dbMapper';

const BATCH_SIZE = 5; // insert N recipes at a time to avoid request size limits

export async function seedDefaultRecipes(userId: string): Promise<void> {
  for (let i = 0; i < sampleRecipes.length; i += BATCH_SIZE) {
    const batch = sampleRecipes.slice(i, i + BATCH_SIZE);

    // Insert recipe rows
    const recipeRows = batch.map((r) => recipeToRow(r, userId));
    const { error: recipeErr } = await supabase
      .from('recipes')
      .upsert(recipeRows, { onConflict: 'id' });
    if (recipeErr) {
      console.error('[seed] Failed to insert recipes:', recipeErr.message);
      throw recipeErr;
    }

    // Insert ingredients
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

    // Insert instructions
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

/**
 * Ensures all of Patty's default recipes exist for the user without creating
 * duplicates. Safe to call even when the account already has recipes — any
 * default whose name (case-insensitive) is already present is skipped.
 * Used when importing local data so defaults are always guaranteed alongside
 * the user's own recipes.
 */
export async function ensureDefaultRecipes(userId: string): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('recipes')
    .select('name')
    .eq('user_id', userId);

  if (fetchErr) {
    console.error('[seed] Failed to fetch existing recipe names:', fetchErr.message);
    throw fetchErr;
  }

  const existingNames = new Set(
    (existing ?? []).map((r: { name: string }) => r.name.trim().toLowerCase())
  );

  const missing = sampleRecipes.filter(
    (r) => !existingNames.has(r.name.trim().toLowerCase())
  );

  if (missing.length === 0) return;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);

    const recipeRows = batch.map((r) => recipeToRow(r, userId));
    // ignoreDuplicates: skip silently if the ID already exists (e.g. user
    // renamed a Patty default locally — don't overwrite their version).
    const { error: recipeErr } = await supabase
      .from('recipes')
      .upsert(recipeRows, { onConflict: 'id', ignoreDuplicates: true });
    if (recipeErr) {
      console.error('[seed] Failed to insert missing default recipes:', recipeErr.message);
      throw recipeErr;
    }

    const ingredientRows = batch.flatMap((r) => ingredientsToRows(r, userId));
    if (ingredientRows.length > 0) {
      const { error: ingErr } = await supabase
        .from('recipe_ingredients')
        .upsert(ingredientRows, { onConflict: 'recipe_id,sort_order', ignoreDuplicates: true });
      if (ingErr) {
        console.error('[seed] Failed to insert default ingredients:', ingErr.message);
        throw ingErr;
      }
    }

    const instructionRows = batch.flatMap((r) => instructionsToRows(r, userId));
    if (instructionRows.length > 0) {
      const { error: instErr } = await supabase
        .from('recipe_instructions')
        .upsert(instructionRows, { onConflict: 'recipe_id,step_number', ignoreDuplicates: true });
      if (instErr) {
        console.error('[seed] Failed to insert default instructions:', instErr.message);
        throw instErr;
      }
    }
  }
}
