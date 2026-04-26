// ============================================================
// recipeTextParser.ts  —  local, rule-based recipe text parser
// No external APIs. Runs entirely in the browser.
// ============================================================

import { Ingredient, GrocerySection, ProteinType, MealType } from '../types';

// ── Public output type ────────────────────────────────────────
export interface ParsedRecipe {
  name?: string;
  description?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  ingredients: Ingredient[];
  instructions: string[];
  notes?: string;
  proteinType?: ProteinType;
  mealType?: MealType;
}

// ── Time parsing ─────────────────────────────────────────────

/** Convert a time string like "1 hour 30 min" or "45 minutes" to total minutes. */
function parseTimeMinutes(str: string): number | undefined {
  const s = str.toLowerCase().trim();
  let total = 0;
  let found = false;

  const hrMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/);
  if (hrMatch) { total += parseFloat(hrMatch[1]) * 60; found = true; }

  const minMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/);
  if (minMatch) { total += parseFloat(minMatch[1]); found = true; }

  // bare number fallback (assume minutes)
  if (!found) {
    const bare = s.match(/^(\d+)$/);
    if (bare) return parseInt(bare[1]);
  }

  return found ? Math.round(total) : undefined;
}

// ── Quantity parsing ──────────────────────────────────────────

/** Parse a quantity string: "1/2" → 0.5, "1 1/2" → 1.5, "2" → 2 */
function parseQuantity(str: string): number {
  const s = str.trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const n = parseFloat(s);
  return isNaN(n) ? 1 : n;
}

// Unicode vulgar fraction characters and their decimal values.
const UNICODE_FRACS: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};

/**
 * Parse a leading quantity from the start of a string, returning the numeric
 * value and the remaining string after the quantity (and any trailing space).
 * Handles: Unicode fractions, whole+Unicode ("1-½"), whole+ASCII-fraction
 * ("1-1/2"), and standard ASCII ("1 1/2", "1/2", "2", "1.5").
 * Returns null if no leading quantity is found.
 */
export function parseLeadingQuantity(s: string): { qty: number; rest: string } | null {
  // Unicode fraction alone: "¼ cup basil"
  if (s[0] && UNICODE_FRACS[s[0]] !== undefined) {
    return { qty: UNICODE_FRACS[s[0]], rest: s.slice(1).trimStart() };
  }

  // Whole + hyphenated Unicode fraction: "1-½ cups"
  const wuf = s.match(/^(\d+)-([¼½¾⅓⅔⅛⅜⅝⅞])\s*/);
  if (wuf) {
    return { qty: parseInt(wuf[1]) + (UNICODE_FRACS[wuf[2]] ?? 0), rest: s.slice(wuf[0].length) };
  }

  // Whole + hyphenated ASCII fraction: "1-1/2 cups"
  const haf = s.match(/^(\d+)-(\d+)\/(\d+)\s+/);
  if (haf) {
    return { qty: parseInt(haf[1]) + parseInt(haf[2]) / parseInt(haf[3]), rest: s.slice(haf[0].length) };
  }

  // Standard ASCII: "1 1/2", "1/2", "2", "1.5"
  const QTY_RE = /^((?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))\s*/;
  const m = s.match(QTY_RE);
  if (m) {
    return { qty: parseQuantity(m[1]), rest: s.slice(m[0].length) };
  }

  return null;
}

// ── Unit lookup ───────────────────────────────────────────────

// Normalized unit spellings (long form → short form)
const UNIT_NORMALIZE: Record<string, string> = {
  tablespoons: 'tbsp', tablespoon: 'tbsp', tbsps: 'tbsp',
  teaspoons: 'tsp',   teaspoon: 'tsp',   tsps: 'tsp',
  cups: 'cup',
  pounds: 'lb', pound: 'lb', lbs: 'lb',
  ounces: 'oz', ounce: 'oz', ozs: 'oz',
  cloves: 'clove',
  cans: 'can',
  packages: 'package', package: 'package', pkgs: 'pkg',
  liters: 'liter', litres: 'liter', litre: 'liter',
  milliliters: 'ml', milliliter: 'ml',
  grams: 'g', gram: 'g',
  kilograms: 'kg', kilogram: 'kg',
  pints: 'pint', quarts: 'quart', gallons: 'gallon',
  pinches: 'pinch', dashes: 'dash',
  handfuls: 'handful', bunches: 'bunch', heads: 'head',
  slices: 'slice', pieces: 'piece', sprigs: 'sprig',
  stalks: 'stalk', strips: 'strip', sheets: 'sheet',
  links: 'link', fillets: 'fillet', drops: 'drop',
};

// All known unit strings, sorted longest-first so greedy match wins
const ALL_UNITS = [
  'tablespoons', 'tablespoon', 'tbsps', 'tbsp',
  'teaspoons',   'teaspoon',   'tsps',  'tsp',
  'cups', 'cup',
  'pounds', 'pound', 'lbs', 'lb',
  'ounces', 'ounce', 'ozs', 'oz',
  'cloves', 'clove',
  'cans', 'can',
  'packages', 'package', 'pkgs', 'pkg',
  'liters', 'liter', 'litres', 'litre',
  'milliliters', 'milliliter', 'ml',
  'grams', 'gram', 'g',
  'kilograms', 'kilogram', 'kg',
  'pints', 'pint', 'pt',
  'quarts', 'quart', 'qt',
  'gallons', 'gallon', 'gal',
  'pinches', 'pinch',
  'dashes', 'dash',
  'handfuls', 'handful',
  'bunches', 'bunch',
  'heads', 'head',
  'slices', 'slice',
  'pieces', 'piece',
  'sprigs', 'sprig',
  'stalks', 'stalk',
  'strips', 'strip',
  'sheets', 'sheet',
  'links', 'link',
  'fillets', 'fillet',
  'drops', 'drop',
  'large', 'medium', 'small',
].sort((a, b) => b.length - a.length);

// ── Grocery section guesser ───────────────────────────────────

/** Guess a grocery section from ingredient name using keyword matching. */
function guessGrocerySection(name: string): GrocerySection {
  const n = name.toLowerCase();

  if (/chicken|beef|pork|turkey|fish|salmon|shrimp|sausage|bacon|ground\s+(beef|turkey|pork)|steak|lamb|ham|tuna|meat|seafood|scallop|crab|lobster|brisket|drumstick|breast|thigh|veal|duck|venison/.test(n))
    return 'Meat & Seafood';

  if (/\bmilk\b|cream\b|butter\b|cheese\b|yogurt\b|egg\b|eggs\b|sour\s+cream|heavy\s+cream|half.and.half|parmesan|mozzarella|cheddar|cream\s+cheese|ricotta|brie|gouda|provolone|whipped\s+cream/.test(n))
    return 'Dairy & Eggs';

  if (/onion|garlic|carrot|celery|tomato(?!.*sauce|.*paste|.*can)|lettuce|pepper(?!.*flake|.*powder)|cucumber|spinach|potato|broccoli|zucchini|mushroom|lemon|lime|apple|banana|strawberr|blueberr|raspberr|blackberr|parsley|cilantro|basil(?!\s+dried)|thyme(?!\s+dried)|rosemary(?!\s+dried)|ginger\s+(?:root|fresh)|avocado|cabbage|kale|leek|shallot|scallion|green\s+onion|jalape|arugula|beet|radish|artichoke|asparagus|eggplant|squash|pumpkin|snap\s+peas|green\s+beans|bell\s+pepper|pear|mango|peach|plum|grape|cherr|orange|grapefruit|melon|watermelon|cantaloupe|fennel\s+bulb|bok\s+choy|swiss\s+chard/.test(n))
    return 'Produce';

  if (/\bbread\b|bun\b|roll\b|tortilla\b|pita\b|croissant\b|bagel\b|baguette\b|naan\b/.test(n))
    return 'Bakery';

  if (/broth|stock|tomato\s+sauce|tomato\s+paste|canned|beans|lentils|chickpeas|kidney|navy\s+bean|black\s+bean|pinto|condensed\s+soup|coconut\s+milk|evaporated\s+milk|corn\s+(?:kernel|can)|artichoke\s+heart/.test(n))
    return 'Canned Goods';

  if (/salt\b|pepper(?:corn)?s?\b|cumin\b|paprika\b|oregano\b|cinnamon\b|cayenne\b|chili\s+powder|garlic\s+powder|onion\s+powder|bay\s+leaf|nutmeg\b|turmeric\b|curry\b|seasoning|spice|allspice|cardamom|coriander|dill\b|fennel\s+seed|sage\b|tarragon\b|marjoram\b|saffron\b|anise\b|red\s+pepper\s+flakes|italian\s+seasoning|herb\s+mix/.test(n))
    return 'Spices & Seasonings';

  if (/flour|sugar|oil\b|vinegar|rice\b|pasta\b|spaghetti|penne|linguine|fettuccine|rigatoni|lasagna|noodle|oat\b|breadcrumb|baking\s+(?:powder|soda)|vanilla|honey\b|maple\s+syrup|soy\s+sauce|olive\s+oil|vegetable\s+oil|canola\s+oil|cocoa\b|chocolate|cornstarch|cornmeal|yeast\b|gelatin\b|molasses\b|hot\s+sauce|worcestershire|ketchup\b|mustard\b|mayo|mayonnaise|peanut\s+butter|tahini|almond\s+flour|nuts?\b|almond|walnut|pecan|cashew|pistachio|peanut|sesame\s+seed|sunflower\s+seed|raisin|dried\s+cranberr|dried\s+apricot|panko|crouton|oyster\s+sauce|fish\s+sauce|mirin\b|teriyaki/.test(n))
    return 'Pantry';

  if (/frozen/.test(n))
    return 'Frozen';

  if (/\bwater\b|juice\b|wine\b|beer\b|soda\b|coffee\b|tea\b|lemonade\b|broth\b|stock\b|sparkling/.test(n))
    return 'Beverages';

  return 'Miscellaneous';
}

// ── Prep-note common terms ────────────────────────────────────

const PREP_NOTE_WORDS = new Set([
  'diced', 'chopped', 'sliced', 'minced', 'grated', 'shredded', 'peeled',
  'crushed', 'julienned', 'cubed', 'halved', 'quartered', 'roughly',
  'finely', 'thinly', 'coarsely', 'torn', 'trimmed', 'rinsed', 'drained',
  'thawed', 'softened', 'melted', 'divided', 'packed', 'beaten', 'cooked',
  'uncooked', 'raw', 'frozen', 'fresh', 'dried', 'soaked', 'cut',
]);

function startsWithPrepNote(s: string): boolean {
  const first = s.toLowerCase().split(/[\s,]/)[0];
  return PREP_NOTE_WORDS.has(first);
}

// ── Ingredient line parser ────────────────────────────────────

/** Parse one ingredient line into structured data. Returns null if unparseable. */
export function parseIngredientLine(raw: string): Ingredient | null {
  // Strip leading bullets / list markers
  const line = raw.trim().replace(/^[\-\*•·▪▸◦‣]\s*/, '').trim();
  if (!line || line.length < 2) return null;

  // --- Quantity ---
  // Handles Unicode fractions (¼ ½ ¾ …), hyphenated mixed numbers (1-½, 1-1/2),
  // and standard ASCII (1 1/2, 1/2, 2.5, 3).
  let rest = line;
  let quantity = 1;

  const leading = parseLeadingQuantity(rest);
  if (leading) {
    quantity = leading.qty;
    rest = leading.rest;
  }

  // --- Unit ---
  let unit = '';
  const restLower = rest.toLowerCase();
  for (const u of ALL_UNITS) {
    // Unit must be followed by whitespace or end-of-string
    if (restLower.startsWith(u) && (rest.length === u.length || /[\s,.]/.test(rest[u.length]))) {
      unit = UNIT_NORMALIZE[u] ?? u;
      rest = rest.slice(u.length).trimStart();
      break;
    }
  }

  if (!rest) {
    // Whole line was just a quantity/unit — fall back to keeping raw as name
    return { name: line, quantity: 1, unit: '', grocerySection: guessGrocerySection(line) };
  }

  // --- Name + optional prep note ---
  // Split at first comma — check if the after-comma text looks like a prep note
  let name = rest;
  let prepNote: string | undefined;

  const commaIdx = rest.indexOf(',');
  if (commaIdx > 0) {
    const after = rest.slice(commaIdx + 1).trim();
    if (after && (startsWithPrepNote(after) || after.split(/\s+/).length <= 4)) {
      name = rest.slice(0, commaIdx).trim();
      prepNote = after;
    }
  }

  // Parenthetical notes: "chicken breast (boneless, skinless)"
  if (!prepNote) {
    const parenMatch = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      prepNote = parenMatch[2].trim();
    }
  }

  if (!name) return null;

  return {
    name,
    quantity,
    unit,
    prepNote,
    grocerySection: guessGrocerySection(name),
  };
}

// ── Section header detection ──────────────────────────────────

const INGREDIENT_HEADERS = [
  'ingredients', 'ingredient list', "what you'll need", 'what you need',
  'you will need', 'ingredients list', 'shopping list',
];
const INSTRUCTION_HEADERS = [
  'instructions', 'directions', 'method', 'steps', 'how to make',
  'preparation', 'how to prepare', 'cooking instructions', 'cooking directions',
  'cooking method', 'directions for cooking', 'recipe steps', 'make it',
  'to make', 'procedure',
];
const NOTES_HEADERS = [
  'notes', 'tips', 'note', 'chef notes', "chef's notes", "cook's notes",
  "cook's tips", 'cooking tips', 'additional notes', 'tip', 'serving suggestion',
  'serving suggestions', 'tips and tricks', 'storage', 'make ahead',
];

function isSectionHeader(line: string, keywords: string[]): boolean {
  const stripped = line
    .trim()
    .replace(/^[-=*#_\s]+/, '')   // leading decorators
    .replace(/[-=*#_\s]+$/, '')   // trailing decorators
    .replace(/[:\s]+$/, '')       // trailing colon
    .replace(/\s*\([^)]*\)\s*$/, '') // trailing parens "(serves 4)"
    .toLowerCase()
    .trim();

  return keywords.some(kw => stripped === kw);
}

// ── Metadata line detector ────────────────────────────────────

function isMetadataLine(line: string): boolean {
  return /^(?:prep\s*(?:time)?|cook(?:ing)?\s*(?:time)?|total\s*(?:time)?|active\s*(?:time)?|serves?|yield[s]?|makes?|servings?|portions?)\s*[:]/i.test(line.trim())
    || /^(?:serves?|makes?|yields?)\s+\d/i.test(line.trim());
}

// ── Main parser ───────────────────────────────────────────────

/** Parse raw recipe text into structured fields. */
export function parseRecipeText(text: string): ParsedRecipe {
  const lines = text.split('\n').map(l => l.trimEnd());

  const result: ParsedRecipe = { ingredients: [], instructions: [] };

  type Section = 'preamble' | 'ingredients' | 'instructions' | 'notes';
  let section: Section = 'preamble';
  let titleFound = false;
  const descLines: string[] = [];
  const noteLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section transitions (check before doing anything with the line)
    if (isSectionHeader(trimmed, INGREDIENT_HEADERS))  { section = 'ingredients';  continue; }
    if (isSectionHeader(trimmed, INSTRUCTION_HEADERS)) { section = 'instructions'; continue; }
    if (isSectionHeader(trimmed, NOTES_HEADERS))       { section = 'notes';        continue; }

    switch (section) {

      case 'preamble': {
        // Metadata: Serves / Yield / Makes
        if (/^(?:serves?|yield[s]?|makes?|servings?|portions?)\s*:?\s*(\d+)/i.test(trimmed)) {
          const m = trimmed.match(/(\d+)/);
          if (m) result.servings = parseInt(m[1]);
          break;
        }

        // Prep time
        const prepM = trimmed.match(/^prep\s*(?:time)?\s*:\s*(.+)/i);
        if (prepM) { result.prepTimeMinutes = parseTimeMinutes(prepM[1]); break; }

        // Cook time
        const cookM = trimmed.match(/^cook(?:ing)?\s*(?:time)?\s*:\s*(.+)/i);
        if (cookM) { result.cookTimeMinutes = parseTimeMinutes(cookM[1]); break; }

        // Total time
        const totalM = trimmed.match(/^total\s*(?:time)?\s*:\s*(.+)/i);
        if (totalM) { result.totalTimeMinutes = parseTimeMinutes(totalM[1]); break; }

        // Active time (map to prep if not already set)
        const activeM = trimmed.match(/^active\s*(?:time)?\s*:\s*(.+)/i);
        if (activeM && !result.prepTimeMinutes) { result.prepTimeMinutes = parseTimeMinutes(activeM[1]); break; }

        // Title (first non-metadata line)
        if (!titleFound) {
          // Reject obvious non-title lines
          if (!isMetadataLine(trimmed) && trimmed.length <= 120 && !/^[\-\*•·▪▸◦]\s/.test(trimmed) && !/^\d+[.)]\s/.test(trimmed)) {
            result.name = trimmed;
            titleFound = true;
          }
          break;
        }

        // Description (non-metadata sentence after title)
        if (
          titleFound &&
          !isMetadataLine(trimmed) &&
          trimmed.length >= 15 &&
          trimmed.includes(' ') &&
          !/^[\-\*•·▪▸◦]\s/.test(trimmed) &&
          !/^\d+[.)]\s/.test(trimmed) &&
          descLines.length < 3
        ) {
          descLines.push(trimmed);
        }
        break;
      }

      case 'ingredients': {
        const ing = parseIngredientLine(trimmed);
        if (ing && ing.name.trim()) result.ingredients.push(ing);
        break;
      }

      case 'instructions': {
        // Strip leading step markers: "1.", "1)", "Step 1:", bullet
        const stripped = trimmed
          .replace(/^step\s+\d+\s*[:.)]?\s*/i, '')
          .replace(/^\d+[.)]\s+/, '')
          .replace(/^[\-\*•·▪▸◦‣]\s+/, '')
          .trim();
        if (stripped) result.instructions.push(stripped);
        break;
      }

      case 'notes': {
        noteLines.push(trimmed);
        break;
      }
    }
  }

  // Compile optional text fields
  if (descLines.length > 0) result.description = descLines.join(' ');
  if (noteLines.length > 0) result.notes = noteLines.join(' ');

  // Auto-calculate total time
  if (!result.totalTimeMinutes && result.prepTimeMinutes && result.cookTimeMinutes) {
    result.totalTimeMinutes = result.prepTimeMinutes + result.cookTimeMinutes;
  }

  // ── Fallback: no explicit section headers found ──────────────
  // If both lists are empty, try heuristic detection from all lines.
  if (result.ingredients.length === 0 && result.instructions.length === 0) {
    const QTY_START = /^(?:\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s+/;
    const STEP_START = /^\d+[.)]\s+/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (isMetadataLine(trimmed)) continue;
      if (trimmed === result.name) continue;
      if (result.description && trimmed === result.description) continue;
      if (isSectionHeader(trimmed, [...INGREDIENT_HEADERS, ...INSTRUCTION_HEADERS, ...NOTES_HEADERS])) continue;

      if (STEP_START.test(trimmed)) {
        result.instructions.push(trimmed.replace(STEP_START, '').trim());
      } else if (QTY_START.test(trimmed) && trimmed.includes(' ')) {
        const ing = parseIngredientLine(trimmed);
        if (ing && ing.name.trim()) result.ingredients.push(ing);
      }
    }
  }

  // ── Suggest proteinType from ingredient names ────────────────
  if (result.ingredients.length > 0) {
    const allNames = result.ingredients.map(i => i.name.toLowerCase()).join(' ');
    if (/\bchicken\b/.test(allNames))                              result.proteinType = 'Chicken';
    else if (/\b(beef|steak|ground\s+beef|brisket)\b/.test(allNames)) result.proteinType = 'Beef';
    else if (/\b(pork|bacon|ham|sausage)\b/.test(allNames))        result.proteinType = 'Pork';
    else if (/\b(turkey|ground\s+turkey)\b/.test(allNames))        result.proteinType = 'Turkey';
    else if (/\b(fish|salmon|shrimp|tuna|cod|tilapia|crab|lobster|scallop)\b/.test(allNames)) result.proteinType = 'Seafood';
    else if (/\b(pasta|spaghetti|linguine|penne|fettuccine|rigatoni|noodle|lasagna)\b/.test(allNames)) result.proteinType = 'Pasta';
  }

  // ── Suggest proteinType from recipe name (soup / breakfast) ──
  if (result.name && !result.proteinType) {
    const n = result.name.toLowerCase();
    if (/\bsoup\b|\bstew\b|\bchili\b/.test(n)) result.proteinType = 'Soup';
  }

  // ── Suggest mealType from recipe name ───────────────────────
  if (result.name) {
    const n = result.name.toLowerCase();
    if (/\b(breakfast|pancake|waffle|french\s+toast|oatmeal|muffin|bagel|omelet|frittata)\b/.test(n))
      result.mealType = 'Breakfast';
    else if (/\b(salad|sandwich|wrap|burger|lunch)\b/.test(n))
      result.mealType = 'Lunch';
    else if (/\b(dessert|cake|cookie|brownie|pie|ice\s+cream|pudding|tart|mousse)\b/.test(n))
      result.mealType = 'Dessert';
    else if (/\b(snack|dip|appetizer|chip|cracker|bite)\b/.test(n))
      result.mealType = 'Snack';
    else if (/\b(side|salad|rice|pilaf|slaw|coleslaw)\b/.test(n))
      result.mealType = 'Side Dish';
  }

  return result;
}
