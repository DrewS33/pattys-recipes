// ============================================================
// useRecipes — loads and manages the user's recipe list.
// Replaces the old useLocalStorage('recipes-v2', ...) call.
//
// On first login with 0 recipes AND no local data (or after
// declining migration), seeds Patty's default recipes.
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
import { seedDefaultRecipes } from '../lib/seedRecipes';
import { MIGRATION_KEY } from '../lib/migration';

export interface UseRecipesReturn {
  recipes: Recipe[];
  loading: boolean;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  rateRecipe: (id: string, rating: number) => Promise<void>;
  /** Call after migration is done to force a fresh load. */
  reloadRecipes: () => Promise<void>;
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
          // Migration was declined or no local data existed → seed defaults
          if (migrationHandled === 'declined' || migrationHandled === 'no-local-data') {
            await seedDefaultRecipes(userId);
            return loadRecipes(userId); // reload after seeding
          }
          // 'accepted' — migration just ran, recipes should appear now
          // (may legitimately be 0 if migration had no recipes)
        }
        // If migrationHandled is null, App.tsx is still running the migration
        // check — don't seed yet. We'll reload after that resolves.
        setRecipes([]);
      } else {
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

    // Optimistic update
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

    // Replace ingredients: delete existing then re-insert
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
    const ingRows = ingredientsToRows(recipe, user.id);
    if (ingRows.length > 0) {
      const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingRows);
      if (ingErr) console.error('[useRecipes] ingredient insert failed:', ingErr.message);
    }

    // Replace instructions
    await supabase.from('recipe_instructions').delete().eq('recipe_id', recipe.id);
    const instRows = instructionsToRows(recipe, user.id);
    if (instRows.length > 0) {
      const { error: instErr } = await supabase.from('recipe_instructions').insert(instRows);
      if (instErr) console.error('[useRecipes] instruction insert failed:', instErr.message);
    }
  }, [user]);

  const deleteRecipe = useCallback(async (id: string) => {
    if (!user) return;

    // Optimistic update
    setRecipes((prev) => prev.filter((r) => r.id !== id));

    // CASCADE on recipe delete handles ingredients, instructions, planner_entries, shopping_selections
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) console.error('[useRecipes] deleteRecipe failed:', error.message);
  }, [user]);

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

  return { recipes, loading, saveRecipe, deleteRecipe, toggleFavorite, rateRecipe, reloadRecipes };
}
