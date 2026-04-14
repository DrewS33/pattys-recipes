import { GrocerySection, ShoppingListItem, StoreConfig, StorePreferences } from '../types';

// ============================================================
// Preset colors for store badges
// ============================================================
export const PRESET_STORE_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#78716C', // stone
];

// ============================================================
// Default empty store preferences
// ============================================================
export const DEFAULT_STORE_PREFERENCES: StorePreferences = {
  stores: [],
  categoryDefaults: {},
  ingredientOverrides: {},
};

// ============================================================
// normalizeIngredientForStoreMatch
//
// Produces a stable lookup key from an ingredient name.
// Called when both saving and reading ingredient overrides so the
// key is always consistent regardless of capitalisation or minor
// wording differences.
//
// Input examples (item.name is already stripped of qty/unit):
//   "Chicken Breast"  → "chicken breast"
//   "olive oil"       → "olive oil"
//   "diced onion"     → "onion"   (prep word stripped)
// ============================================================
export function normalizeIngredientForStoreMatch(name: string): string {
  return name
    .toLowerCase()
    // remove any stray numbers (shouldn't be in item.name but just in case)
    .replace(/\d+(\.\d+)?/g, '')
    // strip common prep/descriptor words
    .replace(
      /\b(diced|minced|chopped|sliced|grated|shredded|crushed|ground|whole|fresh|dried|frozen|canned|cooked|raw|large|medium|small|extra)\b/g,
      ''
    )
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// getDefaultStoreForCategory
// Returns the StoreConfig assigned to a grocery section, or null.
// ============================================================
export function getDefaultStoreForCategory(
  section: GrocerySection,
  prefs: StorePreferences
): StoreConfig | null {
  const storeId = prefs.categoryDefaults[section];
  if (!storeId) return null;
  return prefs.stores.find((s) => s.id === storeId) ?? null;
}

// ============================================================
// getIngredientStoreOverride
// Checks if a specific ingredient has a saved store override.
// Returns the StoreConfig if found (and the store still exists),
// or null if no override or the store was deleted.
// ============================================================
export function getIngredientStoreOverride(
  item: ShoppingListItem,
  prefs: StorePreferences
): StoreConfig | null {
  const overrides = prefs.ingredientOverrides ?? {};
  const key = normalizeIngredientForStoreMatch(item.name);
  const storeId = overrides[key];
  if (!storeId) return null;
  return prefs.stores.find((s) => s.id === storeId) ?? null;
}

// ============================================================
// getStoreForIngredient
//
// Priority order:
//   1. Ingredient-specific override (saved by user for this item)
//   2. Category/section default store
//   3. null → Unassigned
// ============================================================
export function getStoreForIngredient(
  item: ShoppingListItem,
  prefs: StorePreferences
): StoreConfig | null {
  return (
    getIngredientStoreOverride(item, prefs) ??
    getDefaultStoreForCategory(item.grocerySection, prefs)
  );
}

// ============================================================
// StoreGroup — one group in the "By Store" view
// ============================================================
export interface StoreGroup {
  store: StoreConfig | null; // null = unassigned
  label: string;
  items: ShoppingListItem[];
}

// ============================================================
// groupIngredientsByStore
// Splits shopping list items into ordered store groups.
// Unassigned items go at the end.
// ============================================================
export function groupIngredientsByStore(
  items: ShoppingListItem[],
  prefs: StorePreferences
): StoreGroup[] {
  const storeMap = new Map<string, StoreGroup>();
  const unassigned: StoreGroup = { store: null, label: 'Unassigned', items: [] };

  for (const item of items) {
    const store = getStoreForIngredient(item, prefs);
    if (!store) {
      unassigned.items.push(item);
    } else {
      if (!storeMap.has(store.id)) {
        storeMap.set(store.id, { store, label: store.name, items: [] });
      }
      storeMap.get(store.id)!.items.push(item);
    }
  }

  // Maintain the store order from prefs.stores
  const groups: StoreGroup[] = [];
  for (const store of prefs.stores) {
    const group = storeMap.get(store.id);
    if (group && group.items.length > 0) {
      groups.push(group);
    }
  }
  if (unassigned.items.length > 0) {
    groups.push(unassigned);
  }

  return groups;
}
