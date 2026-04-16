// ============================================================
// usePlanner — syncs the meal plan calendar with Supabase.
// Replaces useLocalStorage('mealPlan', {}).
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { MealPlan, MealPlanDay } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { rowsToPlannerEntries } from '../lib/dbMapper';

export interface UsePlannerReturn {
  mealPlan: MealPlan;
  loading: boolean;
  setMealPlan: (plan: MealPlan) => Promise<void>;
}

export function usePlanner(): UsePlannerReturn {
  const { user } = useAuth();
  const [mealPlan, setMealPlanState] = useState<MealPlan>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMealPlanState({});
      setLoading(false);
      return;
    }

    supabase
      .from('planner_entries')
      .select('id, user_id, planned_date, meal_slot, recipe_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error('[usePlanner] Load failed:', error.message);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setMealPlanState(rowsToPlannerEntries((data ?? []) as any));
        }
        setLoading(false);
      });
  }, [user]);

  const setMealPlan = useCallback(async (newPlan: MealPlan) => {
    if (!user) return;

    // Optimistic update
    setMealPlanState(newPlan);

    // Build flat entry lists for old and new plans
    const oldEntries = flattenPlan(mealPlan);
    const newEntries = flattenPlan(newPlan);

    const newSet = new Map(newEntries.map((e) => [`${e.date}|${e.slot}`, e.recipeId]));
    const oldSet = new Map(oldEntries.map((e) => [`${e.date}|${e.slot}`, e.recipeId]));

    // Entries to upsert: new or changed recipe
    const toUpsert = newEntries.filter((e) => {
      const key = `${e.date}|${e.slot}`;
      return !oldSet.has(key) || oldSet.get(key) !== e.recipeId;
    });

    // Entries to delete: present in old plan but absent in new plan
    const toDelete = oldEntries.filter((e) => !newSet.has(`${e.date}|${e.slot}`));

    const now = new Date().toISOString();

    if (toUpsert.length > 0) {
      const rows = toUpsert.map((e) => ({
        user_id: user.id,
        planned_date: e.date,
        meal_slot: e.slot,
        recipe_id: e.recipeId,
        updated_at: now,
      }));
      const { error } = await supabase
        .from('planner_entries')
        .upsert(rows, { onConflict: 'user_id,planned_date,meal_slot' });
      if (error) console.error('[usePlanner] upsert failed:', error.message);
    }

    if (toDelete.length > 0) {
      for (const entry of toDelete) {
        const { error } = await supabase
          .from('planner_entries')
          .delete()
          .eq('user_id', user.id)
          .eq('planned_date', entry.date)
          .eq('meal_slot', entry.slot);
        if (error) console.error('[usePlanner] delete failed:', error.message);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mealPlan]);

  return { mealPlan, loading, setMealPlan };
}

// ---- helpers -----------------------------------------------

interface PlanEntry {
  date: string;
  slot: string;
  recipeId: string;
}

function flattenPlan(plan: MealPlan): PlanEntry[] {
  const entries: PlanEntry[] = [];
  for (const [date, dayPlan] of Object.entries(plan)) {
    for (const slot of ['breakfast', 'lunch', 'dinner'] as (keyof MealPlanDay)[]) {
      const recipeId = dayPlan[slot];
      if (recipeId) entries.push({ date, slot, recipeId });
    }
  }
  return entries;
}
