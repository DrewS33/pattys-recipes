import { useMemo, useState } from 'react';
import { SelectedRecipe, ShoppingListItem } from '../types';
import { mergeIngredients, formatQuantity } from '../utils/ingredientMerger';
import { GROCERY_SECTION_ORDER, GROCERY_SECTION_ICONS } from '../utils/grocerySections';
import SmartExportModal from './SmartExportModal';

// ============================================================
// ShoppingList: grouped, checkable shopping list page
// ============================================================

interface ShoppingListProps {
  selectedRecipes: SelectedRecipe[];
  checkedItems: Set<string>;
  onToggleCheck: (itemKey: string) => void;
  onClearList: () => void;
  onClearChecked: () => void;
}

// Build a stable key for a shopping list item
function itemKey(item: ShoppingListItem): string {
  return `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
}

export default function ShoppingList({
  selectedRecipes,
  checkedItems,
  onToggleCheck,
  onClearList,
  onClearChecked,
}: ShoppingListProps) {
  const [showSmartExport, setShowSmartExport] = useState(false);

  // Merge all ingredients from selected recipes
  const allItems = useMemo(() => mergeIngredients(selectedRecipes), [selectedRecipes]);

  // Group items by grocery section, in store layout order
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    for (const item of allItems) {
      if (!groups[item.grocerySection]) {
        groups[item.grocerySection] = [];
      }
      groups[item.grocerySection].push(item);
    }
    return groups;
  }, [allItems]);

  const totalItems = allItems.length;
  const checkedCount = allItems.filter((item) => checkedItems.has(itemKey(item))).length;
  const remainingCount = totalItems - checkedCount;

  // Copy the shopping list as plain text for clipboard
  const handleCopyText = () => {
    const lines: string[] = ['Shopping List\n'];
    for (const section of GROCERY_SECTION_ORDER) {
      const items = groupedItems[section];
      if (!items || items.length === 0) continue;
      lines.push(`\n${section}`);
      for (const item of items) {
        const qty = `${formatQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ''}`;
        lines.push(`  [ ] ${qty} ${item.name}`);
      }
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      alert('Shopping list copied to clipboard!');
    });
  };

  // Empty state
  if (selectedRecipes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="text-8xl mb-6">🛒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-3">Your shopping list is empty</h2>
        <p className="text-gray-400 text-lg">
          Go to the Recipes tab and click "Add to List" on some recipes to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-2xl font-bold text-stone-800">🛒 Shopping List</h2>
          <span className="text-base font-semibold text-primary-600">
            {remainingCount} item{remainingCount !== 1 ? 's' : ''} remaining
          </span>
        </div>

        {/* Source recipes */}
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 mb-4">
          <p className="text-sm font-semibold text-stone-700 mb-1">
            Recipes included ({selectedRecipes.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedRecipes.map(({ recipe, servingMultiplier }) => (
              <span
                key={recipe.id}
                className="text-xs bg-white text-stone-700 border border-amber-200 rounded-full px-3 py-1 font-medium"
              >
                {recipe.name} ({Math.round(recipe.defaultServings * servingMultiplier * 10) / 10} srv)
              </span>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        {totalItems > 0 && (
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(checkedCount / totalItems) * 100}%` }}
            />
          </div>
        )}
        {totalItems > 0 && (
          <p className="text-xs text-gray-400 mt-1 text-right">
            {checkedCount} of {totalItems} checked
          </p>
        )}
      </div>

      {/* Action buttons — hidden when printing */}
      <div className="flex flex-wrap gap-2 mb-6 no-print">
        <button
          onClick={() => window.print()}
          className="py-2 px-4 bg-gray-100 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          🖨️ Print
        </button>
        <button
          onClick={handleCopyText}
          className="py-2 px-4 bg-gray-100 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          📋 Copy as Text
        </button>
        <button
          onClick={() => setShowSmartExport(true)}
          className="py-2 px-4 bg-primary-50 text-primary-700 font-semibold rounded-lg text-sm
                     hover:bg-primary-100 transition-colors border border-primary-200
                     flex items-center gap-1"
        >
          🛍️ Export Grocery-Friendly List
        </button>
        {checkedCount > 0 && (
          <button
            onClick={onClearChecked}
            className="py-2 px-4 bg-yellow-50 text-yellow-700 font-semibold rounded-lg text-sm hover:bg-yellow-100 transition-colors border border-yellow-200 flex items-center gap-1"
          >
            ✓ Clear Checked ({checkedCount})
          </button>
        )}
        <button
          onClick={onClearList}
          className="py-2 px-4 bg-red-50 text-red-600 font-semibold rounded-lg text-sm hover:bg-red-100 transition-colors border border-red-200 flex items-center gap-1 ml-auto"
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Grocery sections — unchecked items only */}
      <div className="space-y-6">
        {GROCERY_SECTION_ORDER.map((section) => {
          const items = (groupedItems[section] ?? []).filter((item) => !checkedItems.has(itemKey(item)));
          if (items.length === 0) return null;

          return (
            <div key={section}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{GROCERY_SECTION_ICONS[section]}</span>
                <h3 className="font-display text-base font-bold text-primary-800">{section}</h3>
                <div className="flex-1 flex items-center mx-1">
                  <div className="flex-1 border-b border-primary-200" />
                  <span className="text-primary-300 text-xs px-1.5 select-none">✦</span>
                  <div className="flex-1 border-b border-primary-200" />
                </div>
                <span className="text-xs text-stone-400 italic">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>

              <ul className="space-y-2">
                {items.map((item) => {
                  const key = itemKey(item);
                  return (
                    <li
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-xl border bg-white border-gray-200 hover:border-primary-200 hover:bg-primary-50 transition-all cursor-pointer"
                      onClick={() => onToggleCheck(key)}
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mt-0.5 transition-all" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-gray-800">
                            {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
                          </span>
                          <span className="text-base text-gray-700">{item.name}</span>
                        </div>
                        {item.sources.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.sources.join(', ')}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Done section — checked items */}
      {checkedCount > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✅</span>
            <h3 className="font-display text-base font-bold text-stone-400">Done</h3>
            <div className="flex-1 border-b border-stone-200" />
            <span className="text-xs text-stone-400 italic">{checkedCount} item{checkedCount !== 1 ? 's' : ''}</span>
          </div>
          <ul className="space-y-2">
            {allItems.filter((item) => checkedItems.has(itemKey(item))).map((item) => {
              const key = itemKey(item);
              return (
                <li
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-xl border bg-stone-50 border-stone-100 opacity-50 cursor-pointer hover:opacity-70 transition-all"
                  onClick={() => onToggleCheck(key)}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-400 border-2 border-primary-400 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-white">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold line-through text-stone-400">
                        {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
                      </span>
                      <span className="text-base line-through text-stone-400">{item.name}</span>
                    </div>
                    {item.sources.length > 0 && (
                      <p className="text-xs text-stone-300 mt-0.5">{item.sources.join(', ')}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* All done message */}
      {totalItems > 0 && checkedCount === totalItems && (
        <div className="mt-8 text-center p-6 bg-green-50 rounded-2xl border border-green-200">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-xl font-bold text-green-700">All done!</h3>
          <p className="text-green-600 mt-1">Every item has been checked off. Happy cooking!</p>
        </div>
      )}
    </div>

    {/* Smart Grocery Export modal */}
    {showSmartExport && (
      <SmartExportModal
        items={allItems}
        onClose={() => setShowSmartExport(false)}
      />
    )}
  );
}
