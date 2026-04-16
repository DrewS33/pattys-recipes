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
