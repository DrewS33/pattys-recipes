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
};

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
// getStoreForIngredient
// Returns the store for a shopping list item.
// Phase 2 note: add ingredient-level overrides here before
// falling back to the category default.
// ============================================================
export function getStoreForIngredient(
  item: ShoppingListItem,
  prefs: StorePreferences
): StoreConfig | null {
  return getDefaultStoreForCategory(item.grocerySection, prefs);
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
// Splits shopping list items into groups ordered by prefs.stores.
// Items with no store assigned go into an "Unassigned" group at the end.
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

  // Order groups to match the order stores appear in prefs.stores
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
