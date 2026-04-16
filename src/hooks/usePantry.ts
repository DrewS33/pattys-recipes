// ============================================================
// usePantry — syncs pantry items with Supabase.
// Replaces useLocalStorage('pantryItems', DEFAULT_PANTRY_ITEMS).
//
// First load: if user has no pantry rows in Supabase, returns
// DEFAULT_PANTRY_ITEMS so the UI shows the default list.
// Changes are synced on each call to updatePantry().
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { PantryItem } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_PANTRY_ITEMS } from '../data/pantryData';
import { rowToPantryItem, pantryItemToRow } from '../lib/dbMapper';

export interface UsePantryReturn {
  pantryItems: PantryItem[];
  loading: boolean;
  updatePantry: (items: PantryItem[]) => Promise<void>;
}

export function usePantry(): UsePantryReturn {
  const { user } = useAuth();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(DEFAULT_PANTRY_ITEMS);
  const [loading, setLoading] = useState(true);
  const [prevItems, setPrevItems] = useState<PantryItem[]>([]);

  useEffect(() => {
    if (!user) {
      setPantryItems(DEFAULT_PANTRY_ITEMS);
      setLoading(false);
      return;
    }

    supabase
      .from('pantry_items')
      .select('id, user_id, display_name, category, is_in_pantry, is_custom')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('[usePantry] Load failed:', error.message);
          setPantryItems(DEFAULT_PANTRY_ITEMS);
        } else if (!data || data.length === 0) {
          // No pantry data yet → use defaults (not persisted until user makes a change)
          setPantryItems(DEFAULT_PANTRY_ITEMS);
          setPrevItems([]);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const loaded = (data as any[]).map(rowToPantryItem);
          setPantryItems(loaded);
          setPrevItems(loaded);
        }
        setLoading(false);
      });
  }, [user]);

  const updatePantry = useCallback(async (newItems: PantryItem[]) => {
    if (!user) return;

    // Optimistic update
    const prev = prevItems;
    setPantryItems(newItems);
    setPrevItems(newItems);

    const prevMap = new Map(prev.map((i) => [i.id, i]));

    // Items that changed (toggled, renamed, or newly added)
    const changed = newItems.filter((item) => {
      const old = prevMap.get(item.id);
      return !old || old.inPantry !== item.inPantry || old.name !== item.name;
    });

    // Custom items that were removed
    const newIds = new Set(newItems.map((i) => i.id));
    const deleted = prev.filter((i) => i.isCustom && !newIds.has(i.id));

    if (changed.length > 0) {
      const now = new Date().toISOString();
      const rows = changed.map((item) => ({
        ...pantryItemToRow(item, user.id),
        updated_at: now,
      }));
      const { error } = await supabase
        .from('pantry_items')
        .upsert(rows, { onConflict: 'user_id,id' });
      if (error) console.error('[usePantry] upsert failed:', error.message);
    }

    if (deleted.length > 0) {
      const { error } = await supabase
        .from('pantry_items')
        .delete()
        .eq('user_id', user.id)
        .in('id', deleted.map((i) => i.id));
      if (error) console.error('[usePantry] delete failed:', error.message);
    }
  }, [user, prevItems]);

  return { pantryItems, loading, updatePantry };
}
