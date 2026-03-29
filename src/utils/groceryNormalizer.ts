import { ShoppingListItem, GrocerySection } from '../types';
import { GROCERY_SECTION_ORDER } from './grocerySections';
import { formatQuantity } from './ingredientMerger';

// ============================================================
// groceryNormalizer — transforms shopping list items into a
// cleaner, grocery-store-friendly export format.
//
// Design goals:
//   - Strip cooking prep language (diced, minced, sliced, etc.)
//   - Drop quantities for spices/small condiments (just list name)
//   - Simplify well-known items (garlic cloves → garlic)
//   - Group by grocery section (reuses existing section data)
//   - Be conservative: prefer "milk" over "1 gallon whole milk"
// ============================================================

// Prep words that sometimes appear at the START of ingredient names
// e.g. "Diced Onion" → strip "Diced"
const LEADING_PREP_WORDS = new Set([
  'diced', 'minced', 'chopped', 'sliced', 'grated', 'shredded',
  'cubed', 'julienned', 'quartered', 'peeled', 'trimmed', 'crushed',
  'torn', 'crumbled', 'coarsely', 'finely', 'thinly', 'roughly',
  'softened', 'melted', 'thawed', 'drained', 'rinsed', 'cooked',
  'fresh', 'canned',
  // common verb forms that appear as leading words in recipe data
  'dice', 'mince', 'chop', 'slice',
]);

// Prep phrases that appear at the END of ingredient names
// e.g. "chicken breast, sliced thin" → "chicken breast"
const TRAILING_PREP_PHRASES = [
  'at room temperature', 'room temperature',
  'sliced thin', 'cut into pieces', 'cut in half', 'cut into chunks',
  'diced', 'minced', 'chopped', 'sliced', 'grated', 'shredded',
  'cubed', 'julienned', 'quartered', 'peeled', 'trimmed', 'crushed',
  'torn', 'crumbled', 'softened', 'melted', 'thawed', 'drained', 'rinsed', 'cooked',
];

// Units where quantity is too small to bother listing on a grocery trip
// e.g. "2 tsp paprika" → just list "paprika"
const SMALL_UNIT_SET = new Set([
  'tsp', 'teaspoon', 'teaspoons', 't', 't.',
  'tbsp', 'tablespoon', 'tablespoons', 'T', 'T.',
  'pinch', 'dash', 'drop', 'drops',
]);

// ============================================================
// stripPrepNotes: removes cooking-only language from a name
// ============================================================
export function stripPrepNotes(name: string): string {
  let cleaned = name.trim();

  // Remove everything after the first comma — prep notes usually follow
  // e.g. "onion, diced" → "onion"
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx > 0) {
    cleaned = cleaned.substring(0, commaIdx).trim();
  }

  // Remove a single leading prep word
  // e.g. "Diced Onion" → "Onion"
  const words = cleaned.split(/\s+/);
  if (words.length > 1 && LEADING_PREP_WORDS.has(words[0].toLowerCase())) {
    cleaned = words.slice(1).join(' ');
  }

  // Remove trailing prep phrases (check longest first to avoid partial matches)
  const lc = cleaned.toLowerCase();
  for (const phrase of TRAILING_PREP_PHRASES) {
    if (lc.endsWith(' ' + phrase)) {
      cleaned = cleaned.slice(0, cleaned.length - phrase.length - 1).trim();
      break;
    }
  }

  return cleaned;
}

// ============================================================
// normalizeIngredientName: applies grocery-specific simplifications
// on top of basic prep-note stripping
// ============================================================
export function normalizeIngredientName(name: string, unit: string): string {
  const stripped = stripPrepNotes(name);
  const lc = stripped.toLowerCase();

  // Garlic cloves / clove of garlic → just "garlic"
  if (
    lc === 'garlic clove' ||
    lc === 'garlic cloves' ||
    lc.startsWith('garlic clove') ||
    lc === 'clove of garlic' ||
    lc === 'cloves of garlic' ||
    (unit.toLowerCase().includes('clove') && lc === 'garlic')
  ) {
    return 'garlic';
  }

  return stripped;
}

// ============================================================
// convertToGroceryFriendlyItem: produces a single display line
// for one shopping list item in grocery-export format
// ============================================================
export function convertToGroceryFriendlyItem(item: ShoppingListItem): string {
  const cleanName = normalizeIngredientName(item.name, item.unit);

  // Spices & Seasonings: listing a quantity doesn't help in the store
  if (item.grocerySection === 'Spices & Seasonings') {
    return cleanName;
  }

  // Very small units (tsp, tbsp, pinch, dash): just the pantry item name
  // e.g. "2 tbsp olive oil" → "olive oil"
  if (SMALL_UNIT_SET.has(item.unit.trim())) {
    return cleanName;
  }

  // No quantity — just the name
  if (item.quantity === 0) {
    return cleanName;
  }

  // Build "quantity unit name"
  const qtyStr = formatQuantity(item.quantity);
  const unitStr = item.unit.trim() ? ` ${item.unit.trim()}` : '';

  return `${qtyStr}${unitStr} ${cleanName}`.trim();
}

// ============================================================
// generateGroceryExport: groups and normalizes items by section
// Returns a Map<section, string[]> in store-layout order
// ============================================================
export function generateGroceryExport(
  items: ShoppingListItem[]
): Map<GrocerySection, string[]> {
  const result = new Map<GrocerySection, string[]>();

  for (const section of GROCERY_SECTION_ORDER) {
    const sectionItems = items.filter((item) => item.grocerySection === section);
    if (sectionItems.length === 0) continue;

    result.set(
      section,
      sectionItems.map((item) => convertToGroceryFriendlyItem(item))
    );
  }

  return result;
}

// ============================================================
// formatGroceryExportText: produces plain-text output for
// clipboard copy or .txt file download
// ============================================================
export function formatGroceryExportText(items: ShoppingListItem[]): string {
  const grouped = generateGroceryExport(items);
  const lines: string[] = ['GROCERY LIST\n'];

  for (const [section, sectionLines] of grouped.entries()) {
    lines.push(`\n${section.toUpperCase()}`);
    for (const line of sectionLines) {
      lines.push(`- ${line}`);
    }
  }

  return lines.join('\n');
}
