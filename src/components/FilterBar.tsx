import { useState, useEffect, useRef } from 'react';
import { Filters, DifficultyLevel, ProteinType, MealType } from '../types';

// ============================================================
// FilterBar
//   Default view : search  +  difficulty chips  +  ⭐ Favorites
//   "Filter Recipes" button opens a floating panel that overlays
//   the recipe grid — keeps the page calm on first load.
// ============================================================

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel | 'All'; label: string }> = [
  { value: 'All',    label: 'All' },
  { value: 'Easy',   label: '🟢 Easy' },
  { value: 'Medium', label: '🟡 Medium' },
  { value: 'Hard',   label: '🔴 Hard' },
];

const PROTEIN_OPTIONS: Array<{ value: ProteinType | 'All'; label: string }> = [
  { value: 'All',     label: '🍽️ All' },
  { value: 'Chicken', label: '🍗 Chicken' },
  { value: 'Beef',    label: '🥩 Beef' },
  { value: 'Pork',    label: '🐷 Pork' },
  { value: 'Turkey',  label: '🦃 Turkey' },
  { value: 'Seafood', label: '🦐 Seafood' },
  { value: 'Pasta',   label: '🍝 Pasta' },
  { value: 'Soup',    label: '🍲 Soup' },
  { value: 'Other',   label: '🍴 Other' },
];

const MEAL_TYPE_OPTIONS: Array<{ value: MealType | 'All'; label: string }> = [
  { value: 'All',       label: 'All Meals' },
  { value: 'Breakfast', label: '☀️ Breakfast' },
  { value: 'Lunch',     label: '🌤️ Lunch' },
  { value: 'Dinner',    label: '🌙 Dinner' },
  { value: 'Snack',     label: '🍎 Snack' },
  { value: 'Dessert',   label: '🍰 Dessert' },
  { value: 'Side Dish', label: '🥗 Side Dish' },
];

const TIME_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'Any Time' },
  { value: 30,   label: '⚡ Under 30 min' },
  { value: 45,   label: '🕐 Under 45 min' },
  { value: 60,   label: '🕑 Under 1 hour' },
];

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const hasAdvancedFilters =
    filters.proteinType !== 'All' ||
    filters.mealType    !== 'All' ||
    filters.maxTime     !== null  ||
    filters.minTime     !== null;

  // Floating panel open state — auto-open when advanced filters are active on mount
  const [panelOpen, setPanelOpen] = useState(() => hasAdvancedFilters);
  const panelRef   = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current   && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onFilterChange({ ...filters, [key]: value });

  const hasAnyFilter =
    filters.search !== '' ||
    filters.difficulty !== 'All' ||
    hasAdvancedFilters ||
    filters.favoritesOnly;

  const clearAll = () =>
    onFilterChange({
      search: '',
      difficulty: 'All',
      proteinType: 'All',
      mealType: 'All',
      maxTime: null,
      minTime: null,
      favoritesOnly: false,
    });

  // Active advanced-filter count shown on the trigger button
  const advancedCount = [
    filters.proteinType !== 'All',
    filters.mealType    !== 'All',
    filters.maxTime !== null || filters.minTime !== null,
  ].filter(Boolean).length;

  const chip   = 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap active:scale-95 select-none';
  const on     = 'bg-primary-500 text-white shadow-sm';
  const off    = 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-800';
  const label  = 'text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2.5';

  return (
    /* Outer wrapper is relative so the floating panel can use absolute positioning */
    <div className="relative mb-6 no-print">

      {/* ── Main bar (always visible) ── */}
      <div className="bg-white/85 rounded-2xl shadow-card px-5 pt-5 pb-4 space-y-4">

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by name, ingredient, or tag…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm border border-stone-200 rounded-xl bg-white
                       focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100
                       transition-all duration-150 text-stone-700 placeholder-stone-400"
          />
          {filters.search && (
            <button
              onClick={() => set('search', '')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Difficulty */}
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => set('difficulty', opt.value as Filters['difficulty'])}
              className={`${chip} ${filters.difficulty === opt.value ? on : off}`}
            >
              {opt.label}
            </button>
          ))}

          {/* Favorites */}
          <button
            onClick={() => set('favoritesOnly', !filters.favoritesOnly)}
            className={`${chip} flex items-center gap-1.5 ${
              filters.favoritesOnly ? 'bg-amber-400 text-white shadow-sm' : off
            }`}
          >
            ⭐ Favorites
          </button>

          {/* Push "Filter Recipes" to the right on wide screens */}
          <span className="flex-1 hidden sm:block" />

          {/* "Filter Recipes" trigger */}
          <button
            ref={triggerRef}
            onClick={() => setPanelOpen((v) => !v)}
            className={`${chip} flex items-center gap-2 border transition-all duration-200 ${
              panelOpen || advancedCount > 0
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
            }`}
          >
            {advancedCount > 0 ? (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] font-bold">
                {advancedCount}
              </span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h4" />
              </svg>
            )}
            Filter Recipes
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${panelOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Active-filter summary + Clear */}
        {hasAnyFilter && (
          <div className="flex items-center justify-between pt-0.5 border-t border-stone-100">
            <p className="text-xs text-stone-400 italic">Filters are active</p>
            <button
              onClick={clearAll}
              className="text-xs text-stone-400 hover:text-primary-500 px-3 py-1.5 rounded-full
                         hover:bg-primary-50 transition-all duration-150 active:scale-95"
            >
              ✕ Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Floating "Filter Recipes" panel ── */}
      {panelOpen && (
        <div
          ref={panelRef}
          className="filter-panel-enter absolute top-[calc(100%+8px)] left-0 right-0 z-30
                     bg-white rounded-2xl shadow-card-lg border border-stone-100
                     px-5 pt-5 pb-4 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-700">More Filters</p>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Category */}
          <div>
            <p className={label}>Category</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {PROTEIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('proteinType', opt.value as Filters['proteinType'])}
                  className={`flex-shrink-0 ${chip} ${filters.proteinType === opt.value ? on : off}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meal Type */}
          <div>
            <p className={label}>Meal Type</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('mealType', opt.value as Filters['mealType'])}
                  className={`${chip} ${filters.mealType === opt.value ? on : off}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cook Time */}
          <div>
            <p className={label}>Cook Time</p>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => set('maxTime', opt.value)}
                  className={`${chip} ${
                    filters.maxTime === opt.value ? 'bg-amber-500 text-white shadow-sm' : off
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => set('minTime', filters.minTime === 90 ? null : 90)}
                className={`${chip} ${filters.minTime === 90 ? 'bg-amber-500 text-white shadow-sm' : off}`}
              >
                🍖 Over 90 min
              </button>
            </div>
          </div>

          {/* Done button */}
          <div className="pt-1 border-t border-stone-100">
            <button
              onClick={() => setPanelOpen(false)}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
