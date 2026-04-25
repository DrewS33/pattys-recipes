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

// ── Regex: strip a leading Unicode fraction + unit from the name ─
// Handles ingredients stored as e.g. name="¼ cup basil", quantity=1, unit="".
const UNICODE_QTY_UNIT_RE =
  /^[¼½¾⅓⅔⅛⅜⅝⅞]\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp|c\.?|T\.?)\s+/i;

// ── Regexes used in final sanitization ──────────────────────
const RE_FRACTION  = /\d+\/\d+/g;      // 1/2, 3/4, 2/3
const RE_DECIMAL   = /\d*\.\d+/g;      // .5, 1.5, 0.25
const RE_INTEGER   = /\b\d+\b/g;       // standalone whole numbers
const RE_AMP       = /&/g;             // stray & symbols
const RE_MULTI_SPC = /\s{2,}/g;        // consecutive spaces
const RE_LEAD_JUNK = /^[^a-zA-Z]+/;    // non-letter characters at the start
const RE_TRAIL_JUNK = /[^a-zA-Z\s]+$/; // non-letter/space characters at the end


// ============================================================
// stripSingleName
//   Cleans ONE ingredient name (no commas inside).
//   Strips prep notes, leading/trailing prep words.
//   Used on individual parts after comma-splitting.
// ============================================================
function stripSingleName(name: string): string {
  let s = name.trim();

  // Remove parenthetical notes: "(minced)", "(, finely chopped)"
  s = s.replace(/\s*\([^)]*\)/g, '').trim();

  // Repeatedly strip leading prep words until stable
  // e.g. "quartered fresh mushrooms" → "fresh mushrooms" → "mushrooms"
  let changed = true;
  while (changed) {
    changed = false;
    const words = s.split(/\s+/);
    if (words.length > 1 && LEADING_PREP_WORDS.has(words[0].toLowerCase())) {
      s = words.slice(1).join(' ');
      changed = true;
    }
  }

  // Strip trailing prep phrases (longest first)
  const lc = s.toLowerCase();
  for (const phrase of TRAILING_PREP_PHRASES) {
    if (lc.endsWith(' ' + phrase)) {
      s = s.slice(0, s.length - phrase.length - 1).trim();
      break;
    }
  }

  return s.replace(/\s{2,}/g, ' ').trim();
}

// ============================================================
// stripPrepNotes
//   Used on the PURCHASE-UNIT path only (lbs, cans, bags…).
//   Strips at the first comma so "chicken, diced" → "chicken".
//   NOT used on name-only paths — those need all commas intact
//   so "garlic, pepper, salt" can split into three items.
// ============================================================
function stripPrepNotes(name: string): string {
  let s = name.trim();

  // Strip embedded "1-1/2 cups" / "¼ cup" prefix
  s = s.replace(EMBEDDED_QTY_UNIT_RE, '').trim();
  s = s.replace(UNICODE_QTY_UNIT_RE, '').trim();

  // Strip parenthetical notes
  s = s.replace(/\s*\([^)]*\)/g, '').trim();

  // Strip "divided"
  s = s.replace(/,?\s*divided\s*$/i, '').trim();

  // Strip everything after the first comma (prep note: "chicken, diced")
  const ci = s.indexOf(',');
  if (ci > 0) s = s.substring(0, ci).trim();

  return stripSingleName(s);
}


// ============================================================
// sanitizeFinalIngredientString
//   Last-pass cleanup applied to any "name-only" result before
//   it hits the export.  Handles malformed entries where someone
//   packed multiple ingredients or stray numbers into one line.
//
//   Input:  ".5 & .5 garlic, pepper, salt"
//   Output: ["garlic", "pepper", "salt"]
//
//   Normal input: "olive oil"  →  ["olive oil"]  (unchanged)
//
//   IMPORTANT: Do NOT call this on purchase-unit strings like
//   "1.5 lbs sirloin tips" — the numbers there are intentional.
// ============================================================
export function sanitizeFinalIngredientString(str: string): string[] {
  // 1. Strip embedded quantity+unit prefix before splitting
  //    e.g. "1-1/2 cups quartered mushrooms" → "quartered mushrooms"
  //    e.g. "¼ cup basil" → "basil"
  let pre = str.replace(EMBEDDED_QTY_UNIT_RE, '').trim();
  pre = pre.replace(UNICODE_QTY_UNIT_RE, '').trim();

  // 2. Strip ALL parenthetical content BEFORE comma-splitting.
  //    Critical: "fresh rosemary (, finely chopped)" has a comma INSIDE the
  //    parentheses. If we split first, we get two broken fragments.
  //    Removing the parenthetical first → "fresh rosemary"  (one clean part).
  pre = pre.replace(/\s*\([^)]*\)/g, '').trim();

  // 3. Strip "divided" at the end (before we split on commas)
  pre = pre.replace(/,?\s*divided\s*$/i, '').trim();

  // 4. Split on commas — this is the key step that expands multi-ingredient entries
  //    e.g. ".5 & .5 garlic, pepper, salt" → [".5 & .5 garlic", "pepper", "salt"]
  const parts = pre
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const results: string[] = [];

  for (const part of parts) {
    // 4. Strip prep notes from this individual part
    let s = stripSingleName(part);

    // 5. Remove stray numbers (fractions, decimals, integers) — order matters
    s = s.replace(RE_FRACTION, '');
    s = s.replace(RE_DECIMAL, '');
    s = s.replace(RE_INTEGER, '');

    // 6. Remove & and other stray symbols
    s = s.replace(RE_AMP, '');

    // 7. Strip leading/trailing non-letter characters left over
    s = s.replace(RE_LEAD_JUNK, '');
    s = s.replace(RE_TRAIL_JUNK, '');

    // 8. Collapse whitespace
    s = s.replace(RE_MULTI_SPC, ' ').trim();

    // 9. Skip if the remaining string is entirely a prep/descriptor word
    //    e.g. "onion, chopped" splits to ["onion", "chopped"] → drop "chopped"
    if (s.length > 0 && !LEADING_PREP_WORDS.has(s.toLowerCase())) {
      results.push(s);
    }
  }

  // If everything sanitized away, return nothing — caller uses flatMap
  return results;
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
// Returns string[] because one malformed entry (e.g. "garlic, pepper, salt")
// can legitimately expand into multiple clean grocery items.
// Normal entries return an array of exactly one string.
// Returns string[] because one malformed entry (e.g. "garlic, pepper, salt")
// can legitimately expand into multiple clean grocery items.
// Normal entries return an array of exactly one string.
export function cleanIngredientForGroceryExport(item: ShoppingListItem): string[] {
  const unitLc = item.unit.trim().toLowerCase();

  // ── PURCHASE UNIT PATH ───────────────────────────────────
  // Strip at first comma (e.g. "chicken, diced" → "chicken"), keep quantity.
  if (PURCHASE_UNITS.has(unitLc) && item.quantity > 0) {
    const cleanName = stripPrepNotes(item.name); // comma-strips here is intentional
    const cleanLc   = cleanName.toLowerCase();

    if (
      cleanLc === 'garlic' ||
      cleanLc === 'garlic clove' ||
      cleanLc === 'garlic cloves' ||
      cleanLc.startsWith('garlic clove') ||
      (unitLc.includes('clove') && cleanLc === 'garlic')
    ) {
      return ['garlic'];
    }

    // Sanitize the name part (strip any stray numbers/symbols), keep the quantity
    const purName = sanitizeFinalIngredientString(cleanName)[0] ?? cleanName;
    const qtyStr  = formatQuantity(item.quantity);
    return [`${qtyStr} ${item.unit.trim()} ${purName}`.trim()];
  }

  // ── NAME-ONLY PATHS ──────────────────────────────────────
  // Pass the RAW name to sanitizeFinalIngredientString so commas are preserved
  // for splitting. sanitize handles: split on commas, strip numbers, strip
  // symbols, strip prep words from each part.
  //
  // ".5 & .5 garlic, pepper, salt"  → ["garlic", "pepper", "salt"]
  // "2 tablespoons butter"  (unit handled above, name is just "butter") → ["butter"]

  // Spices & Seasonings: always name-only
  if (item.grocerySection === 'Spices & Seasonings') {
    return sanitizeFinalIngredientString(item.name);
  }

  // Cooking volume unit: drop quantity, split/clean name
  if (COOKING_VOLUME_UNITS.has(unitLc)) {
    return sanitizeFinalIngredientString(item.name);
  }

  // No quantity
  if (!item.quantity || item.quantity === 0) {
    return sanitizeFinalIngredientString(item.name);
  }

  // Empty unit + fractional quantity = malformed data
  if (item.unit.trim() === '' && item.quantity % 1 !== 0) {
    return sanitizeFinalIngredientString(item.name);
  }

  // Unknown unit — safe fallback: name only
  return sanitizeFinalIngredientString(item.name);
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

    // flatMap because one item can expand to multiple clean strings
    // (e.g. "garlic, pepper, salt" → ["garlic", "pepper", "salt"])
    result.set(
      section,
      sectionItems.flatMap((item) => cleanIngredientForGroceryExport(item))
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
    const after = cleanIngredientForGroceryExport(item).join(' | ');
    console.log(`"${before}"  →  "${after}"`);
  }
  console.groupEnd();
}
