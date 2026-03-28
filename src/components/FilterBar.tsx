import { useState } from 'react';
import { Filters, DifficultyLevel, ProteinType, MealType } from '../types';

// ============================================================
// FilterBar: search bar → quick difficulty/favorites row →
//            "More Filters" panel (hidden by default)
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
  { value: 'All',      label: '🍽️ All' },
  { value: 'Chicken',  label: '🍗 Chicken' },
  { value: 'Beef',     label: '🥩 Beef' },
  { value: 'Pork',     label: '🐷 Pork' },
  { value: 'Turkey',   label: '🦃 Turkey' },
  { value: 'Seafood',  label: '🦐 Seafood' },
  { value: 'Pasta',    label: '🍝 Pasta' },
  { value: 'Soup',     label: '🍲 Soup' },
  { value: 'Other',    label: '🍴 Other' },
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
  // "More Filters" panel — auto-open if any advanced filter is already active
  const [showMore, setShowMore] = useState(
    () => filters.proteinType !== 'All' || filters.mealType !== 'All' || filters.maxTime !== null || filters.minTime !== null
  );

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onFilterChange({ ...filters, [key]: value });

  const hasActiveFilters =
    filters.search !== '' ||
    filters.difficulty !== 'All' ||
    filters.proteinType !== 'All' ||
    filters.mealType !== 'All' ||
    filters.maxTime !== null ||
    filters.minTime !== null ||
    filters.favoritesOnly;

  // Count of active "more" filters — shown on the toggle button
  const moreFilterCount = [
    filters.proteinType !== 'All',
    filters.mealType !== 'All',
    filters.maxTime !== null || filters.minTime !== null,
  ].filter(Boolean).length;

  const clearAllFilters = () =>
    onFilterChange({
      search: '',
      difficulty: 'All',
      proteinType: 'All',
      mealType: 'All',
      maxTime: null,
      minTime: null,
      favoritesOnly: false,
    });

  const chip   = 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap active:scale-95';
  const active = 'bg-primary-500 text-white shadow-sm';
  const idle   = 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-800';

  return (
    <div className="bg-white/85 rounded-2xl shadow-card px-5 pt-5 pb-4 mb-6 no-print space-y-4">

      {/* ── Search bar ── */}
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
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-10 pr-10 py-3 text-sm border border-stone-200 rounded-xl bg-white/90
                     focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100
                     transition-all duration-150 text-stone-700 placeholder-stone-400"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Quick row: difficulty chips + favorites + "More Filters" toggle ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Difficulty chips */}
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter('difficulty', opt.value as Filters['difficulty'])}
            className={`${chip} ${filters.difficulty === opt.value ? active : idle}`}
          >
            {opt.label}
          </button>
        ))}

        {/* Favorites toggle */}
        <button
          onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
          className={`${chip} flex items-center gap-1.5 ${
            filters.favoritesOnly ? 'bg-amber-400 text-white shadow-sm' : idle
          }`}
        >
          ⭐ Favorites
        </button>

        {/* Spacer pushes "More Filters" to the right on wide screens */}
        <span className="flex-1 hidden sm:block" />

        {/* More Filters toggle */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className={`${chip} flex items-center gap-1.5 border transition-all duration-200 ${
            showMore || moreFilterCount > 0
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700'
          }`}
        >
          {moreFilterCount > 0 ? (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] font-bold">
              {moreFilterCount}
            </span>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h4" />
            </svg>
          )}
          More Filters
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ── More Filters panel ── */}
      {showMore && (
        <div className="space-y-5 pt-2 border-t border-stone-100/80">

          {/* Category */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Category</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {PROTEIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('proteinType', opt.value as Filters['proteinType'])}
                  className={`flex-shrink-0 ${chip} ${filters.proteinType === opt.value ? active : idle}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meal Type */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Meal Type</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('mealType', opt.value as Filters['mealType'])}
                  className={`${chip} ${filters.mealType === opt.value ? active : idle}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cook Time */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Cook Time</p>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => updateFilter('maxTime', opt.value)}
                  className={`${chip} ${
                    filters.maxTime === opt.value ? 'bg-amber-500 text-white shadow-sm' : idle
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => updateFilter('minTime', filters.minTime === 90 ? null : 90)}
                className={`${chip} ${filters.minTime === 90 ? 'bg-amber-500 text-white shadow-sm' : idle}`}
              >
                🍖 Over 90 min
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── Clear all ── */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-1 border-t border-stone-100/80">
          <p className="text-xs text-stone-400 italic">Filters are active</p>
          <button
            onClick={clearAllFilters}
            className="text-sm text-stone-400 hover:text-primary-500 px-3 py-1.5 rounded-full
                       hover:bg-primary-50 transition-all duration-150 active:scale-95"
          >
            ✕ Clear all
          </button>
        </div>
      )}

    </div>
  );
}
