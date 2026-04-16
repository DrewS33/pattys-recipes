// ============================================================
// useShoppingState — persists which shopping list items are
// checked off across devices.
// Replaces useLocalStorage('checkedItems', []).
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UseShoppingStateReturn {
  /** Array of item keys that are checked. Matches the existing itemKey() format. */
  checkedItemKeys: string[];
  toggleCheck: (key: string) => Promise<void>;
  /**
   * Removes a specific set of keys from the checked state.
   * Used by "Clear checked items" to only remove items currently in the list.
   */
  clearChecked: (keysToRemove: Set<string>) => Promise<void>;
  /** Removes ALL checked state — used when clearing the whole shopping list. */
  clearAllChecked: () => Promise<void>;
}

export function useShoppingState(): UseShoppingStateReturn {
  const { user } = useAuth();
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setCheckedKeys(new Set());
      return;
    }

    supabase
      .from('shopping_item_checks')
      .select('item_key')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('[useShoppingState] Load failed:', error.message);
        } else {
          setCheckedKeys(new Set((data ?? []).map((r: { item_key: string }) => r.item_key)));
        }
      });
  }, [user]);

  // Expose as array (matches the shape App.tsx expects for useMemo(...new Set()))
  const checkedItemKeys = Array.from(checkedKeys);

  const toggleCheck = useCallback(async (key: string) => {
    if (!user) return;

    const isChecked = checkedKeys.has(key);
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      isChecked ? next.delete(key) : next.add(key);
      return next;
    });

    if (isChecked) {
      const { error } = await supabase
        .from('shopping_item_checks')
        .delete()
        .eq('user_id', user.id)
        .eq('item_key', key);
      if (error) console.error('[useShoppingState] toggleCheck (delete) failed:', error.message);
    } else {
      const { error } = await supabase
        .from('shopping_item_checks')
        .upsert(
          { user_id: user.id, item_key: key, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,item_key' }
        );
      if (error) console.error('[useShoppingState] toggleCheck (insert) failed:', error.message);
    }
  }, [user, checkedKeys]);

  const clearChecked = useCallback(async (keysToRemove: Set<string>) => {
    if (!user || keysToRemove.size === 0) return;

    setCheckedKeys((prev) => {
      const next = new Set(prev);
      keysToRemove.forEach((k) => next.delete(k));
      return next;
    });

    const { error } = await supabase
      .from('shopping_item_checks')
      .delete()
      .eq('user_id', user.id)
      .in('item_key', Array.from(keysToRemove));
    if (error) console.error('[useShoppingState] clearChecked failed:', error.message);
  }, [user]);

  const clearAllChecked = useCallback(async () => {
    if (!user) return;

    setCheckedKeys(new Set());

    const { error } = await supabase
      .from('shopping_item_checks')
      .delete()
      .eq('user_id', user.id);
    if (error) console.error('[useShoppingState] clearAllChecked failed:', error.message);
  }, [user]);

  return { checkedItemKeys, toggleCheck, clearChecked, clearAllChecked };
}
