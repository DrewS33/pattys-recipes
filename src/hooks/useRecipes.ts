// ============================================================
// useRecipes — loads and manages the user's recipe list.
//
// Default-recipe guarantees enforced here:
//   1. New accounts get all Patty defaults seeded on first load.
//   2. Existing accounts are checked once per browser session for
//      missing defaults and have them silently restored.
//   3. Deleting a default recipe records the deletion so it is
//      never automatically re-seeded.
//   4. restoreDefaultRecipes() lets the user (or admin) manually
//      repair a missing-defaults situation on demand.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Recipe } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  rowToRecipe,
  recipeToRow,
  ingredientsToRows,
  instructionsToRows,
} from '../lib/dbMapper';
import { seedDefaultRecipes, ensureDefaultRecipes } from '../lib/seedRecipes';
import { MIGRATION_KEY } from '../lib/migration';

// Checked once per browser session so we don't run on every hot-reload / tab focus.
const SESSION_DEFAULTS_CHECKED = 'patty-defaults-checked';

export interface UseRecipesReturn {
  recipes: Recipe[];
  loading: boolean;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  rateRecipe: (id: string, rating: number) => Promise<void>;
  /** Force a fresh load from Supabase. */
  reloadRecipes: () => Promise<void>;
  /** Enable sharing — generates a share_id if needed and returns it. */
  enableSharing: (recipeId: string) => Promise<string | null>;
  /**
   * Restore any missing Patty default recipes for the current user.
   * Respects explicit deletions — only truly absent defaults are added.
   * Returns true if anything was restored.
   */
  restoreDefaultRecipes: () => Promise<boolean>;
}

export function useRecipes(): UseRecipesReturn {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(*), recipe_instructions(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // New user — only seed if migration was already resolved
        const migrationHandled = window.localStorage.getItem(MIGRATION_KEY);
        if (migrationHandled) {
          if (migrationHandled === 'declined' || migrationHandled === 'no-local-data') {
            await seedDefaultRecipes(userId);
            return loadRecipes(userId);
          }
          if (migrationHandled === 'accepted') {
            // Import ran but yielded 0 recipes; ensure defaults are present.
            const added = await ensureDefaultRecipes(userId);
            if (added) return loadRecipes(userId);
          }
        }
        // migrationHandled is null → migration check still in progress; wait.
        setRecipes([]);
      } else {
        // Existing account — check once per session for missing defaults.
        if (!sessionStorage.getItem(SESSION_DEFAULTS_CHECKED)) {
          sessionStorage.setItem(SESSION_DEFAULTS_CHECKED, '1');
          const added = await ensureDefaultRecipes(userId);
          if (added) {
            // Re-fetch so the newly added defaults appear in the list.
            return loadRecipes(userId);
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecipes(data.map((row: any) => rowToRecipe(row)));
      }
    } catch (err) {
      console.error('[useRecipes] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    loadRecipes(user.id);
  }, [user, loadRecipes]);

  // ---- CRUD ---------------------------------------------------

  const saveRecipe = useCallback(async (recipe: Recipe) => {
    if (!user) return;

    setRecipes((prev) => {
      const exists = prev.find((r) => r.id === recipe.id);
      return exists
        ? prev.map((r) => (r.id === recipe.id ? recipe : r))
        : [recipe, ...prev];
    });

    const now = new Date().toISOString();
    const row = { ...recipeToRow(recipe, user.id), updated_at: now };

    const { error: recipeErr } = await supabase
      .from('recipes')
      .upsert(row, { onConflict: 'id' });
    if (recipeErr) {
      console.error('[useRecipes] saveRecipe failed:', recipeErr.message);
      return;
    }

    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
    const ingRows = ingredientsToRows(recipe, user.id);
    if (ingRows.length > 0) {
      const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingRows);
      if (ingErr) console.error('[useRecipes] ingredient insert failed:', ingErr.message);
    }

    await supabase.from('recipe_instructions').delete().eq('recipe_id', recipe.id);
    const instRows = instructionsToRows(recipe, user.id);
    if (instRows.length > 0) {
      const { error: instErr } = await supabase.from('recipe_instructions').insert(instRows);
      if (instErr) console.error('[useRecipes] instruction insert failed:', instErr.message);
    }
  }, [user]);

  const deleteRecipe = useCallback(async (id: string) => {
    if (!user) return;

    // Look up the recipe before removing it from state so we have its metadata.
    const recipe = recipes.find((r) => r.id === id);

    // Optimistic update
    setRecipes((prev) => prev.filter((r) => r.id !== id));

    // If this is a Patty default recipe, record the explicit deletion so
    // ensureDefaultRecipes never silently restores it in a future session.
    if (recipe?.defaultKey) {
      const { error: delRecordErr } = await supabase
        .from('deleted_default_recipes')
        .upsert(
          { user_id: user.id, default_key: recipe.defaultKey },
          { onConflict: 'user_id,default_key' }
        );
      if (delRecordErr) {
        console.error('[useRecipes] Failed to record default deletion:', delRecordErr.message);
      }
    }

    // CASCADE on recipe delete handles ingredients, instructions,
    // planner_entries, and shopping_selections automatically.
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) console.error('[useRecipes] deleteRecipe failed:', error.message);
  }, [user, recipes]);

  const toggleFavorite = useCallback(async (id: string) => {
    if (!user) return;

    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
    );

    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    const { error } = await supabase
      .from('recipes')
      .update({ is_favorite: !recipe.favorite, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) console.error('[useRecipes] toggleFavorite failed:', error.message);
  }, [user, recipes]);

  const rateRecipe = useCallback(async (id: string, rating: number) => {
    if (!user) return;

    const newRating = rating || undefined;
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rating: newRating } : r))
    );

    const { error } = await supabase
      .from('recipes')
      .update({ rating: rating || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) console.error('[useRecipes] rateRecipe failed:', error.message);
  }, [user]);

  const reloadRecipes = useCallback(async () => {
    if (user) await loadRecipes(user.id);
  }, [user, loadRecipes]);

  const enableSharing = useCallback(async (recipeId: string): Promise<string | null> => {
    if (!user) return null;
    const existing = recipes.find((r) => r.id === recipeId);
    const shareId = existing?.shareId ?? crypto.randomUUID();
    const { error } = await supabase
      .from('recipes')
      .update({ share_id: shareId, is_shareable: true, updated_at: new Date().toISOString() })
      .eq('id', recipeId)
      .eq('user_id', user.id);
    if (error) {
      console.error('[useRecipes] enableSharing failed:', error.message);
      return null;
    }
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, shareId, isShareable: true } : r))
    );
    return shareId;
  }, [user, recipes]);

  const restoreDefaultRecipes = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const added = await ensureDefaultRecipes(user.id);
    if (added) {
      await loadRecipes(user.id);
    }
    return added;
  }, [user, loadRecipes]);

  return {
    recipes,
    loading,
    saveRecipe,
    deleteRecipe,
    toggleFavorite,
    rateRecipe,
    reloadRecipes,
    enableSharing,
    restoreDefaultRecipes,
  };
}
