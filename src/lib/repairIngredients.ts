// ============================================================
// repairIngredients — one-time migration that fixes ingredients
// where fractional quantities were embedded in the name field
// instead of being stored in quantity/unit.
//
// Example bad row:
//   ingredient_name: "¼ cup chopped fresh basil"
//   quantity: 1
//   unit: ""
//
// Fixed:
//   ingredient_name: "chopped fresh basil"
//   quantity: 0.25
//   unit: "cup"
//
// Also expands EACH compound entries:
//   "½ tsp EACH: salt, garlic powder, paprika"
//   → three separate rows at ½ tsp each
//
// Gated by localStorage key — runs at most once per device.
// Idempotent: safe to re-run if the key is cleared.
// Does NOT touch user-created recipes unless they happen to
// match the same bad pattern (extremely unlikely).
// ============================================================

import { supabase } from './supabase';

const REPAIR_KEY = 'patty-ingredient-repair-v1';

// ── Fraction values ─────────────────────────────────────────
const UNICODE_FRAC: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};

// ── Unit normalization ───────────────────────────────────────
const UNIT_NORM: Record<string, string> = {
  cups: 'cup', cup: 'cup',
  tablespoons: 'tbsp', tablespoon: 'tbsp', tbsp: 'tbsp',
  teaspoons: 'tsp', teaspoon: 'tsp', tsp: 'tsp',
  lbs: 'lb', lb: 'lb', 'lbs.': 'lb',
  ounces: 'oz', ounce: 'oz', oz: 'oz',
  'c.': 'cup', c: 'cup',
};
const UNIT_KEYS = Object.keys(UNIT_NORM).sort((a, b) => b.length - a.length);

// ── Pattern to fix incorrect grocerySection for spices ───────
const SPICE_SECTION_RE = /\b(pepper|cayenne|thyme|rosemary|paprika|cumin|oregano|salt\b|powder)\b/i;

// ── Embedded-prefix parser (mirrors the Node.js seed-fix script) ─
interface ParsedPrefix {
  qty: number;
  unit: string;
  cleanName: string;
}

function parseEmbeddedPrefix(name: string): ParsedPrefix | null {
  let s = name.trim();
  let qty: number | null = null;

  if (UNICODE_FRAC[s[0]] !== undefined) {
    qty = UNICODE_FRAC[s[0]];
    s = s.slice(1).trimStart();
  } else {
    const hm = s.match(/^(\d+)-([¼½¾⅓⅔⅛⅜⅝⅞])\s*/);
    if (hm) {
      qty = parseInt(hm[1]) + (UNICODE_FRAC[hm[2]] ?? 0);
      s = s.slice(hm[0].length);
    } else {
      const ha = s.match(/^(\d+)-(\d+)\/(\d+)\s+/);
      if (ha) {
        qty = parseInt(ha[1]) + parseInt(ha[2]) / parseInt(ha[3]);
        s = s.slice(ha[0].length);
      } else {
        const sf = s.match(/^(\d+)\/(\d+)\s+/);
        if (sf) {
          qty = parseInt(sf[1]) / parseInt(sf[2]);
          s = s.slice(sf[0].length);
        }
      }
    }
  }

  if (qty === null) return null;

  // Greedy unit match
  let unit = '';
  const sLower = s.toLowerCase();
  for (const key of UNIT_KEYS) {
    if (
      sLower.startsWith(key.toLowerCase()) &&
      (s.length === key.length || /[\s,.]/.test(s[key.length]))
    ) {
      unit = UNIT_NORM[key] ?? key;
      s = s.slice(key.length).trimStart();
      if (s.startsWith('.')) s = s.slice(1).trimStart();
      break;
    }
  }

  const cleanName = s.trim();
  if (!cleanName) return null;
  return { qty, unit, cleanName };
}

// ── Row type returned by Supabase ────────────────────────────
interface IngRow {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  grocery_section: string;
  sort_order: number;
}

// ============================================================
// repairEmbeddedIngredients
//   Call once after login (gated by localStorage key).
//   Scans all recipe_ingredients for the user, fixes bad rows.
// ============================================================
export async function repairEmbeddedIngredients(userId: string): Promise<void> {
  if (localStorage.getItem(REPAIR_KEY)) return;

  const { data: rows, error } = await supabase
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_name, quantity, unit, grocery_section, sort_order')
    .eq('user_id', userId);

  if (error || !rows) {
    console.warn('[repair] Could not fetch ingredients:', error?.message);
    localStorage.setItem(REPAIR_KEY, 'error');
    return;
  }

  // Track max sort_order per recipe for EACH expansions
  const recipeMaxOrder = new Map<string, number>();
  for (const row of rows as IngRow[]) {
    const cur = recipeMaxOrder.get(row.recipe_id) ?? 0;
    if (row.sort_order > cur) recipeMaxOrder.set(row.recipe_id, row.sort_order);
  }

  type SimpleUpdate = {
    id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    grocery_section: string;
  };
  type EachExpansion = {
    row: IngRow;
    items: string[];
    qty: number;
    unit: string;
  };

  const updates: SimpleUpdate[] = [];
  const eachExpansions: EachExpansion[] = [];

  for (const row of rows as IngRow[]) {
    const name = row.ingredient_name;
    const unit = row.unit ?? '';

    // EACH compound pattern: "½ tsp EACH: salt, garlic powder, ..."
    const eachMatch = name.match(
      /^([¼½¾⅓⅔⅛⅜⅝⅞])\s*(tsp|tsp\.|teaspoon|teaspoons|tbsp|tablespoon|tablespoons)\s+EACH:\s*(.+)$/i
    );
    if (eachMatch) {
      const qty = UNICODE_FRAC[eachMatch[1]];
      const eachUnit = UNIT_NORM[eachMatch[2].toLowerCase()] ?? eachMatch[2].toLowerCase();
      const items = eachMatch[3].split(',').map((n: string) => n.trim()).filter(Boolean);
      eachExpansions.push({ row: row as IngRow, items, qty, unit: eachUnit });
      continue;
    }

    // Check for embedded fraction prefix in name
    const hasEmbed =
      /^[¼½¾⅓⅔⅛⅜⅝⅞]/.test(name) ||
      /^\d+-[¼½¾⅓⅔⅛⅜⅝⅞]/.test(name) ||
      /^\d+-\d+\/\d+\s/.test(name) ||
      /^\d+\/\d+\s/.test(name);
    if (!hasEmbed) continue;

    const parsed = parseEmbeddedPrefix(name);
    if (!parsed || parsed.cleanName === name) continue;

    const newQty = unit === '' ? parsed.qty : row.quantity;
    const newUnit = UNIT_NORM[unit] ?? (unit === '' ? parsed.unit : unit);

    let section = row.grocery_section;
    if (section === 'Produce' && SPICE_SECTION_RE.test(parsed.cleanName)) {
      section = 'Spices & Seasonings';
    }

    updates.push({ id: row.id, ingredient_name: parsed.cleanName, quantity: newQty, unit: newUnit, grocery_section: section });
  }

  if (updates.length === 0 && eachExpansions.length === 0) {
    localStorage.setItem(REPAIR_KEY, 'nothing-to-fix');
    return;
  }

  console.log(
    `[repair] Fixing ${updates.length} ingredient(s), expanding ${eachExpansions.length} EACH entry/entries...`
  );

  // Apply simple field updates in parallel
  if (updates.length > 0) {
    await Promise.all(
      updates.map((u) =>
        supabase
          .from('recipe_ingredients')
          .update({
            ingredient_name: u.ingredient_name,
            quantity: u.quantity,
            unit: u.unit,
            grocery_section: u.grocery_section,
          })
          .eq('id', u.id)
          .eq('user_id', userId)
      )
    );
  }

  // Handle EACH expansions: delete the compound row, insert N individual rows
  for (const { row, items, qty, unit: eachUnit } of eachExpansions) {
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', row.id)
      .eq('user_id', userId);

    let maxOrder = recipeMaxOrder.get(row.recipe_id) ?? 0;
    const newRows = items.map((itemName, idx) => ({
      recipe_id: row.recipe_id,
      user_id: userId,
      ingredient_name: itemName,
      quantity: qty,
      unit: eachUnit,
      grocery_section: 'Spices & Seasonings',
      prep_note: null,
      merge_key: null,
      sort_order: maxOrder + 1 + idx,
    }));

    const { error: insertErr } = await supabase.from('recipe_ingredients').insert(newRows);
    if (insertErr) {
      console.warn('[repair] EACH expansion insert failed:', insertErr.message);
    } else {
      recipeMaxOrder.set(row.recipe_id, maxOrder + items.length);
    }
  }

  localStorage.setItem(REPAIR_KEY, 'repaired');
  console.log('[repair] Done.');
}
