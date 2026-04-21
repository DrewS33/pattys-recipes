// ============================================================
// GROCERY SECTIONS - defines which aisle items belong to
// ============================================================
export type GrocerySection =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Pantry'
  | 'Canned Goods'
  | 'Frozen'
  | 'Spices & Seasonings'
  | 'Beverages'
  | 'Miscellaneous';

// ============================================================
// DIFFICULTY LEVEL
// ============================================================
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

// ============================================================
// PROTEIN / CATEGORY TYPE
// ============================================================
export type ProteinType =
  | 'Chicken'
  | 'Beef'
  | 'Pork'
  | 'Turkey'
  | 'Seafood'
  | 'Pasta'
  | 'Soup'
  | 'Vegetarian'
  | 'Other';

// ============================================================
// MEAL TYPE
// ============================================================
export type MealType =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Snack'
  | 'Dessert'
  | 'Side Dish';

// ============================================================
// INGREDIENT - one item in a recipe
// ============================================================
export interface Ingredient {
  name: string;            // e.g. "onion", "ground beef"
  quantity: number;        // numeric amount (e.g. 1, 2.5)
  unit: string;            // e.g. "cup", "lb", "tbsp", "" for countable items
  grocerySection: GrocerySection;
  prepNote?: string;       // e.g. "diced", "minced"
  // mergeKey: used to identify matching ingredients across recipes
  // e.g. both "yellow onion" and "onion" could have mergeKey: "onion"
  mergeKey?: string;
}

// ============================================================
// RECIPE - the main data model
// ============================================================
export interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  cookTimeMinutes: number;
  prepTimeMinutes: number;
  totalTimeMinutes: number;
  defaultServings: number;
  tags: string[];
  proteinType: ProteinType;
  mealType: MealType;
  favorite: boolean;
  ingredients: Ingredient[];
  instructions: string[];   // step-by-step instructions
  notes?: string;           // optional tips / notes
  image?: string;           // optional image URL or base64
  rating?: number;          // 1–5 stars, undefined = unrated
}

// ============================================================
// SELECTED RECIPE - a recipe chosen for the shopping list
// with a custom serving multiplier
// ============================================================
export interface SelectedRecipe {
  recipe: Recipe;
  servingMultiplier: number; // 0.5 = half, 1 = original, 2 = double, etc.
}

// ============================================================
// SHOPPING LIST ITEM - one ingredient line on the list
// ============================================================
export interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  grocerySection: GrocerySection;
  checked: boolean;
  sources: string[]; // which recipe names contributed this item
}

// ============================================================
// MEAL PLAN - weekly calendar of planned meals
// ============================================================
export interface MealPlanDay {
  breakfast?: string; // recipe ID
  lunch?: string;     // recipe ID
  dinner?: string;    // recipe ID
}

export type MealPlan = Record<string, MealPlanDay>; // key: "2026-03-24"

// ============================================================
// PANTRY STAPLES
// ============================================================
export type PantryCategory =
  | 'Baking'
  | 'Oils & Fats'
  | 'Spices'
  | 'Dairy Basics'
  | 'Dry Goods'
  | 'Other';

export interface PantryItem {
  id: string;
  name: string;
  category: PantryCategory;
  inPantry: boolean;
  isCustom?: boolean;
  isRecurring?: boolean;
}

// ============================================================
// STORE PREFERENCES - for grouping shopping list by store
// ============================================================

export interface StoreConfig {
  id: string;
  name: string;
  color?: string; // hex color, e.g. "#3B82F6"
}

// Maps each GrocerySection to a store ID
export type CategoryStoreMap = Partial<Record<GrocerySection, string>>;

// normalizedIngredientName → store ID (overrides category default)
export type IngredientStoreOverrides = Record<string, string>;

export interface StorePreferences {
  stores: StoreConfig[];
  categoryDefaults: CategoryStoreMap;
  ingredientOverrides?: IngredientStoreOverrides; // optional for backwards compat with stored data
}

// Shopping list grouping mode
export type ShoppingGroupingMode = 'section' | 'store';

// ============================================================
// FILTERS - what the user has selected in the filter bar
// ============================================================
export interface Filters {
  search: string;
  difficulty: DifficultyLevel | 'All';
  proteinType: ProteinType | 'All';
  mealType: MealType | 'All';
  maxTime: number | null; // max total time in minutes
  minTime: number | null; // min total time in minutes (for "over X" filter)
  favoritesOnly: boolean;
}
