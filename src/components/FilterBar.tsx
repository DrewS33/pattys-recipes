import { useState } from 'react';
import { Filters, DifficultyLevel, ProteinType, MealType } from '../types';

// ============================================================
// FilterBar: search + collapsible filter sections
// ============================================================

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const DIFFICULTY_OPTIONS: Array<{ value: DifficultyLevel | 'All'; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'Easy', label: '🟢 Easy' },
  { value: 'Medium', label: '🟡 Medium' },
  { value: 'Hard', label: '🔴 Hard' },
];

const PROTEIN_OPTIONS: Array<{ value: ProteinType | 'All'; label: string }> = [
  { value: 'All', label: '🍽️ All' },
  { value: 'Chicken', label: '🍗 Chicken' },
  { value: 'Beef', label: '🥩 Beef' },
  { value: 'Pork', label: '🐷 Pork' },
  { value: 'Turkey', label: '🦃 Turkey' },
  { value: 'Seafood', label: '🦐 Seafood' },
  { value: 'Pasta', label: '🍝 Pasta' },
  { value: 'Soup', label: '🍲 Soup' },
  { value: 'Other', label: '🍴 Other' },
];

const MEAL_TYPE_OPTIONS: Array<{ value: MealType | 'All'; label: string }> = [
  { value: 'All', label: 'All Meals' },
  { value: 'Breakfast', label: '☀️ Breakfast' },
  { value: 'Lunch', label: '🌤️ Lunch' },
  { value: 'Dinner', label: '🌙 Dinner' },
  { value: 'Snack', label: '🍎 Snack' },
  { value: 'Dessert', label: '🍰 Dessert' },
  { value: 'Side Dish', label: '🥗 Side Dish' },
];

const TIME_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'Any Time' },
  { value: 30, label: '⚡ Under 30 min' },
  { value: 45, label: '🕐 Under 45 min' },
  { value: 60, label: '🕑 Under 1 hour' },
];

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    quick: true,
    categories: false,
    mealType: false,
    time: false,
  });

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.difficulty !== 'All' ||
    filters.proteinType !== 'All' ||
    filters.mealType !== 'All' ||
    filters.maxTime !== null ||
    filters.minTime !== null ||
    filters.favoritesOnly;

  const clearAllFilters = () => {
    onFilterChange({
      search: '',
      difficulty: 'All',
      proteinType: 'All',
      mealType: 'All',
      maxTime: null,
      minTime: null,
      favoritesOnly: false,
    });
  };

  const chipBase = 'px-4 py-2 rounded-full text-sm transition-all duration-150 whitespace-nowrap active:scale-95 font-medium';
  const chipActive = 'bg-primary-500 text-white shadow-sm';
  const chipInactive = 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800';

  const SectionToggle = ({
    label,
    sectionKey,
    hasActive,
  }: {
    label: string;
    sectionKey: string;
    hasActive: boolean;
  }) => (
    <button
      onClick={() => toggle(sectionKey)}
      className="w-full flex items-center justify-between py-3 group"
    >
      <span className="text-sm font-semibold text-stone-700 flex items-center gap-2">
        {label}
        {hasActive && (
          <span className="w-2 h-2 rounded-full bg-primary-400 inline-block" />
        )}
      </span>
      <svg
        className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${expanded[sectionKey] ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div className="bg-white/80 rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.07)] px-5 pt-4 pb-2 mb-6 no-print">
      {/* Search bar */}
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search recipes by name or ingredient..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-10 pr-10 py-3 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all duration-150 text-stone-700 placeholder-stone-400"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Quick Filters: Difficulty + Favorites ── */}
      <div className="border-t border-stone-100">
        <SectionToggle
          label="Quick Filters"
          sectionKey="quick"
          hasActive={filters.difficulty !== 'All' || filters.favoritesOnly}
        />
        {expanded.quick && (
          <div className="pb-4 space-y-4">
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateFilter('difficulty', opt.value as Filters['difficulty'])}
                    className={`${chipBase} ${filters.difficulty === opt.value ? chipActive : chipInactive}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
              className={`${chipBase} flex items-center gap-2 ${
                filters.favoritesOnly
                  ? 'bg-yellow-400 text-white shadow-sm'
                  : chipInactive
              }`}
            >
              ⭐ Show Favorites Only
            </button>
          </div>
        )}
      </div>

      {/* ── Categories ── */}
      <div className="border-t border-stone-100">
        <SectionToggle
          label="Categories"
          sectionKey="categories"
          hasActive={filters.proteinType !== 'All'}
        />
        {expanded.categories && (
          <div className="pb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {PROTEIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('proteinType', opt.value as Filters['proteinType'])}
                  className={`flex-shrink-0 ${chipBase} ${filters.proteinType === opt.value ? chipActive : chipInactive}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Meal Type ── */}
      <div className="border-t border-stone-100">
        <SectionToggle
          label="Meal Type"
          sectionKey="mealType"
          hasActive={filters.mealType !== 'All'}
        />
        {expanded.mealType && (
          <div className="pb-4">
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('mealType', opt.value as Filters['mealType'])}
                  className={`${chipBase} ${filters.mealType === opt.value ? chipActive : chipInactive}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Cook Time ── */}
      <div className="border-t border-stone-100">
        <SectionToggle
          label="Cook Time"
          sectionKey="time"
          hasActive={filters.maxTime !== null || filters.minTime !== null}
        />
        {expanded.time && (
          <div className="pb-4">
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => updateFilter('maxTime', opt.value)}
                  className={`${chipBase} ${
                    filters.maxTime === opt.value
                      ? 'bg-amber-500 text-white shadow-sm'
                      : chipInactive
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => updateFilter('minTime', filters.minTime === 90 ? null : 90)}
                className={`${chipBase} ${
                  filters.minTime === 90
                    ? 'bg-amber-500 text-white shadow-sm'
                    : chipInactive
                }`}
              >
                🍖 Over 90 min
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <div className="border-t border-stone-100 py-3">
          <button
            onClick={clearAllFilters}
            className="text-sm text-stone-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95"
          >
            ✕ Clear all filters
          </button>
        </div>
      )}

      {/* Breathing room at bottom when no clear button */}
      {!hasActiveFilters && <div className="pb-2" />}
    </div>
  );
}
