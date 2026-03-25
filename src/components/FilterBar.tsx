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
  { value: 'Breakfast', label: '🥞 Breakfast' },
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
  { value: 60, label: '🕑 Under 1 hr' },
  { value: 90, label: '🕙 Under 90 min' },
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
    filters.favoritesOnly;

  const clearAllFilters = () => {
    onFilterChange({
      search: '',
      difficulty: 'All',
      proteinType: 'All',
      mealType: 'All',
      maxTime: null,
      favoritesOnly: false,
    });
  };

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 mb-6 space-y-4 no-print">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
        <input
          type="text"
          placeholder="Search recipes by name or ingredient..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-12 pr-4 py-3 text-base border-2 border-amber-200 rounded-xl bg-white focus:outline-none focus:border-primary-400 transition-colors text-stone-700 placeholder-stone-400"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Difficulty filter */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Difficulty</p>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter('difficulty', opt.value as Filters['difficulty'])}
              className={`
                px-4 py-2 rounded-full text-base font-semibold border-2 transition-all
                ${filters.difficulty === opt.value
                  ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
                  : 'bg-white border-amber-200 text-stone-600 hover:border-primary-300 hover:bg-amber-50'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category / Protein filter — horizontal scroll */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Category</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PROTEIN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter('proteinType', opt.value as Filters['proteinType'])}
              className={`
                flex-shrink-0 px-4 py-2 rounded-full text-base font-semibold border-2 transition-all
                ${filters.proteinType === opt.value
                  ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
                  : 'bg-white border-amber-200 text-stone-600 hover:border-primary-300 hover:bg-amber-50'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meal Type filter */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Meal Type</p>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter('mealType', opt.value as Filters['mealType'])}
              className={`
                px-4 py-2 rounded-full text-base font-semibold border-2 transition-all
                ${filters.mealType === opt.value
                  ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
                  : 'bg-white border-amber-200 text-stone-600 hover:border-primary-300 hover:bg-amber-50'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom row: Time filter + Favorites + Clear */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* Max time */}
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => updateFilter('maxTime', opt.value)}
              className={`
                px-4 py-2 rounded-full text-base font-semibold border-2 transition-all
                ${filters.maxTime === opt.value
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                  : 'bg-white border-amber-200 text-stone-600 hover:border-amber-300 hover:bg-amber-50'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Favorites toggle */}
        <button
          onClick={() => updateFilter('favoritesOnly', !filters.favoritesOnly)}
          className={`
            px-5 py-2 rounded-full text-base font-semibold border-2 transition-all flex items-center gap-2
            ${filters.favoritesOnly
              ? 'bg-yellow-400 border-yellow-400 text-white shadow-sm'
              : 'bg-white border-amber-200 text-stone-600 hover:border-yellow-300 hover:bg-amber-50'
            }
          `}
        >
          ⭐ Favorites Only
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="px-5 py-2 rounded-full text-base font-semibold border-2 border-red-200 text-red-500 hover:bg-red-50 transition-all flex items-center gap-2"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
