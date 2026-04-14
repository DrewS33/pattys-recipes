import { useState } from 'react';
import { GrocerySection, StoreConfig, StorePreferences } from '../types';
import { GROCERY_SECTION_ORDER, GROCERY_SECTION_ICONS } from '../utils/grocerySections';
import { PRESET_STORE_COLORS } from '../utils/storeUtils';

// ============================================================
// StorePreferencesModal
// Lets the user manage stores and assign default stores to each
// grocery category. Changes are saved immediately via onChange.
// ============================================================

interface Props {
  prefs: StorePreferences;
  onChange: (prefs: StorePreferences) => void;
  onClose: () => void;
}

export default function StorePreferencesModal({ prefs, onChange, onClose }: Props) {
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreColor, setNewStoreColor] = useState(PRESET_STORE_COLORS[5]); // default blue

  // ---- Add a new store ----
  const handleAddStore = () => {
    const name = newStoreName.trim();
    if (!name) return;
    const store: StoreConfig = {
      id: `store-${Date.now()}`,
      name,
      color: newStoreColor,
    };
    onChange({ ...prefs, stores: [...prefs.stores, store] });
    setNewStoreName('');
  };

  // ---- Delete a store and remove its category assignments ----
  const handleDeleteStore = (id: string) => {
    const newDefaults = { ...prefs.categoryDefaults };
    (Object.keys(newDefaults) as GrocerySection[]).forEach((k) => {
      if (newDefaults[k] === id) delete newDefaults[k];
    });
    onChange({ stores: prefs.stores.filter((s) => s.id !== id), categoryDefaults: newDefaults });
  };

  // ---- Cycle through preset colors for an existing store ----
  const handleColorCycle = (storeId: string) => {
    onChange({
      ...prefs,
      stores: prefs.stores.map((s) => {
        if (s.id !== storeId) return s;
        const currentIdx = PRESET_STORE_COLORS.indexOf(s.color ?? '');
        const nextColor = PRESET_STORE_COLORS[(currentIdx + 1) % PRESET_STORE_COLORS.length];
        return { ...s, color: nextColor };
      }),
    });
  };

  // ---- Assign a store to a grocery category ----
  const handleCategoryChange = (section: GrocerySection, storeId: string) => {
    const updated = { ...prefs.categoryDefaults };
    if (storeId === '') {
      delete updated[section];
    } else {
      updated[section] = storeId;
    }
    onChange({ ...prefs, categoryDefaults: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-800">🏪 Store Preferences</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Add stores and assign which categories you buy there
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

          {/* ---- Section 1: Your Stores ---- */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
              Your Stores
            </h3>

            {prefs.stores.length === 0 && (
              <p className="text-sm text-stone-400 italic mb-4">
                No stores yet — add one below to get started.
              </p>
            )}

            {/* Store list */}
            {prefs.stores.length > 0 && (
              <div className="space-y-2 mb-4">
                {prefs.stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 bg-stone-50 rounded-xl px-3 py-2.5"
                  >
                    {/* Color dot — tap to cycle through colors */}
                    <button
                      onClick={() => handleColorCycle(store.id)}
                      title="Tap to change color"
                      className="w-7 h-7 rounded-full flex-shrink-0 border-2 border-white shadow-sm transition-transform hover:scale-110 active:scale-95"
                      style={{ backgroundColor: store.color ?? '#9CA3AF' }}
                    />
                    <span className="flex-1 font-medium text-stone-800 text-sm">{store.name}</span>
                    <button
                      onClick={() => handleDeleteStore(store.id)}
                      className="w-9 h-9 flex items-center justify-center text-stone-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                      title="Remove store"
                      aria-label={`Remove ${store.name}`}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new store */}
            <div className="bg-stone-50 rounded-xl p-4 space-y-3">
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStore()}
                placeholder="Store name (e.g. Costco, Trader Joe's)"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              />

              {/* Color swatches */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-stone-400 mr-1">Color:</span>
                {PRESET_STORE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewStoreColor(c)}
                    title={c}
                    className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
                      newStoreColor === c
                        ? 'ring-2 ring-offset-1 ring-stone-700 scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <button
                onClick={handleAddStore}
                disabled={!newStoreName.trim()}
                className="w-full py-2.5 bg-primary-600 text-white font-semibold rounded-lg text-sm hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add Store
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100" />

          {/* ---- Section 2: Category Defaults ---- */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
              Default Store by Category
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Your shopping list will automatically group items under these stores.
              Set it once and it works every time.
            </p>

            {prefs.stores.length === 0 ? (
              <p className="text-sm text-stone-400 italic">
                Add at least one store above to start assigning categories.
              </p>
            ) : (
              <div className="space-y-1">
                {GROCERY_SECTION_ORDER.map((section) => {
                  const assignedStore = prefs.stores.find(
                    (s) => s.id === prefs.categoryDefaults[section]
                  );
                  return (
                    <div
                      key={section}
                      className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0"
                    >
                      {/* Section icon */}
                      <span className="text-xl w-7 text-center flex-shrink-0">
                        {GROCERY_SECTION_ICONS[section]}
                      </span>

                      {/* Section name */}
                      <span className="flex-1 text-sm font-medium text-stone-700">
                        {section}
                      </span>

                      {/* Store color dot (shows current assignment) */}
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 transition-colors"
                        style={{
                          backgroundColor: assignedStore?.color ?? 'transparent',
                          border: assignedStore ? 'none' : '1.5px dashed #D1D5DB',
                        }}
                      />

                      {/* Store dropdown */}
                      <select
                        value={prefs.categoryDefaults[section] ?? ''}
                        onChange={(e) => handleCategoryChange(section, e.target.value)}
                        className="text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-primary-300 min-w-[130px]"
                      >
                        <option value="">— None —</option>
                        {prefs.stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---- Section 3: Saved Ingredient Preferences ---- */}
          {(() => {
            const overrides = prefs.ingredientOverrides ?? {};
            const overrideEntries = Object.entries(overrides);
            if (overrideEntries.length === 0) return null;

            return (
              <>
                <div className="border-t border-stone-100" />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Saved Ingredient Preferences
                    </h3>
                    <button
                      onClick={() => onChange({ ...prefs, ingredientOverrides: {} })}
                      className="text-xs text-red-400 hover:text-red-600 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                  <p className="text-xs text-stone-400 mb-3">
                    These take priority over category defaults. Change or clear from the shopping list.
                  </p>
                  <div className="space-y-1.5">
                    {overrideEntries.map(([normalizedName, storeId]) => {
                      const store = prefs.stores.find((s) => s.id === storeId);
                      return (
                        <div
                          key={normalizedName}
                          className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2"
                        >
                          <span className="flex-1 text-sm text-stone-700 font-medium truncate">
                            {normalizedName}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-stone-500">
                            {store && (
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: store.color ?? '#9CA3AF' }}
                              />
                            )}
                            {store?.name ?? <span className="italic text-stone-400">deleted store</span>}
                          </span>
                          <button
                            onClick={() => {
                              const updated = { ...(prefs.ingredientOverrides ?? {}) };
                              delete updated[normalizedName];
                              onChange({ ...prefs, ingredientOverrides: updated });
                            }}
                            className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-red-400 rounded hover:bg-red-50 transition-colors text-sm flex-shrink-0"
                            title="Remove this override"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
