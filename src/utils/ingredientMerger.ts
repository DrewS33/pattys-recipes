import { SelectedRecipe, ShoppingListItem } from '../types';

// ============================================================
// normalizeKey: cleans up an ingredient name for comparison
// e.g. "Yellow Onions" -> "yellow onion" (lowercase, remove trailing s)
// ============================================================
function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/s$/, ''); // naive singularize - removes trailing 's'
}

// Canonical forms for common unit synonyms.
// Only the merge key uses these — display still shows the original unit.
const UNIT_ALIASES: Record<string, string> = {
  cups: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp',
  teaspoon: 'tsp',   teaspoons: 'tsp',
  pound: 'lb',       pounds: 'lb',   lbs: 'lb',
  ounce: 'oz',       ounces: 'oz',
};

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

// ============================================================
// mergeIngredients: combines all ingredients from selected recipes
// into a single flat shopping list, merging duplicates where safe
// ============================================================
export function mergeIngredients(selectedRecipes: SelectedRecipe[]): ShoppingListItem[] {
  // Map keyed by "normalizedName|unit" to group matching ingredients
  const mergeMap = new Map<string, ShoppingListItem>();

  for (const { recipe, servingMultiplier } of selectedRecipes) {
    for (const ingredient of recipe.ingredients) {
      // Scale quantity by serving multiplier
      const scaledQty = ingredient.quantity * servingMultiplier;

      // Use mergeKey if provided, otherwise normalize the name
      const keyBase = ingredient.mergeKey
        ? ingredient.mergeKey.toLowerCase().trim()
        : normalizeKey(ingredient.name);

      // Include unit in the key so "1 cup onion" and "2 lbs onion" stay separate.
      // Normalize synonyms (cups→cup, tablespoon→tbsp, etc.) so e.g. "1 cup broth"
      // and "2 cups broth" merge rather than appearing as two separate list items.
      const fullKey = `${keyBase}|${normalizeUnit(ingredient.unit)}`;

      if (mergeMap.has(fullKey)) {
        // Safe to merge: same ingredient, same unit
        const existing = mergeMap.get(fullKey)!;
        existing.quantity = Math.round((existing.quantity + scaledQty) * 100) / 100;
        // Add source recipe if not already listed
        if (!existing.sources.includes(recipe.name)) {
          existing.sources.push(recipe.name);
        }
      } else {
        // First time we've seen this ingredient+unit combo
        mergeMap.set(fullKey, {
          name: ingredient.name,
          quantity: Math.round(scaledQty * 100) / 100,
          unit: ingredient.unit,
          grocerySection: ingredient.grocerySection,
          checked: false,
          sources: [recipe.name],
        });
      }
    }
  }

  // Convert map values to an array
  return Array.from(mergeMap.values());
}

// ============================================================
// formatQuantity: nicely formats a number for display
// e.g. 0.5 -> "1/2", 0.25 -> "1/4", 1.5 -> "1 1/2"
// ============================================================
export function formatQuantity(qty: number): string {
  if (qty === 0) return '0';

  const whole = Math.floor(qty);
  const decimal = qty - whole;

  // Convert common decimals to fractions
  const fractionMap: Record<number, string> = {
    0.25: '1/4',
    0.33: '1/3',
    0.5: '1/2',
    0.67: '2/3',
    0.75: '3/4',
  };

  const rounded = Math.round(decimal * 100) / 100;
  const fraction = fractionMap[rounded];

  if (fraction) {
    return whole > 0 ? `${whole} ${fraction}` : fraction;
  }

  // If no nice fraction found, just show the number cleanly
  return qty % 1 === 0 ? `${qty}` : `${qty}`;
}
