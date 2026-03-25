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

// Map protein types to food emoji for the card image placeholder
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

// Gradient backgrounds for card images, by protein type
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
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800',
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
        bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden flex flex-col
        transition-all duration-200 hover:shadow-md hover:border-amber-200
        ${isSelected ? 'ring-2 ring-primary-400 ring-offset-1 shadow-md' : ''}
      `}
    >
      {/* Card image / placeholder */}
      <div className="relative h-40 overflow-hidden">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-7xl">{emoji}</span>
          </div>
        )}

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            ✓ In List
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          className={`
            absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center text-xl
            transition-all duration-200 shadow-md
            ${isFavorite
              ? 'bg-yellow-400 hover:bg-yellow-300'
              : 'bg-white/80 hover:bg-white text-gray-400'
            }
          `}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '⭐' : '☆'}
        </button>

        {/* Time badge */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-lg">
          ⏱ {formatTime(recipe.totalTimeMinutes)}
        </div>
      </div>

      {/* Card content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Recipe name */}
        <h3 className="font-display text-lg font-bold text-stone-800 leading-tight mb-1">{recipe.name}</h3>

        {/* Star rating */}
        {recipe.rating !== undefined && (
          <div className="mb-1">
            <StarRating rating={recipe.rating} size="sm" readOnly />
          </div>
        )}

        {/* Description */}
        <p className="text-stone-500 text-sm leading-snug mb-3 line-clamp-2 flex-1">
          {recipe.description}
        </p>

        {/* Tags row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Difficulty badge */}
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
            {recipe.difficulty}
          </span>
          {/* Category */}
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary-100 text-primary-700">
            {recipe.proteinType}
          </span>
          {/* Meal type */}
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
            {recipe.mealType}
          </span>
        </div>

        {/* Info row: servings */}
        <div className="flex items-center gap-3 text-sm text-stone-500 mb-4">
          <span>👥 {recipe.defaultServings} servings</span>
          <span>•</span>
          <span>🍳 {recipe.prepTimeMinutes}m prep</span>
          <span>•</span>
          <span>🔥 {recipe.cookTimeMinutes}m cook</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onViewDetail(recipe)}
            className="flex-1 py-2 px-3 bg-primary-50 text-primary-700 font-semibold rounded-lg text-sm hover:bg-primary-100 transition-colors border border-primary-200"
          >
            View Recipe
          </button>
          <button
            onClick={() => onSelect(recipe)}
            className={`
              flex-1 py-2 px-3 font-semibold rounded-lg text-sm transition-all border
              ${isSelected
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                : 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600 shadow-sm'
              }
            `}
          >
            {isSelected ? '✕ Remove' : '+ Add to List'}
          </button>
        </div>
      </div>
    </div>
  );
}
