import { ShoppingListItem, GrocerySection } from '../types';
import { GROCERY_SECTION_ORDER } from './grocerySections';
import { formatQuantity } from './ingredientMerger';

// ============================================================
// groceryNormalizer — transforms shopping list items into a
// cleaner, grocery-store-friendly export format.
//
// Design philosophy:
//   Clarity > precision.  If unsure, simplify rather than guess.
//   Rule: the output should look like what a person writes on
//   a fridge notepad, not what a recipe book prints.
// ============================================================

// ── Cooking-only units ──────────────────────────────────────
// These measure how much *to use in cooking*, not what to buy.
// For the grocery export we drop the quantity entirely and just
// show the ingredient name (e.g. "2 tbsp olive oil" → "olive oil").
const COOKING_ONLY_UNITS = new Set([
  // Teaspoons
  'tsp', 'teaspoon', 'teaspoons', 't', 't.',
  // Tablespoons
  'tbsp', 'tablespoon', 'tablespoons', 'T', 'T.',
  // Cups  ← this was the missing case causing most of the bugs
  'cup', 'cups', 'c', 'c.',
  // Tiny quantities
  'pinch', 'dash', 'drop', 'drops',
  // Metric volumes (rarely used but handle them safely)
  'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters',
]);

// ── Prep words that can appear at the START of a name ───────
// e.g. "Diced Onion" → strip "Diced"
// e.g. "Quartered Fresh Mushrooms" → strip "Quartered", then "Fresh"
const LEADING_PREP_WORDS = new Set([
  'diced', 'minced', 'chopped', 'sliced', 'shredded', 'grated',
  'cubed', 'quartered', 'julienned', 'peeled', 'trimmed', 'crushed',
  'torn', 'crumbled', 'coarsely', 'finely', 'thinly', 'roughly',
  'softened', 'melted', 'thawed', 'drained', 'rinsed', 'cooked',
  'fresh',        // "fresh parsley" → "parsley"
  'canned',
  // verb forms that appear in data
  'dice', 'mince', 'chop', 'slice',
]);

// ── Trailing prep words / phrases ───────────────────────────
// Removed after the last non-prep word.
// List longer phrases before shorter ones to avoid partial matches.
const TRAILING_PREP_PHRASES = [
  'at room temperature',
  'room temperature',
  'sliced thin',
  'cut into pieces',
  'cut into chunks',
  'cut in half',
  'finely chopped',
  'roughly chopped',
  'coarsely chopped',
  'minced or crushed',
  'to taste',           // "salt and pepper to taste" → "salt and pepper"
  'divided',
  'diced',
  'minced',
  'chopped',
  'sliced',
  'grated',
  'shredded',
  'cubed',
  'quartered',
  'peeled',
  'trimmed',
  'crushed',
  'softened',
  'melted',
  'thawed',
  'drained',
  'rinsed',
  'cooked',
];

// ── Embedded-quantity pattern ────────────────────────────────
// Matches a leading "1-1/2 cups" or "2.5 tablespoons" at the
// START of an ingredient name — happens when recipes are entered
// with the full recipe line in the name field.
const EMBEDDED_QUANTITY_RE =
  /^[\d\/\-\.][\d\/\-\. ]*\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp|c\.?|T\.?)\s+/i;

// ============================================================
// stripPrepNotes
//   Removes cooking-only language from an ingredient name.
//   Handles three styles found in real recipe data:
//     1. Trailing comma: "onion, diced"
//     2. Parenthetical:  "garlic (minced)" or "butter (, softened)"
//     3. Leading words:  "Diced Onion", "Quartered Fresh Mushrooms"
//     4. Trailing words: "chicken breast sliced thin"
// ============================================================
export function stripPrepNotes(name: string): string {
  let cleaned = name.trim();

  // 0. Strip an embedded quantity+unit prefix that appears when the full
  //    recipe line was stored in the name field
  //    e.g. "1-1/2 cups quartered fresh mushrooms" → "quartered fresh mushrooms"
  cleaned = cleaned.replace(EMBEDDED_QUANTITY_RE, '').trim();

  // 1. Remove parenthetical prep notes — handles "(minced)" and "(, finely chopped)"
  //    e.g. "garlic (minced)" → "garlic"
  //    e.g. "rosemary (, finely chopped)" → "rosemary"
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim();

  // 2. Remove "divided" before the comma check so it doesn't leave orphan commas
  //    e.g. "Water, divided" → "Water"
  cleaned = cleaned.replace(/,?\s*divided\s*$/i, '').trim();

  // 3. Remove everything from the first comma onward
  //    e.g. "onion, chopped" → "onion"
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx > 0) {
    cleaned = cleaned.substring(0, commaIdx).trim();
  }

  // 4. Repeatedly strip leading prep words until none remain
  //    e.g. "quartered fresh mushrooms" → "fresh mushrooms" → "mushrooms"
  let changed = true;
  while (changed) {
    changed = false;
    const words = cleaned.split(/\s+/);
    if (words.length > 1 && LEADING_PREP_WORDS.has(words[0].toLowerCase())) {
      cleaned = words.slice(1).join(' ');
      changed = true;
    }
  }

  // 5. Strip trailing prep phrases (check longer ones first to avoid partial matches)
  const lc = cleaned.toLowerCase();
  for (const phrase of TRAILING_PREP_PHRASES) {
    if (lc.endsWith(' ' + phrase)) {
      cleaned = cleaned.slice(0, cleaned.length - phrase.length - 1).trim();
      break; // only strip one trailing phrase per call
    }
  }

  return cleaned;
}

// ============================================================
// normalizeIngredientName
//   Applies semantic grocery-specific simplifications on top of
//   prep-note stripping.  Keep this conservative — when in doubt
//   do nothing rather than make a wrong guess.
// ============================================================
export function normalizeIngredientName(name: string, unit: string): string {
  const stripped = stripPrepNotes(name);
  const lc = stripped.toLowerCase();
  const unitLc = unit.toLowerCase().trim();

  // Garlic cloves → just "garlic"
  if (
    lc === 'garlic clove' ||
    lc === 'garlic cloves' ||
    lc.startsWith('garlic clove') ||
    lc === 'clove of garlic' ||
    lc === 'cloves of garlic' ||
    (unitLc.includes('clove') && lc === 'garlic')
  ) {
    return 'garlic';
  }

  return stripped;
}

// ============================================================
// convertToGroceryFriendlyItem
//   Decides the final display text for one shopping-list item.
//
//   Key rule: if the unit is a cooking measure (cups, tbsp, etc.)
//   drop the quantity entirely — just show the clean name.
//   The shopper needs to know *what* to buy, not how much to cook.
// ============================================================
export function convertToGroceryFriendlyItem(item: ShoppingListItem): string {
  const cleanName = normalizeIngredientName(item.name, item.unit);

  // Spices & Seasonings: quantity is never relevant at the store
  if (item.grocerySection === 'Spices & Seasonings') {
    return cleanName;
  }

  // "Just buy some" items — normalization collapsed these to a simple name
  // that implies a whole-unit purchase (e.g. garlic → buy a bulb, not N cloves)
  if (cleanName.toLowerCase() === 'garlic') {
    return 'garlic';
  }

  // Cooking-only units → just the ingredient name
  // e.g. "2 tablespoons diced onion" → "onion"
  // e.g. "1 1/2 cups quartered fresh mushrooms" → "mushrooms"
  if (COOKING_ONLY_UNITS.has(item.unit.trim().toLowerCase())) {
    return cleanName;
  }

  // No quantity to show
  if (item.quantity === 0) {
    return cleanName;
  }

  // No unit + non-whole quantity → almost certainly a data artifact from
  // a recipe line stored in the name field (e.g. "1-1/2 cups mushrooms" with
  // unit="").  Just show the clean name; the shopper knows what to buy.
  if (item.unit.trim() === '' && item.quantity % 1 !== 0) {
    return cleanName;
  }

  // Valid purchase units (lbs, oz, cans, bags, counts) — keep quantity
  const qtyStr = formatQuantity(item.quantity);
  const unitStr = item.unit.trim() ? ` ${item.unit.trim()}` : '';

  return `${qtyStr}${unitStr} ${cleanName}`.trim();
}

// ============================================================
// generateGroceryExport
//   Groups normalized items by grocery section, in store-layout
//   order.  Returns Map<section, display-lines[]>.
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
// formatGroceryExportText
//   Produces the final plain-text output for clipboard / .txt
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

// ============================================================
// debugNormalization  (dev/diagnostic only)
//   Call this from the browser console if you want to see the
//   before → after transformation for each item:
//     import { debugNormalization } from './groceryNormalizer';
//     debugNormalization(myItems);
// ============================================================
export function debugNormalization(items: ShoppingListItem[]): void {
  for (const item of items) {
    const before = `${formatQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ''} ${item.name}`;
    const after = convertToGroceryFriendlyItem(item);
    if (before.trim() !== after.trim()) {
      console.log(`[grocery-normalize] "${before.trim()}"  →  "${after}"`);
    }
  }
}
