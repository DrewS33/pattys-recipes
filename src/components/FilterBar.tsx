import { Filters, DifficultyLevel, ProteinType, MealType } from '../types';

// ============================================================
// FilterBar: controls for searching and filtering recipes
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
  { value: 30, label: '⚡ Under 30m' },
  { value: 45, label: '🕐 Under 45m' },
  { value: 60, label: '🕑 Under 1hr' },
];

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
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

  const chipBase = 'px-3 py-1.5 rounded-full text-sm transition-all duration-150 whitespace-nowrap';
  const chipActive = 'bg-primary-500 text-white font-semibold shadow-sm';
  const chipInactive = 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700';

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] p-5 mb-6 space-y-5 no-print">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search recipes by name or ingredient..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-200 rounded-xl bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 transition-all text-stone-700 placeholder-stone-400"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Difficulty filter */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Difficulty</p>
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

      {/* Category / Protein filter */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Category</p>
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

      {/* Meal Type filter */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Meal Type</p>
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

      {/* Bottom row: Time + Favorites + Clear */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
        {TIME_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => updateFilter('maxTime', opt.value)}
            className={`${chipBase} ${filters.maxTime === opt.value ? 'bg-amber-500 text-white font-semibold shadow-sm' : chipInactive}`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => updateFilter('minTime', filters.minTime === 90 ? null : 90)}
          className={`${chipBase} ${filters.minTime === 90 ? 'bg-amber-500 text-white font-semibold shadow-sm' : chipInactive}`}
        >
          🍖 Over 90m
        </button>

        <div className="flex-1" />

        <button
          onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
          className={`${chipBase} flex items-center gap-1.5 ${filters.favoritesOnly ? 'bg-yellow-400 text-white font-semibold shadow-sm' : chipInactive}`}
        >
          ⭐ Favorites
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-1.5 rounded-full text-sm text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            ✕ Clear
          </button>
        )}
      </div>
    </div>
  );
}
