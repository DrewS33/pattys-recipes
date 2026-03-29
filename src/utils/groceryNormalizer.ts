import { ShoppingListItem, GrocerySection } from '../types';
import { GROCERY_SECTION_ORDER } from './grocerySections';
import { formatQuantity } from './ingredientMerger';

// ============================================================
// GROCERY NORMALIZER
//
// Single strict pipeline for the "Export Grocery-Friendly List"
// feature. The ONLY goal is clarity for a shopper — not accuracy
// to the recipe.
//
// Rule: If we're not sure, drop the quantity.
//       A clean name is always better than a confusing number.
// ============================================================

// ── Units that mean "volume used in cooking" ────────────────
// These are meaningless on a grocery trip.
// When an ingredient uses one of these units → show name only.
// NOTE: all comparisons are done case-insensitively.
const COOKING_VOLUME_UNITS = new Set([
  // tablespoon variants
  'tbsp', 'tablespoon', 'tablespoons', 'T', 'T.',
  // teaspoon variants
  'tsp', 'teaspoon', 'teaspoons', 't', 't.',
  // cup variants — the main missing case from before
  'cup', 'cups', 'c', 'c.',
  // tiny measures
  'pinch', 'dash', 'drop', 'drops',
  // fluid oz (usually a cooking measure)
  'fl oz', 'fluid oz', 'fluid ounce', 'fluid ounces',
  // metric cooking volumes
  'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters',
]);

// ── Units worth keeping on the grocery list ─────────────────
// These tell the shopper how much to actually buy.
const PURCHASE_UNITS = new Set([
  // weight
  'lb', 'lbs', 'lbs.', 'lb.', 'pound', 'pounds',
  'oz', 'ounce', 'ounces',
  // whole packages
  'can', 'cans',
  'bag', 'bags',
  'box', 'boxes',
  'bottle', 'bottles',
  'jar', 'jars',
  'packet', 'packets', 'pack', 'packs',
  'bunch', 'bunches',
  'head', 'heads',
  'clove', 'cloves',  // garlic bulb context
  'bulb', 'bulbs',
]);

// ── Prep words that appear BEFORE the ingredient noun ────────
// e.g. "Diced Onion", "Quartered Fresh Mushrooms"
// Loop is repeated until stable so multiple leading words are stripped.
const LEADING_PREP_WORDS = new Set([
  'diced', 'minced', 'chopped', 'sliced', 'shredded', 'grated',
  'cubed', 'quartered', 'julienned', 'peeled', 'trimmed', 'crushed',
  'torn', 'crumbled', 'coarsely', 'finely', 'thinly', 'roughly',
  'softened', 'melted', 'thawed', 'drained', 'rinsed', 'cooked',
  'fresh',                   // "fresh parsley" → "parsley"
  'dried', 'canned',
  // verb forms that appear in recipe data
  'dice', 'mince', 'chop', 'slice',
]);

// ── Prep phrases that appear at the END of a name ────────────
// Checked longest-first to avoid partial matches.
const TRAILING_PREP_PHRASES = [
  'at room temperature', 'room temperature',
  'sliced thin', 'cut into pieces', 'cut into chunks', 'cut in half',
  'finely chopped', 'roughly chopped', 'coarsely chopped',
  'minced or crushed',
  'to taste',
  'divided',
  'diced', 'minced', 'chopped', 'sliced', 'grated', 'shredded',
  'cubed', 'quartered', 'peeled', 'trimmed', 'crushed',
  'softened', 'melted', 'thawed', 'drained', 'rinsed', 'cooked',
];

// ── Regex: strip a leading "1-1/2 cups" embedded in the name ─
// Happens when a recipe was manually entered with the full line
// in the name field (e.g. "1-1/2 cups quartered fresh mushrooms").
const EMBEDDED_QTY_UNIT_RE =
  /^[\d\/\-\. ]+\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp|c\.?|T\.?)\s+/i;


// ============================================================
// stripPrepNotes
//   Removes cooking-only language from an ingredient name.
//   Handles every style found in the real recipe data:
//     "onion, diced"              → comma-separated prep note
//     "garlic (minced)"           → parenthetical prep note
//     "Diced Onion"               → leading prep word
//     "quartered fresh mushrooms" → multiple leading prep words
//     "chicken breast sliced thin"→ trailing prep phrase
//     "Water, divided"            → trailing "divided"
// ============================================================
function stripPrepNotes(name: string): string {
  let s = name.trim();

  // 1. Strip embedded "1-1/2 cups" prefix when full recipe line is in the name
  s = s.replace(EMBEDDED_QTY_UNIT_RE, '').trim();

  // 2. Strip parenthetical notes: "(minced)", "(, finely chopped)"
  s = s.replace(/\s*\([^)]*\)/g, '').trim();

  // 3. Strip "divided" before the comma check (prevents orphan commas)
  s = s.replace(/,?\s*divided\s*$/i, '').trim();

  // 4. Strip everything after the first comma
  const ci = s.indexOf(',');
  if (ci > 0) s = s.substring(0, ci).trim();

  // 5. Repeatedly strip leading prep words (loops until stable)
  //    "Quartered Fresh Mushrooms" → "Fresh Mushrooms" → "Mushrooms"
  let changed = true;
  while (changed) {
    changed = false;
    const words = s.split(/\s+/);
    if (words.length > 1 && LEADING_PREP_WORDS.has(words[0].toLowerCase())) {
      s = words.slice(1).join(' ');
      changed = true;
    }
  }

  // 6. Strip trailing prep phrases (longest first)
  const lc = s.toLowerCase();
  for (const phrase of TRAILING_PREP_PHRASES) {
    if (lc.endsWith(' ' + phrase)) {
      s = s.slice(0, s.length - phrase.length - 1).trim();
      break;
    }
  }

  // 7. Collapse any double spaces left over
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}


// ============================================================
// cleanIngredientForGroceryExport  ← the main export pipeline
//
//   Takes one ShoppingListItem and returns a clean grocery string.
//
//   Pipeline:
//     original item
//       → strip cooking volume unit (drop quantity)
//         OR keep purchase unit quantity (lbs, cans, etc.)
//       → strip prep words from name
//       → simplify known items (garlic cloves → garlic)
//       → return clean string
// ============================================================
export function cleanIngredientForGroceryExport(item: ShoppingListItem): string {
  const unitLc = item.unit.trim().toLowerCase();

  // ── Step 1: Clean the name ───────────────────────────────
  let cleanName = stripPrepNotes(item.name);

  // Garlic cloves always simplify to just "garlic" —
  // a shopper buys a bulb, not individual cloves
  if (
    cleanName.toLowerCase() === 'garlic' ||
    cleanName.toLowerCase() === 'garlic clove' ||
    cleanName.toLowerCase() === 'garlic cloves' ||
    cleanName.toLowerCase().startsWith('garlic clove') ||
    (unitLc.includes('clove') && cleanName.toLowerCase() === 'garlic')
  ) {
    return 'garlic';
  }

  // ── Step 2: Decide whether to include a quantity ─────────

  // Spices & Seasonings never need a quantity on a grocery list
  if (item.grocerySection === 'Spices & Seasonings') {
    return cleanName;
  }

  // COOKING VOLUME UNIT → drop quantity entirely, show name only
  //   "2 tablespoons butter"   → "butter"
  //   "1 c diced potatoes"     → "potatoes"
  //   "3 tbsp parsley"         → "parsley"
  if (COOKING_VOLUME_UNITS.has(unitLc)) {
    return cleanName;
  }

  // No quantity (zero or empty) → just the name
  if (!item.quantity || item.quantity === 0) {
    return cleanName;
  }

  // Empty unit + fractional quantity = malformed data entry
  // (full recipe line was stored in name field) → show name only
  if (item.unit.trim() === '' && item.quantity % 1 !== 0) {
    return cleanName;
  }

  // PURCHASE UNIT → keep the quantity, it's useful to the shopper
  //   "1 1/2 lbs sirloin tips" → keep
  //   "2 cans tomatoes"        → keep
  //   "1 bag green beans"      → keep
  if (PURCHASE_UNITS.has(unitLc)) {
    const qtyStr = formatQuantity(item.quantity);
    const unitStr = item.unit.trim();
    return `${qtyStr} ${unitStr} ${cleanName}`.trim();
  }

  // Unknown unit — conservative fallback: show name only
  // Better to omit a quantity than to confuse the shopper
  return cleanName;
}


// ============================================================
// generateGroceryExport
//   Groups items by grocery section (store-layout order) and
//   runs each through cleanIngredientForGroceryExport.
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
      sectionItems.map((item) => cleanIngredientForGroceryExport(item))
    );
  }

  return result;
}


// ============================================================
// formatGroceryExportText
//   Plain-text output for clipboard copy or .txt download.
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
// debugGroceryNormalization
//   Call from the browser console to see before → after for
//   every item that was actually changed by normalization.
//
//   Usage:
//     import { debugGroceryNormalization } from './groceryNormalizer';
//     debugGroceryNormalization(shoppingListItems);
// ============================================================
export function debugGroceryNormalization(items: ShoppingListItem[]): void {
  console.group('[grocery-normalize] before → after');
  for (const item of items) {
    const before = [
      item.quantity ? formatQuantity(item.quantity) : '',
      item.unit,
      item.name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    const after = cleanIngredientForGroceryExport(item);
    console.log(`"${before}"  →  "${after}"`);
  }
  console.groupEnd();
}
