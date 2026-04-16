// ============================================================
// useStorePreferences — syncs store preferences with Supabase.
// Replaces useLocalStorage('storePreferences', DEFAULT_STORE_PREFERENCES).
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { StorePreferences, GrocerySection } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_STORE_PREFERENCES } from '../utils/storeUtils';
import { rowsToStorePreferences } from '../lib/dbMapper';

export interface UseStorePreferencesReturn {
  storePreferences: StorePreferences;
  loading: boolean;
  updateStorePreferences: (prefs: StorePreferences) => Promise<void>;
  /** Updates a single ingredient override. Pass storeId="" to remove it. */
  setIngredientStore: (normalizedName: string, storeId: string) => Promise<void>;
}

export function useStorePreferences(): UseStorePreferencesReturn {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<StorePreferences>(DEFAULT_STORE_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_STORE_PREFERENCES);
      setLoading(false);
      return;
    }

    Promise.all([
      supabase.from('stores').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('category_store_defaults').select('*').eq('user_id', user.id),
      supabase.from('ingredient_store_overrides').select('*').eq('user_id', user.id),
    ]).then(([storesRes, catRes, overrideRes]) => {
      if (storesRes.error) console.error('[useStorePreferences] stores load failed:', storesRes.error.message);
      if (catRes.error) console.error('[useStorePreferences] cat defaults load failed:', catRes.error.message);
      if (overrideRes.error) console.error('[useStorePreferences] overrides load failed:', overrideRes.error.message);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPrefs(rowsToStorePreferences(storesRes.data as any ?? [], catRes.data as any ?? [], overrideRes.data as any ?? []));
      setLoading(false);
    });
  }, [user]);

  const updateStorePreferences = useCallback(async (newPrefs: StorePreferences) => {
    if (!user) return;

    // Optimistic update
    setPrefs(newPrefs);

    // Replace-all strategy: delete existing rows then re-insert
    // This keeps it simple and correct for a small dataset
    await Promise.all([
      supabase.from('stores').delete().eq('user_id', user.id),
      supabase.from('category_store_defaults').delete().eq('user_id', user.id),
      supabase.from('ingredient_store_overrides').delete().eq('user_id', user.id),
    ]);

    const storeRows = newPrefs.stores.map((s, idx) => ({
      id: s.id,
      user_id: user.id,
      store_name: s.name,
      color: s.color ?? null,
      sort_order: idx,
    }));
    if (storeRows.length > 0) {
      const { error } = await supabase.from('stores').insert(storeRows);
      if (error) console.error('[useStorePreferences] stores insert failed:', error.message);
    }

    const catRows = Object.entries(newPrefs.categoryDefaults ?? {})
      .filter(([, storeId]) => storeId)
      .map(([section, storeId]) => ({
        user_id: user.id,
        grocery_section: section as GrocerySection,
        store_id: storeId as string,
      }));
    if (catRows.length > 0) {
      const { error } = await supabase.from('category_store_defaults').insert(catRows);
      if (error) console.error('[useStorePreferences] cat defaults insert failed:', error.message);
    }

    const overrideRows = Object.entries(newPrefs.ingredientOverrides ?? {})
      .filter(([, storeId]) => storeId)
      .map(([name, storeId]) => ({
        user_id: user.id,
        normalized_name: name,
        store_id: storeId,
      }));
    if (overrideRows.length > 0) {
      const { error } = await supabase.from('ingredient_store_overrides').insert(overrideRows);
      if (error) console.error('[useStorePreferences] overrides insert failed:', error.message);
    }
  }, [user]);

  const setIngredientStore = useCallback(async (normalizedName: string, storeId: string) => {
    if (!user) return;

    // Update local state
    setPrefs((prev) => {
      const overrides = { ...(prev.ingredientOverrides ?? {}) };
      if (storeId === '') {
        delete overrides[normalizedName];
      } else {
        overrides[normalizedName] = storeId;
      }
      return { ...prev, ingredientOverrides: overrides };
    });

    if (storeId === '') {
      const { error } = await supabase
        .from('ingredient_store_overrides')
        .delete()
        .eq('user_id', user.id)
        .eq('normalized_name', normalizedName);
      if (error) console.error('[useStorePreferences] override delete failed:', error.message);
    } else {
      const { error } = await supabase
        .from('ingredient_store_overrides')
        .upsert(
          { user_id: user.id, normalized_name: normalizedName, store_id: storeId },
          { onConflict: 'user_id,normalized_name' }
        );
      if (error) console.error('[useStorePreferences] override upsert failed:', error.message);
    }
  }, [user]);

  return { storePreferences: prefs, loading, updateStorePreferences, setIngredientStore };
}
