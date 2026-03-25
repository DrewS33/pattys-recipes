import { GrocerySection } from '../types';

// The order that sections appear in the shopping list
// (matches typical grocery store layout)
export const GROCERY_SECTION_ORDER: GrocerySection[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Canned Goods',
  'Pantry',
  'Frozen',
  'Spices & Seasonings',
  'Beverages',
  'Miscellaneous',
];

// Emoji icons for each section to make it visually friendly
export const GROCERY_SECTION_ICONS: Record<GrocerySection, string> = {
  'Produce': '🥦',
  'Meat & Seafood': '🥩',
  'Dairy & Eggs': '🥛',
  'Bakery': '🍞',
  'Pantry': '🫙',
  'Canned Goods': '🥫',
  'Frozen': '❄️',
  'Spices & Seasonings': '🧂',
  'Beverages': '🥤',
  'Miscellaneous': '🛒',
};
