// ============================================================
// useShoppingSelections — persists which recipes are selected
// for the shopping list and their serving multipliers.
// Replaces useLocalStorage('selectedRecipes', []).
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Recipe, SelectedRecipe } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UseShoppingSelectionsReturn {
  selectedRecipes: SelectedRecipe[];
  loading: boolean;
  addToList: (recipe: Recipe, multiplier: number) => Promise<void>;
  removeFromList: (recipeId: string) => Promise<void>;
  updateMultiplier: (recipeId: string, multiplier: number) => Promise<void>;
  clearSelections: () => Promise<void>;
}

/**
 * @param recipes — the full loaded recipe list (to resolve IDs to objects)
 */
export function useShoppingSelections(recipes: Recipe[]): UseShoppingSelectionsReturn {
  const { user } = useAuth();
  // Store as {recipeId → multiplier} for easy lookup; resolve to SelectedRecipe[] via recipes
  const [selectionMap, setSelectionMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Build a stable recipe lookup map
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  // Resolve to SelectedRecipe[] — order preserved by insertion order of the map
  const selectedRecipes = useMemo<SelectedRecipe[]>(() => {
    const result: SelectedRecipe[] = [];
    selectionMap.forEach((multiplier, recipeId) => {
      const recipe = recipeMap.get(recipeId);
      if (recipe) result.push({ recipe, servingMultiplier: multiplier });
    });
    return result;
  }, [selectionMap, recipeMap]);

  useEffect(() => {
    if (!user) {
      setSelectionMap(new Map());
      setLoading(false);
      return;
    }

    supabase
      .from('shopping_selections')
      .select('recipe_id, serving_multiplier')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('[useShoppingSelections] Load failed:', error.message);
        } else {
          const map = new Map<string, number>();
          for (const row of data ?? []) {
            map.set(row.recipe_id, Number(row.serving_multiplier));
          }
          setSelectionMap(map);
        }
        setLoading(false);
      });
  }, [user]);

  const addToList = useCallback(async (recipe: Recipe, multiplier: number) => {
    if (!user) return;

    setSelectionMap((prev) => new Map(prev).set(recipe.id, multiplier));

    const { error } = await supabase
      .from('shopping_selections')
      .upsert(
        { user_id: user.id, recipe_id: recipe.id, serving_multiplier: multiplier },
        { onConflict: 'user_id,recipe_id' }
      );
    if (error) console.error('[useShoppingSelections] addToList failed:', error.message);
  }, [user]);

  const removeFromList = useCallback(async (recipeId: string) => {
    if (!user) return;

    setSelectionMap((prev) => {
      const next = new Map(prev);
      next.delete(recipeId);
      return next;
    });

    const { error } = await supabase
      .from('shopping_selections')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId);
    if (error) console.error('[useShoppingSelections] removeFromList failed:', error.message);
  }, [user]);

  const updateMultiplier = useCallback(async (recipeId: string, multiplier: number) => {
    if (!user) return;

    setSelectionMap((prev) => new Map(prev).set(recipeId, multiplier));

    const { error } = await supabase
      .from('shopping_selections')
      .update({ serving_multiplier: multiplier })
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId);
    if (error) console.error('[useShoppingSelections] updateMultiplier failed:', error.message);
  }, [user]);

  const clearSelections = useCallback(async () => {
    if (!user) return;

    setSelectionMap(new Map());

    const { error } = await supabase
      .from('shopping_selections')
      .delete()
      .eq('user_id', user.id);
    if (error) console.error('[useShoppingSelections] clearSelections failed:', error.message);
  }, [user]);

  return { selectedRecipes, loading, addToList, removeFromList, updateMultiplier, clearSelections };
}
