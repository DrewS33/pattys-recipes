import { PantryItem } from '../types';

// ============================================================
// DEFAULT_PANTRY_ITEMS
// Pre-loaded list of common household staples.
// Users can toggle each one on/off and add custom items.
// ============================================================

export const DEFAULT_PANTRY_ITEMS: PantryItem[] = [
  // ── Baking ──────────────────────────────────────────────
  { id: 'flour',           name: 'flour',           category: 'Baking',      inPantry: false },
  { id: 'sugar',           name: 'sugar',           category: 'Baking',      inPantry: false },
  { id: 'brown-sugar',     name: 'brown sugar',     category: 'Baking',      inPantry: false },
  { id: 'powdered-sugar',  name: 'powdered sugar',  category: 'Baking',      inPantry: false },
  { id: 'baking-powder',   name: 'baking powder',   category: 'Baking',      inPantry: false },
  { id: 'baking-soda',     name: 'baking soda',     category: 'Baking',      inPantry: false },
  { id: 'vanilla-extract', name: 'vanilla extract', category: 'Baking',      inPantry: false },
  { id: 'cocoa-powder',    name: 'cocoa powder',    category: 'Baking',      inPantry: false },
  { id: 'cornstarch',      name: 'cornstarch',      category: 'Baking',      inPantry: false },

  // ── Oils & Fats ─────────────────────────────────────────
  { id: 'olive-oil',       name: 'olive oil',       category: 'Oils & Fats', inPantry: false },
  { id: 'vegetable-oil',   name: 'vegetable oil',   category: 'Oils & Fats', inPantry: false },
  { id: 'canola-oil',      name: 'canola oil',      category: 'Oils & Fats', inPantry: false },
  { id: 'butter',          name: 'butter',          category: 'Oils & Fats', inPantry: false },
  { id: 'cooking-spray',   name: 'cooking spray',   category: 'Oils & Fats', inPantry: false },

  // ── Spices ──────────────────────────────────────────────
  { id: 'salt',            name: 'salt',            category: 'Spices',      inPantry: false },
  { id: 'pepper',          name: 'pepper',          category: 'Spices',      inPantry: false },
  { id: 'garlic-powder',   name: 'garlic powder',   category: 'Spices',      inPantry: false },
  { id: 'onion-powder',    name: 'onion powder',    category: 'Spices',      inPantry: false },
  { id: 'paprika',         name: 'paprika',         category: 'Spices',      inPantry: false },
  { id: 'cinnamon',        name: 'cinnamon',        category: 'Spices',      inPantry: false },
  { id: 'cumin',           name: 'cumin',           category: 'Spices',      inPantry: false },
  { id: 'chili-powder',    name: 'chili powder',    category: 'Spices',      inPantry: false },
  { id: 'italian-seasoning', name: 'italian seasoning', category: 'Spices', inPantry: false },
  { id: 'oregano',         name: 'oregano',         category: 'Spices',      inPantry: false },
  { id: 'thyme',           name: 'thyme',           category: 'Spices',      inPantry: false },
  { id: 'bay-leaves',      name: 'bay leaves',      category: 'Spices',      inPantry: false },
  { id: 'red-pepper-flakes', name: 'red pepper flakes', category: 'Spices', inPantry: false },

  // ── Dairy Basics ────────────────────────────────────────
  { id: 'eggs',            name: 'eggs',            category: 'Dairy Basics', inPantry: false },
  { id: 'milk',            name: 'milk',            category: 'Dairy Basics', inPantry: false },

  // ── Dry Goods ───────────────────────────────────────────
  { id: 'water',           name: 'water',           category: 'Dry Goods',   inPantry: false },
  { id: 'rice',            name: 'rice',            category: 'Dry Goods',   inPantry: false },
  { id: 'pasta',           name: 'pasta',           category: 'Dry Goods',   inPantry: false },
  { id: 'chicken-broth',   name: 'chicken broth',   category: 'Dry Goods',   inPantry: false },
  { id: 'beef-broth',      name: 'beef broth',      category: 'Dry Goods',   inPantry: false },
  { id: 'soy-sauce',       name: 'soy sauce',       category: 'Dry Goods',   inPantry: false },
  { id: 'worcestershire-sauce', name: 'worcestershire sauce', category: 'Dry Goods', inPantry: false },
  { id: 'hot-sauce',       name: 'hot sauce',       category: 'Dry Goods',   inPantry: false },
  { id: 'white-vinegar',   name: 'white vinegar',   category: 'Dry Goods',   inPantry: false },
  { id: 'apple-cider-vinegar', name: 'apple cider vinegar', category: 'Dry Goods', inPantry: false },
  { id: 'honey',           name: 'honey',           category: 'Dry Goods',   inPantry: false },
];
