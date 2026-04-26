// ============================================================
// urlImporter: fetches a recipe page and parses schema.org/Recipe JSON-LD
// ============================================================

export interface ImportedRecipe {
  name: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  defaultServings: number;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  instructions: string[];
  notes?: string;
  image?: string;
}

const UNICODE_FRACS: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};

const UNITS = [
  'tablespoons', 'tablespoon', 'tbsp', 'teaspoons', 'teaspoon', 'tsp',
  'cups', 'cup', 'pounds', 'pound', 'lbs', 'lb', 'ounces', 'ounce', 'oz',
  'grams', 'gram', 'kilograms', 'kilogram', 'kg', 'g', 'liters', 'liter',
  'milliliters', 'milliliter', 'ml', 'quarts', 'quart', 'qt', 'pints', 'pint',
  'pt', 'cans', 'can', 'cloves', 'clove', 'slices', 'slice', 'pieces', 'piece',
  'stalks', 'stalk', 'heads', 'head', 'bunches', 'bunch', 'sticks', 'stick',
  'packages', 'package', 'pkg', 'strips', 'strip',
];

function parseDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
}

function parseServings(yield_: unknown): number {
  if (!yield_) return 4;
  if (typeof yield_ === 'number') return yield_;
  const match = String(yield_).match(/\d+/);
  return match ? parseInt(match[0]) : 4;
}

function parseIngredientStr(str: string): { name: string; quantity: number; unit: string } {
  str = str.trim();

  let quantity = 1;
  let rest = str;

  // Unicode fraction alone: "¼ cup basil"
  if (str[0] && UNICODE_FRACS[str[0]] !== undefined) {
    quantity = UNICODE_FRACS[str[0]];
    rest = str.slice(1).trimStart();
  // Whole + hyphenated Unicode: "1-½ cups"
  } else {
    const wuf = str.match(/^(\d+)-([¼½¾⅓⅔⅛⅜⅝⅞])\s*/);
    if (wuf) {
      quantity = parseInt(wuf[1]) + (UNICODE_FRACS[wuf[2]] ?? 0);
      rest = str.slice(wuf[0].length);
    // Whole + hyphenated ASCII fraction: "1-1/2 cups"
    } else {
      const haf = str.match(/^(\d+)-(\d+)\/(\d+)\s+/);
      if (haf) {
        quantity = parseInt(haf[1]) + parseInt(haf[2]) / parseInt(haf[3]);
        rest = str.slice(haf[0].length);
      // Standard ASCII: "1 1/2", "1/2", "2", "1.5"
      } else {
        const numMatch = str.match(/^((\d+\s+)?\d+\/\d+|\d+\.?\d*)\s*/);
        if (numMatch) {
          const numStr = numMatch[1].trim();
          if (numStr.includes('/')) {
            const parts = numStr.split(/\s+/);
            if (parts.length === 2) {
              const [whole, frac] = parts;
              const [n, d] = frac.split('/');
              quantity = parseInt(whole) + parseInt(n) / parseInt(d);
            } else {
              const [n, d] = numStr.split('/');
              quantity = parseInt(n) / parseInt(d);
            }
          } else {
            quantity = parseFloat(numStr);
          }
          rest = str.slice(numMatch[0].length);
        }
      }
    }
  }

  // Match unit
  let unit = '';
  const lowerRest = rest.toLowerCase();
  for (const u of UNITS) {
    if (lowerRest.startsWith(u + ' ') || lowerRest === u || lowerRest.startsWith(u + '.')) {
      unit = u;
      rest = rest.slice(u.length).replace(/^[.,\s]+/, '');
      break;
    }
  }

  return {
    name: rest.trim() || str,
    quantity: isNaN(quantity) ? 1 : quantity,
    unit,
  };
}

function parseInstructions(instructions: unknown): string[] {
  if (!instructions) return [];
  if (typeof instructions === 'string') return [instructions];
  if (Array.isArray(instructions)) {
    return instructions.flatMap((step): string[] => {
      if (typeof step === 'string') return [step];
      if (typeof step === 'object' && step !== null) {
        const s = step as Record<string, unknown>;
        // HowToSection contains nested steps
        if (s['@type'] === 'HowToSection' && Array.isArray(s.itemListElement)) {
          return parseInstructions(s.itemListElement);
        }
        const text = s.text || s.name;
        if (typeof text === 'string') return [text];
      }
      return [];
    }).filter(Boolean);
  }
  return [];
}

function findRecipeSchema(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  const type = obj['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj;
  }
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph'] as unknown[]) {
      const found = findRecipeSchema(item);
      if (found) return found;
    }
  }
  return null;
}

// Try fetching through multiple CORS proxies in order
async function fetchThroughProxy(url: string): Promise<string> {
  const proxies: Array<() => Promise<string>> = [
    async () => {
      const r = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (!r.ok) throw new Error('allorigins failed');
      const d = await r.json() as { contents?: string };
      if (!d.contents) throw new Error('allorigins: empty response');
      return d.contents;
    },
    async () => {
      const r = await fetch(
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (!r.ok) throw new Error('corsproxy failed');
      return r.text();
    },
  ];

  let lastError = 'All proxies failed';
  for (const attempt of proxies) {
    try {
      return await attempt();
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(
    `Could not load the page. The site may be blocking automated requests (common on large recipe sites). Try a different recipe site, or add the recipe manually.\n\nDetails: ${lastError}`
  );
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  let html: string;
  try {
    html = await fetchThroughProxy(url);
  } catch (e) {
    throw e;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  let schema: Record<string, unknown> | null = null;
  for (const script of scripts) {
    try {
      const json: unknown = JSON.parse(script.textContent || '');
      const normalized = Array.isArray(json) ? { '@graph': json } : json;
      const found = findRecipeSchema(normalized);
      if (found) { schema = found; break; }
    } catch {
      // skip malformed JSON-LD blocks
    }
  }

  if (!schema) {
    throw new Error('No recipe found on this page. Try a site like AllRecipes, Food Network, or NYT Cooking.');
  }

  const prep = parseDuration(schema.prepTime as string || '');
  const cook = parseDuration(schema.cookTime as string || '');
  const total = parseDuration(schema.totalTime as string || '') || (prep + cook) || 30;

  const rawIngredients = (schema.recipeIngredient as string[] | undefined) || [];
  const ingredients = rawIngredients.map(parseIngredientStr);
  const instructions = parseInstructions(schema.recipeInstructions);

  // Extract image URL
  let image: string | undefined;
  const imgField = schema.image;
  if (typeof imgField === 'string') image = imgField;
  else if (Array.isArray(imgField) && imgField.length > 0) image = String(imgField[0]);
  else if (imgField && typeof imgField === 'object') {
    const imgObj = imgField as Record<string, unknown>;
    if (typeof imgObj.url === 'string') image = imgObj.url;
  }

  return {
    name: String(schema.name || ''),
    description: String(schema.description || ''),
    prepTimeMinutes: prep,
    cookTimeMinutes: cook,
    totalTimeMinutes: total,
    defaultServings: parseServings(schema.recipeYield),
    ingredients,
    instructions,
    notes: schema.recipeCategory ? `Category: ${schema.recipeCategory}` : undefined,
    image,
  };
}
