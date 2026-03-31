import { PantryItem } from '../types';

// ============================================================
// UNITS to strip when normalizing an ingredient for matching
// ============================================================
const UNITS = [
  'tablespoons', 'tablespoon', 'tbsps', 'tbsp',
  'teaspoons', 'teaspoon', 'tsps', 'tsp',
  'cups', 'cup',
  'ounces', 'ounce', 'ozs', 'oz',
  'pounds', 'pound', 'lbs', 'lb',
  'grams', 'gram', 'kgs', 'kg', 'g',
  'milliliters', 'milliliter', 'mls', 'ml',
  'liters', 'liter',
  'pinches', 'pinch',
  'dashes', 'dash',
  'cloves', 'clove',
  'cans', 'can',
  'packages', 'package', 'pkgs', 'pkg',
  'slices', 'slice',
  'pieces', 'piece',
  'bunches', 'bunch',
  'sprigs', 'sprig',
  'handfuls', 'handful',
  'stalks', 'stalk',
  'heads', 'head',
];

// Build a regex that matches any unit at the start of a string (word boundary)
const UNIT_PATTERN = new RegExp(
  `^(${UNITS.join('|')})\\b\\.?\\s*`,
  'i'
);

// ============================================================
// normalizePantryItem
// Lowercase and trim a pantry staple name for comparison.
// ============================================================
export function normalizePantryItem(name: string): string {
  return name.toLowerCase().trim();
}

// ============================================================
// normalizeIngredientForPantryMatch
// Strip leading quantities, units, and trailing prep notes
// so "1 tsp salt, to taste" becomes "salt".
// ============================================================
export function normalizeIngredientForPantryMatch(ingredient: string): string {
  let s = ingredient.toLowerCase().trim();

  // Strip leading quantities — whole + fraction ("1 1/2"), fraction ("1/2"), decimal/integer ("2.5" or "2")
  s = s.replace(/^\d+\s+\d+\/\d+\s*/, '');
  s = s.replace(/^\d+\/\d+\s*/, '');
  s = s.replace(/^\d+(\.\d+)?\s*/, '');

  // Strip leading unit word
  s = s.replace(UNIT_PATTERN, '');

  // Strip trailing prep notes: everything after a comma or open paren
  s = s.replace(/\s*[,(].*$/, '');

  return s.trim();
}

// ============================================================
// isPantryStaple
// Returns true if the given ingredient name matches any
// pantry item that is currently toggled ON.
//
// Matching strategy (practical, not overly complex):
//   1. Exact match after normalization
//   2. Ingredient ends with the pantry staple name
//      (handles "black pepper" → "pepper",  "kosher salt" → "salt")
//   3. Pantry item is a substring of ingredient
//      (handles "italian seasoning blend" → "italian seasoning")
// ============================================================
export function isPantryStaple(
  ingredientName: string,
  pantryItems: PantryItem[]
): boolean {
  const norm = normalizeIngredientForPantryMatch(ingredientName);

  for (const item of pantryItems) {
    if (!item.inPantry) continue;
    const pantryNorm = normalizePantryItem(item.name);

    if (norm === pantryNorm) return true;
    if (norm.endsWith(pantryNorm)) return true;
    if (norm.includes(pantryNorm)) return true;
  }

  return false;
}
