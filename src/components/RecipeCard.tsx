import { Recipe } from '../types';
import StarRating from './StarRating';

// ============================================================
// RecipeCard: displays a single recipe in grid view
// ============================================================

interface RecipeCardProps {
  recipe: Recipe;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (recipe: Recipe) => void;
  onViewDetail: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
}

const PROTEIN_EMOJI: Record<string, string> = {
  Chicken: '🍗',
  Beef: '🥩',
  Pork: '🥓',
  Turkey: '🦃',
  Seafood: '🦐',
  Pasta: '🍝',
  Soup: '🍲',
  Breakfast: '🥞',
  Other: '🍴',
};

const CARD_GRADIENTS: Record<string, string> = {
  Chicken: 'from-amber-200 to-amber-400',
  Beef: 'from-red-700 to-red-900',
  Pork: 'from-orange-300 to-red-500',
  Turkey: 'from-amber-300 to-amber-500',
  Seafood: 'from-blue-400 to-cyan-600',
  Pasta: 'from-yellow-300 to-amber-500',
  Soup: 'from-red-400 to-red-700',
  Breakfast: 'from-amber-100 to-amber-300',
  Other: 'from-stone-300 to-stone-500',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-red-100 text-red-700',
};

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RecipeCard({
  recipe,
  isSelected,
  isFavorite,
  onSelect,
  onViewDetail,
  onToggleFavorite,
}: RecipeCardProps) {
  const emoji = PROTEIN_EMOJI[recipe.proteinType] || '🍴';
  const gradient = CARD_GRADIENTS[recipe.proteinType] || 'from-gray-300 to-slate-400';

  return (
    <div
      className={`
        group bg-white rounded-2xl overflow-hidden flex flex-col
        transition-all duration-200 ease-out
        ${isSelected
          ? 'shadow-[0_6px_24px_rgba(0,0,0,0.14)] ring-2 ring-primary-400 ring-offset-1 -translate-y-0.5'
          : 'shadow-[0_2px_16px_rgba(0,0,0,0.09)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.14)] hover:-translate-y-1'
        }
      `}
    >
      {/* Card image */}
      <div className="relative h-52 overflow-hidden">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-[1.03]`}>
            <span className="text-7xl">{emoji}</span>
          </div>
        )}

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-3 left-3 bg-primary-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            ✓ In Your List
          </div>
        )}

        {/* Quick meal badge */}
        {!isSelected && recipe.totalTimeMinutes <= 30 && (
          <div className="absolute top-3 left-3 bg-emerald-500/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm">
            ⚡ Quick Meal
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          className={`
            absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-lg
            transition-all duration-150 shadow-sm active:scale-95
            ${isFavorite
              ? 'bg-yellow-400 hover:bg-yellow-300'
              : 'bg-white/80 hover:bg-white text-gray-400 hover:text-gray-600'
            }
          `}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '⭐' : '☆'}
        </button>

        {/* Time badge */}
        <div className="absolute bottom-3 right-3 bg-black/55 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
          {formatTime(recipe.totalTimeMinutes)}
        </div>
      </div>

      {/* Card content */}
      <div className="px-5 pt-4 pb-5 flex flex-col flex-1 gap-3.5">
        {/* Recipe name + rating */}
        <div>
          <h3 className="font-display text-lg font-bold text-stone-800 leading-tight">{recipe.name}</h3>
          {recipe.rating !== undefined && (
            <div className="mt-1.5">
              <StarRating rating={recipe.rating} size="sm" readOnly />
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-stone-400 text-sm leading-[1.65] line-clamp-2 flex-1">
          {recipe.description}
        </p>

        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
            {recipe.difficulty}
          </span>
          {isFavorite && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600">
              ❤️ Family Favorite
            </span>
          )}
          <span className="text-xs text-stone-400 tracking-wide">{recipe.proteinType} · {recipe.mealType}</span>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20H7a2 2 0 01-2-2V9a2 2 0 012-2h1V5a3 3 0 016 0v2h1a2 2 0 012 2v9a2 2 0 01-2 2z" />
            </svg>
            {recipe.defaultServings}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
            {recipe.prepTimeMinutes}m prep
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343M12 3v1m0 16v1m9-9h-1M4 12H3" />
            </svg>
            {recipe.cookTimeMinutes}m cook
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-0.5">
          <button
            onClick={() => onViewDetail(recipe)}
            className="flex-1 py-2.5 px-3 text-stone-500 text-sm hover:text-stone-700 hover:underline transition-all duration-150 active:scale-[0.97]"
          >
            View Recipe
          </button>
          <button
            onClick={() => onSelect(recipe)}
            className={`
              flex-1 py-2.5 px-3 font-semibold rounded-xl text-sm transition-all duration-150 active:scale-[0.97]
              ${isSelected
                ? 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500'
                : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow-md'
              }
            `}
          >
            {isSelected ? '✕ Remove from List' : '+ Add to Shopping List'}
          </button>
        </div>
      </div>
    </div>
  );
}
