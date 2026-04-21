import { useMemo, useState, useRef, useEffect } from 'react';
import { SelectedRecipe, ShoppingListItem, PantryItem, StorePreferences, ShoppingGroupingMode } from '../types';
import { mergeIngredients, formatQuantity } from '../utils/ingredientMerger';
import { GROCERY_SECTION_ORDER, GROCERY_SECTION_ICONS } from '../utils/grocerySections';
import { isPantryStaple } from '../utils/pantryUtils';
import {
  groupIngredientsByStore,
  getStoreForIngredient,
  normalizeIngredientForStoreMatch,
} from '../utils/storeUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';
import SmartExportModal from './SmartExportModal';

// ============================================================
// ShoppingList: grouped, checkable shopping list page
// Supports two grouping modes: By Section and By Store
// ============================================================

interface ShoppingListProps {
  selectedRecipes: SelectedRecipe[];
  plannerRecipeCount?: number;
  checkedItems: Set<string>;
  onToggleCheck: (itemKey: string) => void;
  onClearList: () => void;
  onClearChecked: () => void;
  pantryItems: PantryItem[];
  storePreferences: StorePreferences;
  onOpenStoreSettings: () => void;
  onSetIngredientStore: (normalizedName: string, storeId: string) => void;
}

// Build a stable key for a shopping list item
function itemKey(item: ShoppingListItem): string {
  return `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
}

export default function ShoppingList({
  selectedRecipes,
  plannerRecipeCount = 0,
  checkedItems,
  onToggleCheck,
  onClearList,
  onClearChecked,
  pantryItems,
  storePreferences,
  onOpenStoreSettings,
  onSetIngredientStore,
}: ShoppingListProps) {
  const [showSmartExport, setShowSmartExport] = useState(false);
  const [showPantryHidden, setShowPantryHidden] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [groceryMode, setGroceryMode] = useLocalStorage<boolean>('groceryMode', false);
  const [groupingMode, setGroupingMode] = useLocalStorage<ShoppingGroupingMode>(
    'shoppingGroupingMode',
    'section'
  );

  const moreMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  // Merge all ingredients from selected recipes
  const mergedItems = useMemo(() => mergeIngredients(selectedRecipes), [selectedRecipes]);

  // Split into pantry-excluded vs items to buy, then inject recurring items
  const { allItems, pantryHiddenItems, recurringItemKeys } = useMemo(() => {
    const hidden: ShoppingListItem[] = [];
    const needed: ShoppingListItem[] = [];
    for (const item of mergedItems) {
      if (isPantryStaple(item.name, pantryItems)) {
        hidden.push(item);
      } else {
        needed.push(item);
      }
    }

    // Add recurring items not already present in the list
    const existingNames = new Set(needed.map((i) => i.name.toLowerCase()));
    const recurringKeys = new Set<string>();
    for (const p of pantryItems) {
      if (!p.isRecurring) continue;
      if (existingNames.has(p.name.toLowerCase())) continue;
      const item: ShoppingListItem = {
        name: p.name,
        quantity: 1,
        unit: '',
        grocerySection: 'Miscellaneous',
        checked: false,
        sources: [],
      };
      needed.push(item);
      recurringKeys.add(`${p.name.toLowerCase()}|`);
    }

    return { allItems: needed, pantryHiddenItems: hidden, recurringItemKeys: recurringKeys };
  }, [mergedItems, pantryItems]);

  // Group items by grocery section (for "By Section" mode)
  const sectionGroups = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    for (const item of allItems) {
      if (!groups[item.grocerySection]) groups[item.grocerySection] = [];
      groups[item.grocerySection].push(item);
    }
    return groups;
  }, [allItems]);

  // Group items by store (for "By Store" mode)
  const storeGroups = useMemo(
    () => groupIngredientsByStore(allItems, storePreferences),
    [allItems, storePreferences]
  );

  const totalItems = allItems.length;
  const checkedCount = allItems.filter((item) => checkedItems.has(itemKey(item))).length;
  const remainingCount = totalItems - checkedCount;

  // Copy the shopping list as plain text (always uses section order)
  const handleCopyText = () => {
    const lines: string[] = ['Shopping List\n'];
    for (const section of GROCERY_SECTION_ORDER) {
      const items = sectionGroups[section];
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

  // Whether to show the per-item store selector
  const showStoreSelector = storePreferences.stores.length > 0 && !groceryMode;

  // Shared item row renderer (used in both section and store views)
  const renderItemRow = (item: ShoppingListItem) => {
    const key = itemKey(item);
    const effectiveStore = getStoreForIngredient(item, storePreferences);
    const normalizedName = normalizeIngredientForStoreMatch(item.name);
    const hasOverride = !!(storePreferences.ingredientOverrides ?? {})[normalizedName];

    return (
      <li
        key={key}
        className={`sl-item-row flex items-center bg-white border border-gray-200 rounded-xl cursor-pointer active:scale-[0.99] transition-all
          ${groceryMode
            ? 'gap-4 p-5 min-h-[76px]'
            : 'gap-3 p-4 min-h-[64px] hover:border-primary-200 hover:bg-primary-50'}`}
        onClick={() => onToggleCheck(key)}
      >
        <div
          className={`sl-item-checkbox flex-shrink-0 border-2 border-gray-300 flex items-center justify-center transition-all
            ${groceryMode ? 'w-10 h-10 rounded-lg' : 'w-8 h-8 rounded-full'}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`sl-item-qty font-bold text-gray-800 ${groceryMode ? 'text-xl' : 'text-base'}`}>
              {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
            </span>
            <span className={`sl-item-name text-gray-700 ${groceryMode ? 'text-xl' : 'text-base'}`}>
              {item.name}
            </span>
          </div>
          {!groceryMode && (
            <p className="no-print text-xs text-gray-400 mt-0.5">
              {recurringItemKeys.has(key) && (
                <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium mr-1">
                  🔄 recurring
                </span>
              )}
              {item.sources.join(', ')}
            </p>
          )}
        </div>

        {/* Per-item store selector — stop propagation so it doesn't toggle the checkbox */}
        {showStoreSelector && (
          <div
            className="no-print flex-shrink-0 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color dot for current effective store */}
            {effectiveStore && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: effectiveStore.color ?? '#9CA3AF' }}
              />
            )}
            <select
              value={effectiveStore?.id ?? ''}
              onChange={(e) => onSetIngredientStore(normalizedName, e.target.value)}
              title={hasOverride ? `Saved: ${effectiveStore?.name ?? 'None'}` : `Category default: ${effectiveStore?.name ?? 'None'}`}
              className={`text-xs rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300 max-w-[110px] transition-colors ${
                hasOverride
                  ? 'border border-primary-300 text-primary-700 font-semibold'
                  : 'border border-stone-200 text-stone-500'
              }`}
            >
              <option value="">— None —</option>
              {storePreferences.stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </li>
    );
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
    <>
    <div className="sl-print-container max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="sl-print-header mb-6">
        {/* Print-only compact summary — hidden on screen */}
        <div className="print-only mb-1">
          <p className="font-bold" style={{ fontSize: '14pt', lineHeight: 1.2 }}>Shopping List</p>
          <p style={{ fontSize: '8.5pt', marginTop: '2pt', color: '#333' }}>
            Recipes: {selectedRecipes.map(({ recipe, servingMultiplier }) =>
              `${recipe.name}${servingMultiplier !== 1 ? ` (×${Math.round(servingMultiplier * 10) / 10})` : ''}`
            ).join(' • ')}
          </p>
          <p style={{ fontSize: '7.5pt', color: '#666', marginTop: '1pt' }}>
            Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="no-print flex items-start justify-between mb-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-800">Shopping List</h2>
            <p className="text-base font-semibold text-primary-600 mt-0.5">
              {remainingCount} item{remainingCount !== 1 ? 's' : ''} remaining
            </p>
          </div>
          {/* Shopping Trip Mode toggle — primary contextual action */}
          <button
            onClick={() => setGroceryMode((v) => !v)}
            title={groceryMode ? 'Finish shopping — return to full view' : 'Start Shopping — simplified in-store view with larger text'}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-full text-sm font-semibold border transition-all mt-0.5 ${
              groceryMode
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            🛒 {groceryMode ? 'Finish Shopping' : 'Start Shopping'}
          </button>
        </div>

        {/* Planner sync banner */}
        {plannerRecipeCount > 0 && (
          <div className="no-print bg-violet-50 rounded-xl p-3 border border-violet-200 mb-3 flex items-center gap-2">
            <span className="text-base">📅</span>
            <p className="text-sm text-violet-800 flex-1">
              <strong>{plannerRecipeCount} recipe{plannerRecipeCount !== 1 ? 's' : ''} from your planner</strong>
              {' '}added automatically.
            </p>
          </div>
        )}

        {/* Source recipes — collapsible, collapsed by default */}
        {!groceryMode && (
          <div className="no-print mb-4">
            <button
              onClick={() => setShowRecipes((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              <span className="font-medium">Recipes included ({selectedRecipes.length})</span>
              <span className="text-xs">{showRecipes ? '▲' : '▾'}</span>
            </button>
            {showRecipes && (
              <div className="mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200">
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
            )}
          </div>
        )}

        {/* Pantry items hidden notice */}
        {pantryHiddenItems.length > 0 && (
          <div className="no-print mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <span className="text-green-600 text-base">🥫</span>
            <p className="text-sm text-green-800 flex-1">
              <strong>{pantryHiddenItems.length} pantry item{pantryHiddenItems.length !== 1 ? 's' : ''} hidden</strong>
              {' '}— you already have {pantryHiddenItems.length !== 1 ? 'these' : 'this'} at home.
            </p>
            <button
              onClick={() => setShowPantryHidden((v) => !v)}
              className="text-xs text-green-700 font-semibold underline underline-offset-2 whitespace-nowrap"
            >
              {showPantryHidden ? 'Hide' : 'Show'}
            </button>
          </div>
        )}

        {/* Collapsed pantry items */}
        {showPantryHidden && pantryHiddenItems.length > 0 && (
          <div className="no-print mb-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-xs font-semibold text-green-700 mb-2">Already in your pantry (not needed):</p>
            <div className="flex flex-wrap gap-2">
              {pantryHiddenItems.map((item) => (
                <span
                  key={itemKey(item)}
                  className="text-xs bg-white text-green-800 border border-green-200 rounded-full px-3 py-1 font-medium"
                >
                  ✓ {item.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar — subtle, supportive */}
        {totalItems > 0 && (
          <div className="no-print bg-stone-100 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-primary-300 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(checkedCount / totalItems) * 100}%` }}
            />
          </div>
        )}
        {totalItems > 0 && (
          <p className="no-print text-xs text-stone-300 mt-1 text-right">
            {checkedCount} of {totalItems} checked
          </p>
        )}
      </div>

      {/* ---- Single control row: View + More + Clear — hidden in Shopping Trip Mode ---- */}
      {!groceryMode && (
        <div className="flex items-center gap-3 mb-6 no-print">
          {/* View dropdown — no label, the options are self-explanatory */}
          <select
            id="sl-view-select"
            value={groupingMode}
            onChange={(e) => {
              if (e.target.value === 'manage') {
                onOpenStoreSettings();
              } else {
                setGroupingMode(e.target.value as ShoppingGroupingMode);
              }
            }}
            className="py-1.5 px-3 bg-white border border-stone-200 rounded-full text-sm font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-primary-300 cursor-pointer"
          >
            <option value="section">By Section</option>
            <option value="store">By Store</option>
            <option value="manage">Manage Stores…</option>
          </select>

          {/* More ▾ dropdown: Print, Copy, Export */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-stone-100 text-stone-600 font-semibold rounded-full text-sm hover:bg-stone-200 transition-colors"
            >
              More <span className="text-xs">▾</span>
            </button>
            {showMoreMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg py-1 z-20 min-w-[220px]">
                <button
                  onClick={() => { window.print(); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => { handleCopyText(); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => { setShowSmartExport(true); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                >
                  🛍️ Export Grocery-Friendly List
                </button>
              </div>
            )}
          </div>

          {/* Clear Checked — only visible when items are checked */}
          {checkedCount > 0 && (
            <button
              onClick={onClearChecked}
              className="py-1.5 px-3 bg-yellow-50 text-yellow-700 font-semibold rounded-full text-sm hover:bg-yellow-100 transition-colors border border-yellow-200 flex items-center gap-1"
            >
              ✓ Clear Checked ({checkedCount})
            </button>
          )}

          {/* Clear All — far right, muted destructive */}
          <button
            onClick={onClearList}
            className="ml-auto py-1.5 px-3 text-stone-400 font-medium rounded-full text-sm border border-stone-200 hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ====================================================
          ITEM LIST — conditional on grouping mode
      ==================================================== */}

      {/* ---- BY SECTION view ---- */}
      {groupingMode === 'section' && (
        <div className="sl-sections-container space-y-6">
          {GROCERY_SECTION_ORDER.map((section) => {
            const items = (sectionGroups[section] ?? []).filter(
              (item) => !checkedItems.has(itemKey(item))
            );
            if (items.length === 0) return null;

            return (
              <div key={section} className="sl-section-group">
                <div className="sl-section-header flex items-center gap-2 mb-3 sticky top-0 z-10 bg-[#fdf8f0]/95 backdrop-blur-sm py-1.5 -mx-1 px-1">
                  <span className={`sl-section-icon ${groceryMode ? 'text-3xl' : 'text-2xl'}`}>
                    {GROCERY_SECTION_ICONS[section]}
                  </span>
                  <h3 className={`font-display font-bold text-stone-700 ${groceryMode ? 'text-lg' : 'text-base'}`}>
                    {section}
                  </h3>
                  <div className="no-print flex-1 border-b border-stone-100 mx-1" />
                  <span className="no-print text-xs text-stone-400 italic">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ul className={`sl-section-list ${groceryMode ? 'space-y-3' : 'space-y-2'}`}>
                  {items.map(renderItemRow)}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- BY STORE view ---- */}
      {groupingMode === 'store' && (
        <div className="sl-sections-container space-y-6">
          {/* Empty state: no stores configured */}
          {storePreferences.stores.length === 0 && (
            <div className="text-center py-12 px-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="text-5xl mb-3">🏪</div>
              <h3 className="font-bold text-stone-700 mb-2">No stores set up yet</h3>
              <p className="text-sm text-stone-400 mb-5 max-w-xs mx-auto">
                Add your stores and assign grocery categories to them. Your list will automatically
                group items by store every time.
              </p>
              <button
                onClick={onOpenStoreSettings}
                className="py-2.5 px-6 bg-primary-600 text-white font-bold rounded-full text-sm hover:bg-primary-700 transition-colors"
              >
                Set Up Stores →
              </button>
            </div>
          )}

          {/* Store groups */}
          {storeGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !checkedItems.has(itemKey(item))
            );
            if (visibleItems.length === 0) return null;

            const storeColor = group.store?.color ?? '#9CA3AF';

            return (
              <div key={group.label} className="sl-section-group">
                {/* Store section header */}
                <div className="sl-section-header flex items-center gap-2 mb-3 sticky top-0 z-10 bg-[#fdf8f0]/95 backdrop-blur-sm py-1.5 -mx-1 px-1">
                  {/* Color dot */}
                  <span
                    className="no-print w-4 h-4 rounded-full flex-shrink-0 border border-white shadow-sm"
                    style={{ backgroundColor: storeColor }}
                  />
                  <h3 className={`font-display font-bold text-stone-700 ${groceryMode ? 'text-lg' : 'text-base'}`}>
                    {group.label}
                  </h3>
                  <div className="no-print flex-1 border-b border-stone-100 mx-1" />
                  <span className="no-print text-xs text-stone-400 italic">
                    {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <ul className={`sl-section-list ${groceryMode ? 'space-y-3' : 'space-y-2'}`}>
                  {visibleItems.map(renderItemRow)}
                </ul>
              </div>
            );
          })}

          {/* If stores exist but all categories are unassigned, nudge the user */}
          {storePreferences.stores.length > 0 &&
            storeGroups.length === 1 &&
            storeGroups[0].store === null && (
              <div className="mt-3 text-center">
                <p className="text-xs text-stone-400 italic">
                  All items are unassigned.{' '}
                  <button
                    onClick={onOpenStoreSettings}
                    className="underline text-primary-500 hover:text-primary-700"
                  >
                    Assign categories to stores →
                  </button>
                </p>
              </div>
            )}
        </div>
      )}

      {/* Done section — checked items (same in both modes) */}
      {checkedCount > 0 && (
        <div className="no-print mt-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✅</span>
            <h3 className="font-display text-base font-bold text-stone-400">Done</h3>
            <div className="flex-1 border-b border-stone-200" />
            <span className="text-xs text-stone-400 italic">
              {checkedCount} item{checkedCount !== 1 ? 's' : ''}
            </span>
          </div>
          <ul className={groceryMode ? 'space-y-3' : 'space-y-2'}>
            {allItems.filter((item) => checkedItems.has(itemKey(item))).map((item) => {
              const key = itemKey(item);
              return (
                <li
                  key={key}
                  className={`flex items-center rounded-xl border bg-stone-50 border-stone-100 opacity-50 cursor-pointer hover:opacity-70 transition-all
                    ${groceryMode ? 'gap-4 p-5 min-h-[76px]' : 'gap-3 p-4 min-h-[64px]'}`}
                  onClick={() => onToggleCheck(key)}
                >
                  <div
                    className={`flex-shrink-0 bg-primary-400 border-2 border-primary-400 flex items-center justify-center
                      ${groceryMode ? 'w-10 h-10 rounded-lg' : 'w-8 h-8 rounded-full'}`}
                  >
                    <span className={`font-bold text-white ${groceryMode ? 'text-base' : 'text-xs'}`}>✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`font-bold line-through text-stone-400 ${groceryMode ? 'text-xl' : 'text-base'}`}>
                        {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
                      </span>
                      <span className={`line-through text-stone-400 ${groceryMode ? 'text-xl' : 'text-base'}`}>
                        {item.name}
                      </span>
                    </div>
                    {!groceryMode && item.sources.length > 0 && (
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
        <div className="no-print mt-8 text-center p-6 bg-green-50 rounded-2xl border border-green-200">
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
    </>
  );
}
