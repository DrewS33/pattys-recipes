import { useState, useMemo } from 'react';
import { PantryItem, PantryCategory } from '../types';
import { DEFAULT_PANTRY_ITEMS } from '../data/pantryData';

// ============================================================
// Pantry: lets the user mark which staples they already have.
// Ingredients toggled ON are excluded from the shopping list.
// ============================================================

const CATEGORY_ICONS: Record<PantryCategory | string, string> = {
  'Baking':       '🧁',
  'Oils & Fats':  '🫒',
  'Spices':       '🌶️',
  'Dairy Basics': '🥛',
  'Dry Goods':    '🌾',
  'Other':        '📦',
};

const CATEGORY_ORDER: PantryCategory[] = [
  'Spices',
  'Oils & Fats',
  'Baking',
  'Dairy Basics',
  'Dry Goods',
  'Other',
];

interface PantryProps {
  pantryItems: PantryItem[];
  onUpdatePantry: (items: PantryItem[]) => void;
}

export default function Pantry({ pantryItems, onUpdatePantry }: PantryProps) {
  const [search, setSearch] = useState('');
  const [newItemName, setNewItemName] = useState('');

  // ── Counts ─────────────────────────────────────────────────
  const activeCount = pantryItems.filter((i) => i.inPantry).length;
  const recurringCount = pantryItems.filter((i) => i.isRecurring).length;

  // ── Toggle a single item ───────────────────────────────────
  const handleToggle = (id: string) => {
    onUpdatePantry(
      pantryItems.map((item) =>
        item.id === id ? { ...item, inPantry: !item.inPantry } : item
      )
    );
  };

  // ── Toggle always-include recurring ───────────────────────
  const handleToggleRecurring = (id: string) => {
    onUpdatePantry(
      pantryItems.map((item) =>
        item.id === id ? { ...item, isRecurring: !item.isRecurring } : item
      )
    );
  };

  // ── Add a custom item ──────────────────────────────────────
  const handleAddCustom = () => {
    const name = newItemName.trim().toLowerCase();
    if (!name) return;

    // Don't add duplicates
    const alreadyExists = pantryItems.some(
      (i) => i.name.toLowerCase() === name
    );
    if (alreadyExists) {
      alert(`"${name}" is already in your pantry list.`);
      return;
    }

    const newItem: PantryItem = {
      id: `custom-${Date.now()}`,
      name,
      category: 'Other',
      inPantry: true,
      isCustom: true,
    };

    onUpdatePantry([...pantryItems, newItem]);
    setNewItemName('');
  };

  // ── Remove a custom item ───────────────────────────────────
  const handleRemoveCustom = (id: string) => {
    onUpdatePantry(pantryItems.filter((i) => i.id !== id));
  };

  // ── Reset to defaults ──────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Reset pantry to defaults? Your custom items and toggles will be cleared.')) return;
    onUpdatePantry(DEFAULT_PANTRY_ITEMS);
  };

  // ── Mark all / unmark all ──────────────────────────────────
  const handleMarkAll = () => {
    onUpdatePantry(pantryItems.map((i) => ({ ...i, inPantry: true })));
  };

  const handleUnmarkAll = () => {
    onUpdatePantry(pantryItems.map((i) => ({ ...i, inPantry: false })));
  };

  // ── Filtered + grouped items ───────────────────────────────
  const filteredItems = useMemo(() => {
    if (!search.trim()) return pantryItems;
    const q = search.toLowerCase();
    return pantryItems.filter((i) => i.name.includes(q));
  }, [pantryItems, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, PantryItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  const categoryOrder = search.trim()
    ? (Object.keys(grouped) as PantryCategory[])
    : CATEGORY_ORDER.filter((c) => grouped[c]?.length > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-stone-800 mb-1">
          🥫 Pantry Staples
        </h2>
        <p className="text-stone-500 text-sm leading-relaxed">
          Toggle on the items you already have at home. Anything turned on will
          be automatically left off your shopping list.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {activeCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold">
              <span>✅</span>
              {activeCount} item{activeCount !== 1 ? 's' : ''} in pantry
            </div>
          )}
          {recurringCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-1.5 text-sm font-semibold">
              <span>🔄</span>
              {recurringCount} always included
            </div>
          )}
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────── */}
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-lg pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          placeholder="Search pantry items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 text-base placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Add custom item ─────────────────────────────────── */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          placeholder="Add a custom pantry item…"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 text-base placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-all"
        />
        <button
          onClick={handleAddCustom}
          disabled={!newItemName.trim()}
          className="px-5 py-3 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          + Add
        </button>
      </div>

      {/* ── Bulk actions ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={handleMarkAll}
          className="py-2 px-4 bg-green-50 text-green-700 font-semibold rounded-lg text-sm border border-green-200 hover:bg-green-100 transition-colors"
        >
          ✅ Mark All
        </button>
        <button
          onClick={handleUnmarkAll}
          className="py-2 px-4 bg-stone-100 text-stone-600 font-semibold rounded-lg text-sm border border-stone-200 hover:bg-stone-200 transition-colors"
        >
          ☐ Unmark All
        </button>
        <button
          onClick={handleReset}
          className="py-2 px-4 bg-amber-50 text-amber-700 font-semibold rounded-lg text-sm border border-amber-200 hover:bg-amber-100 transition-colors ml-auto"
        >
          ↺ Reset Defaults
        </button>
      </div>

      {/* ── Item groups ─────────────────────────────────────── */}
      {categoryOrder.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-base">No pantry items match your search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map((category) => {
            const items = grouped[category];
            if (!items || items.length === 0) return null;

            return (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3 sticky top-0 z-10 bg-[#fdf8f0]/95 backdrop-blur-sm py-1.5 -mx-1 px-1">
                  <span className="text-xl">{CATEGORY_ICONS[category] ?? '📦'}</span>
                  <h3 className="font-display text-base font-bold text-primary-800">{category}</h3>
                  <div className="flex-1 border-b border-primary-200 ml-1" />
                  <span className="text-xs text-stone-400 italic">
                    {items.filter((i) => i.inPantry).length}/{items.length} on hand
                  </span>
                </div>

                {/* Items list */}
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`
                        flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all cursor-pointer
                        min-h-[60px] active:scale-[0.99]
                        ${item.inPantry
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'bg-white border-stone-200 hover:border-primary-200 hover:bg-primary-50'
                        }
                      `}
                      onClick={() => handleToggle(item.id)}
                    >
                      {/* Toggle switch */}
                      <div
                        className={`
                          relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200
                          ${item.inPantry ? 'bg-green-500' : 'bg-stone-300'}
                        `}
                      >
                        <span
                          className={`
                            absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200
                            ${item.inPantry ? 'left-6' : 'left-1'}
                          `}
                        />
                      </div>

                      {/* Item name */}
                      <span
                        className={`
                          flex-1 text-base font-medium capitalize transition-colors
                          ${item.inPantry ? 'text-green-800' : 'text-stone-700'}
                        `}
                      >
                        {item.name}
                      </span>

                      {/* Status label */}
                      <span
                        className={`
                          text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0
                          ${item.inPantry
                            ? 'bg-green-200 text-green-800'
                            : 'bg-stone-100 text-stone-400'
                          }
                        `}
                      >
                        {item.inPantry ? 'Have it' : 'Need it'}
                      </span>

                      {/* Always-include toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRecurring(item.id);
                        }}
                        title={item.isRecurring ? 'Always include — click to remove' : 'Add to every shopping list'}
                        className={`flex-shrink-0 text-sm px-2 py-1 rounded-full border transition-all ${
                          item.isRecurring
                            ? 'bg-amber-100 border-amber-300 text-amber-700 font-semibold'
                            : 'bg-transparent border-stone-200 text-stone-300 hover:border-amber-300 hover:text-amber-500'
                        }`}
                      >
                        🔄
                      </button>

                      {/* Remove button for custom items */}
                      {item.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustom(item.id);
                          }}
                          className="flex-shrink-0 text-stone-300 hover:text-red-400 transition-colors text-xl leading-none ml-1"
                          title="Remove custom item"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom tip ──────────────────────────────────────── */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed">
        <strong>Tip:</strong> Toggle on items you always have at home to skip them on your shopping list.
        Tap 🔄 on any item to mark it as "always include" — things like milk, eggs, or bread will
        appear on every shopping list automatically, even when no recipe calls for them.
      </div>
    </div>
  );
}
