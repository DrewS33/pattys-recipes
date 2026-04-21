// ============================================================
// dbMapper — converts between Supabase row shapes and the app's
// TypeScript types. All DB I/O goes through these functions so
// the rest of the app never has to care about column naming.
// ============================================================

import {
  Recipe,
  Ingredient,
  MealPlan,
  MealPlanDay,
  PantryItem,
  StoreConfig,
  StorePreferences,
  CategoryStoreMap,
  IngredientStoreOverrides,
  GrocerySection,
  DifficultyLevel,
  ProteinType,
  MealType,
  PantryCategory,
  SelectedRecipe,
} from '../types';

// ---- Row shape interfaces (mirror the Supabase schema) ------

export interface RecipeRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  difficulty: string;
  protein_type: string;
  meal_type: string;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
  default_servings: number;
  tags: string[];
  image: string | null;
  notes: string | null;
  is_favorite: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
  recipe_ingredients: IngredientRow[];
  recipe_instructions: InstructionRow[];
}

export interface IngredientRow {
  id: string;
  recipe_id: string;
  user_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  grocery_section: string;
  prep_note: string | null;
  merge_key: string | null;
  sort_order: number;
}

export interface InstructionRow {
  id: string;
  recipe_id: string;
  user_id: string;
  step_number: number;
  instruction_text: string;
}

export interface PantryItemRow {
  id: string;
  user_id: string;
  display_name: string;
  category: string;
  is_in_pantry: boolean;
  is_custom: boolean;
  is_recurring: boolean;
}

export interface StoreRow {
  id: string;
  user_id: string;
  store_name: string;
  color: string | null;
  sort_order: number;
}

export interface CategoryDefaultRow {
  user_id: string;
  grocery_section: string;
  store_id: string;
}

export interface IngredientOverrideRow {
  user_id: string;
  normalized_name: string;
  store_id: string;
}

export interface ShoppingSelectionRow {
  user_id: string;
  recipe_id: string;
  serving_multiplier: number;
}

export interface PlannerEntryRow {
  id: string;
  user_id: string;
  planned_date: string; // ISO date string e.g. "2026-03-24"
  meal_slot: string;    // "breakfast" | "lunch" | "dinner"
  recipe_id: string | null;
}

// ---- Converters: DB rows → App types -----------------------

export function rowToRecipe(row: RecipeRow): Recipe {
  // Deduplicate by sort_order before mapping — guards against duplicate DB rows
  // that can accumulate if seedDefaultRecipes runs more than once.
  const seenIngOrders = new Set<number>();
  const uniqueIngRows = row.recipe_ingredients.filter((i) => {
    if (seenIngOrders.has(i.sort_order)) return false;
    seenIngOrders.add(i.sort_order);
    return true;
  });

  const ingredients: Ingredient[] = [...uniqueIngRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({
      name: i.ingredient_name,
      quantity: Number(i.quantity),
      unit: i.unit,
      grocerySection: i.grocery_section as GrocerySection,
      prepNote: i.prep_note ?? undefined,
      mergeKey: i.merge_key ?? undefined,
    }));

  // Deduplicate by step_number for the same reason.
  const seenSteps = new Set<number>();
  const uniqueInstRows = row.recipe_instructions.filter((i) => {
    if (seenSteps.has(i.step_number)) return false;
    seenSteps.add(i.step_number);
    return true;
  });

  const instructions: string[] = [...uniqueInstRows]
    .sort((a, b) => a.step_number - b.step_number)
    .map((i) => i.instruction_text);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    difficulty: row.difficulty as DifficultyLevel,
    proteinType: row.protein_type as ProteinType,
    mealType: row.meal_type as MealType,
    prepTimeMinutes: row.prep_minutes,
    cookTimeMinutes: row.cook_minutes,
    totalTimeMinutes: row.total_minutes,
    defaultServings: row.default_servings,
    tags: row.tags ?? [],
    image: row.image ?? undefined,
    notes: row.notes ?? undefined,
    favorite: row.is_favorite,
    rating: row.rating ?? undefined,
    ingredients,
    instructions,
  };
}

export function rowToPantryItem(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    name: row.display_name,
    category: row.category as PantryCategory,
    inPantry: row.is_in_pantry,
    isCustom: row.is_custom,
    isRecurring: row.is_recurring,
  };
}

export function rowsToStorePreferences(
  storeRows: StoreRow[],
  categoryRows: CategoryDefaultRow[],
  overrideRows: IngredientOverrideRow[]
): StorePreferences {
  const stores: StoreConfig[] = [...storeRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      id: s.id,
      name: s.store_name,
      color: s.color ?? undefined,
    }));

  const categoryDefaults: CategoryStoreMap = {};
  for (const row of categoryRows) {
    categoryDefaults[row.grocery_section as GrocerySection] = row.store_id;
  }

  const ingredientOverrides: IngredientStoreOverrides = {};
  for (const row of overrideRows) {
    ingredientOverrides[row.normalized_name] = row.store_id;
  }

  return { stores, categoryDefaults, ingredientOverrides };
}

export function rowsToPlannerEntries(rows: PlannerEntryRow[]): MealPlan {
  const plan: MealPlan = {};
  for (const row of rows) {
    if (!row.recipe_id) continue;
    if (!plan[row.planned_date]) plan[row.planned_date] = {};
    const day = plan[row.planned_date] as MealPlanDay;
    const slot = row.meal_slot as keyof MealPlanDay;
    day[slot] = row.recipe_id;
  }
  return plan;
}

// ---- Converters: App types → DB rows -----------------------

export function recipeToRow(recipe: Recipe, userId: string): Omit<RecipeRow, 'recipe_ingredients' | 'recipe_instructions' | 'created_at' | 'updated_at'> {
  return {
    id: recipe.id,
    user_id: userId,
    name: recipe.name,
    description: recipe.description,
    difficulty: recipe.difficulty,
    protein_type: recipe.proteinType,
    meal_type: recipe.mealType,
    prep_minutes: recipe.prepTimeMinutes,
    cook_minutes: recipe.cookTimeMinutes,
    total_minutes: recipe.totalTimeMinutes,
    default_servings: recipe.defaultServings,
    tags: recipe.tags,
    image: recipe.image ?? null,
    notes: recipe.notes ?? null,
    is_favorite: recipe.favorite,
    rating: recipe.rating ?? null,
  };
}

export function ingredientsToRows(
  recipe: Recipe,
  userId: string
): Omit<IngredientRow, 'id'>[] {
  return recipe.ingredients.map((ing, idx) => ({
    recipe_id: recipe.id,
    user_id: userId,
    ingredient_name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    grocery_section: ing.grocerySection,
    prep_note: ing.prepNote ?? null,
    merge_key: ing.mergeKey ?? null,
    sort_order: idx,
  }));
}

export function instructionsToRows(
  recipe: Recipe,
  userId: string
): Omit<InstructionRow, 'id'>[] {
  return recipe.instructions.map((text, idx) => ({
    recipe_id: recipe.id,
    user_id: userId,
    step_number: idx + 1,
    instruction_text: text,
  }));
}

export function pantryItemToRow(item: PantryItem, userId: string): PantryItemRow {
  return {
    id: item.id,
    user_id: userId,
    display_name: item.name,
    category: item.category,
    is_in_pantry: item.inPantry,
    is_custom: item.isCustom ?? false,
    is_recurring: item.isRecurring ?? false,
  };
}

// ---- Helpers ------------------------------------------------

/**
 * Flattens MealPlan into a list of planner entry row objects ready for upsert.
 */
export function plannerEntriesToRows(
  plan: MealPlan,
  userId: string
): Omit<PlannerEntryRow, 'id'>[] {
  const rows: Omit<PlannerEntryRow, 'id'>[] = [];
  for (const [date, dayPlan] of Object.entries(plan)) {
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      const recipeId = dayPlan[slot];
      if (recipeId) {
        rows.push({
          user_id: userId,
          planned_date: date,
          meal_slot: slot,
          recipe_id: recipeId,
        });
      }
    }
  }
  return rows;
}

/**
 * Builds a flat list of all (date, slot) entries from a MealPlan regardless
 * of whether they have a recipe — used to identify deletions.
 */
export function allPlanSlots(plan: MealPlan): Array<{ date: string; slot: string }> {
  const slots: Array<{ date: string; slot: string }> = [];
  for (const [date, dayPlan] of Object.entries(plan)) {
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      if (dayPlan[slot] !== undefined) {
        slots.push({ date, slot });
      }
    }
  }
  return slots;
}

/**
 * Resolves shopping selection rows into SelectedRecipe[] using the loaded recipe list.
 */
export function resolveShoppingSelections(
  rows: ShoppingSelectionRow[],
  recipeMap: Map<string, Recipe>
): SelectedRecipe[] {
  const result: SelectedRecipe[] = [];
  for (const row of rows) {
    const recipe = recipeMap.get(row.recipe_id);
    if (recipe) {
      result.push({ recipe, servingMultiplier: Number(row.serving_multiplier) });
    }
  }
  return result;
}
