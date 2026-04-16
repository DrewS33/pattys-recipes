// ============================================================
// migration — reads localStorage data and imports it into
// the user's Supabase account. Runs at most once per device
// (gated by the 'patty-migrated-v1' localStorage key).
// ============================================================

import { supabase } from './supabase';
import { Recipe, MealPlan, PantryItem, StorePreferences } from '../types';
import {
  recipeToRow,
  ingredientsToRows,
  instructionsToRows,
  pantryItemToRow,
  plannerEntriesToRows,
} from './dbMapper';
import { seedDefaultRecipes } from './seedRecipes';

/** The key we set after migration is resolved so it never shows again. */
export const MIGRATION_KEY = 'patty-migrated-v1';

// ---- Reading from localStorage ------------------------------------------------

export interface LocalStorageSnapshot {
  recipes: Recipe[];
  recipeCount: number;
  pantry: PantryItem[];
  hasPantry: boolean;
  mealPlan: MealPlan;
  hasMealPlan: boolean;
  storePrefs: StorePreferences | null;
  hasStorePrefs: boolean;
  checkedItemKeys: string[];
}

function tryParse<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function readLocalStorageSnapshot(): LocalStorageSnapshot | null {
  const recipes = tryParse<Recipe[]>('recipes-v2') ?? [];
  const pantry = tryParse<PantryItem[]>('pantryItems') ?? [];
  const mealPlan = tryParse<MealPlan>('mealPlan') ?? {};
  const storePrefs = tryParse<StorePreferences>('storePreferences');
  const checkedItemKeys = tryParse<string[]>('checkedItems') ?? [];

  if (recipes.length === 0 && pantry.length === 0) return null;

  return {
    recipes,
    recipeCount: recipes.length,
    pantry,
    hasPantry: pantry.some((i) => i.inPantry),
    mealPlan,
    hasMealPlan: Object.keys(mealPlan).length > 0,
    storePrefs,
    hasStorePrefs:
      storePrefs != null &&
      (storePrefs.stores.length > 0 || Object.keys(storePrefs.categoryDefaults ?? {}).length > 0),
    checkedItemKeys,
  };
}

// ---- Check whether migration should be offered --------------------------------

/**
 * Returns the snapshot to show in the migration prompt, or null if:
 * - migration was already handled on this device, OR
 * - the user already has recipes in Supabase (returning user on a new device)
 */
export async function checkMigrationNeeded(userId: string): Promise<LocalStorageSnapshot | null> {
  // Already handled on this device
  if (window.localStorage.getItem(MIGRATION_KEY)) return null;

  // Check if user already has cloud recipes (e.g. signed in on a different device first)
  const { count } = await supabase
    .from('recipes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if ((count ?? 0) > 0) {
    // Account already has data — nothing to migrate
    window.localStorage.setItem(MIGRATION_KEY, 'already-has-cloud-data');
    return null;
  }

  // Check for local data
  const snapshot = readLocalStorageSnapshot();
  if (!snapshot) {
    // No local data — nothing to migrate (useRecipes will seed defaults)
    window.localStorage.setItem(MIGRATION_KEY, 'no-local-data');
    return null;
  }

  return snapshot;
}

// ---- Perform the import -------------------------------------------------------

const BATCH_SIZE = 5;

export async function performMigration(
  userId: string,
  snapshot: LocalStorageSnapshot
): Promise<void> {
  const { recipes, pantry, mealPlan, storePrefs, checkedItemKeys } = snapshot;

  // --- Recipes ---
  for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
    const batch = recipes.slice(i, i + BATCH_SIZE);

    const { error: rErr } = await supabase
      .from('recipes')
      .upsert(batch.map((r) => recipeToRow(r, userId)), { onConflict: 'id' });
    if (rErr) throw new Error(`Recipe insert failed: ${rErr.message}`);

    const ingRows = batch.flatMap((r) => ingredientsToRows(r, userId));
    if (ingRows.length > 0) {
      const { error: iErr } = await supabase.from('recipe_ingredients').insert(ingRows);
      if (iErr) throw new Error(`Ingredient insert failed: ${iErr.message}`);
    }

    const instRows = batch.flatMap((r) => instructionsToRows(r, userId));
    if (instRows.length > 0) {
      const { error: stErr } = await supabase.from('recipe_instructions').insert(instRows);
      if (stErr) throw new Error(`Instruction insert failed: ${stErr.message}`);
    }
  }

  // --- Pantry ---
  if (pantry.length > 0) {
    const pantryRows = pantry.map((p) => pantryItemToRow(p, userId));
    const { error: pErr } = await supabase
      .from('pantry_items')
      .upsert(pantryRows, { onConflict: 'user_id,id' });
    if (pErr) console.warn('[migration] Pantry insert failed:', pErr.message);
  }

  // --- Meal plan ---
  const planRows = plannerEntriesToRows(mealPlan, userId);
  if (planRows.length > 0) {
    const { error: planErr } = await supabase
      .from('planner_entries')
      .upsert(planRows, { onConflict: 'user_id,planned_date,meal_slot' });
    if (planErr) console.warn('[migration] Planner insert failed:', planErr.message);
  }

  // --- Store preferences ---
  if (storePrefs) {
    const storeRows = storePrefs.stores.map((s, idx) => ({
      id: s.id,
      user_id: userId,
      store_name: s.name,
      color: s.color ?? null,
      sort_order: idx,
    }));
    if (storeRows.length > 0) {
      const { error: sErr } = await supabase
        .from('stores')
        .upsert(storeRows, { onConflict: 'user_id,id' });
      if (sErr) console.warn('[migration] Stores insert failed:', sErr.message);
    }

    const catRows = Object.entries(storePrefs.categoryDefaults ?? {}).map(
      ([section, storeId]) => ({ user_id: userId, grocery_section: section, store_id: storeId })
    );
    if (catRows.length > 0) {
      const { error: cErr } = await supabase
        .from('category_store_defaults')
        .upsert(catRows, { onConflict: 'user_id,grocery_section' });
      if (cErr) console.warn('[migration] Category defaults insert failed:', cErr.message);
    }

    const overrideRows = Object.entries(storePrefs.ingredientOverrides ?? {}).map(
      ([name, storeId]) => ({ user_id: userId, normalized_name: name, store_id: storeId })
    );
    if (overrideRows.length > 0) {
      const { error: oErr } = await supabase
        .from('ingredient_store_overrides')
        .upsert(overrideRows, { onConflict: 'user_id,normalized_name' });
      if (oErr) console.warn('[migration] Overrides insert failed:', oErr.message);
    }
  }

  // --- Shopping item checks ---
  if (checkedItemKeys.length > 0) {
    const checkRows = checkedItemKeys.map((key) => ({
      user_id: userId,
      item_key: key,
    }));
    const { error: chkErr } = await supabase
      .from('shopping_item_checks')
      .upsert(checkRows, { onConflict: 'user_id,item_key' });
    if (chkErr) console.warn('[migration] Checked items insert failed:', chkErr.message);
  }

  window.localStorage.setItem(MIGRATION_KEY, 'accepted');
}

// ---- Decline: seed defaults instead -------------------------------------------

export async function declineMigration(userId: string): Promise<void> {
  await seedDefaultRecipes(userId);
  window.localStorage.setItem(MIGRATION_KEY, 'declined');
}
