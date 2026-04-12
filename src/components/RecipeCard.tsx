import { Recipe } from '../types';
import StarRating from './StarRating';

// ============================================================
// RecipeCard: single recipe tile in the grid
// ============================================================

interface RecipeCardProps {
  recipe: Recipe;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (recipe: Recipe) => void;
  onViewDetail: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
  onPlanForDay?: (recipe: Recipe) => void;
}

const PROTEIN_EMOJI: Record<string, string> = {
  Chicken:   '🍗',
  Beef:      '🥩',
  Pork:      '🥓',
  Turkey:    '🦃',
  Seafood:   '🦐',
  Pasta:     '🍝',
  Soup:      '🍲',
  Breakfast: '🥞',
  Other:     '🍴',
};

const CARD_GRADIENTS: Record<string, string> = {
  Chicken:   'from-amber-100 to-amber-300',
  Beef:      'from-red-800   to-red-950',
  Pork:      'from-orange-200 to-red-400',
  Turkey:    'from-amber-200 to-amber-400',
  Seafood:   'from-sky-300   to-cyan-500',
  Pasta:     'from-yellow-200 to-amber-400',
  Soup:      'from-orange-300 to-red-500',
  Breakfast: 'from-yellow-100 to-amber-200',
  Other:     'from-stone-200  to-stone-400',
};

const DIFFICULTY_PILL: Record<string, string> = {
  Easy:   'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50   text-amber-700',
  Hard:   'bg-red-50     text-red-600',
};

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Build a smart top-left badge label for the recipe image */
function quickBadge(recipe: Recipe): string | null {
  if (recipe.totalTimeMinutes > 30) return null;
  const time = `${recipe.totalTimeMinutes} min`;
  // Append meal type context if it adds meaning
  if (recipe.mealType === 'Dinner')    return `⚡ ${time} dinner`;
  if (recipe.mealType === 'Breakfast') return `⚡ ${time} breakfast`;
  if (recipe.mealType === 'Lunch')     return `⚡ ${time} lunch`;
  return `⚡ Quick meal`;
}

export default function RecipeCard({
  recipe,
  isSelected,
  isFavorite,
  onSelect,
  onViewDetail,
  onToggleFavorite,
  onPlanForDay,
}: RecipeCardProps) {
  const emoji    = PROTEIN_EMOJI[recipe.proteinType] || '🍴';
  const gradient = CARD_GRADIENTS[recipe.proteinType] || 'from-stone-200 to-stone-400';
  const badge    = quickBadge(recipe);

  // Show the first non-empty user tag if present
  const firstTag = recipe.tags?.find((t) => t.trim().length > 0);

  return (
    <div
      className={`
        group bg-[#fffefb] rounded-2xl overflow-hidden flex flex-col
        transition-all duration-200 ease-out
        ${isSelected
          ? 'shadow-card-lg ring-2 ring-primary-400/50 ring-offset-2 -translate-y-0.5'
          : 'shadow-card hover:shadow-card-lg hover:-translate-y-1'
        }
      `}
    >
      {/* ── Photo / gradient ── */}
      <div className="relative h-44 sm:h-52 overflow-hidden">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center
                           transition-transform duration-300 ease-out group-hover:scale-[1.04]`}>
            <span className="text-7xl drop-shadow-sm">{emoji}</span>
          </div>
        )}

        {/* Top-left: "✓ In Your List"  /  quick-meal badge  /  nothing */}
        {isSelected ? (
          <div className="absolute top-3 left-3 bg-primary-500 text-white text-xs font-semibold
                          px-2.5 py-1 rounded-full shadow-sm">
            ✓ In Your List
          </div>
        ) : badge ? (
          <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-xs font-semibold
                          px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm capitalize">
            {badge}
          </div>
        ) : null}

        {/* Favorite star */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }}
          className={`
            absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-lg
            transition-all duration-150 shadow-sm active:scale-95
            ${isFavorite
              ? 'bg-yellow-400 hover:bg-yellow-300'
              : 'bg-white/80 hover:bg-white text-stone-400 hover:text-stone-600'
            }
          `}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? '⭐' : '☆'}
        </button>

        {/* Time pill — bottom right */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-medium
                        px-2.5 py-1 rounded-full backdrop-blur-sm">
          ⏱ {formatTime(recipe.totalTimeMinutes)}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 pt-4 pb-5 flex flex-col flex-1 gap-3">

        {/* Title + star rating */}
        <div>
          <h3 className="font-display text-[1.05rem] font-bold text-stone-800 leading-snug">
            {recipe.name}
          </h3>
          {recipe.rating !== undefined && (
            <div className="mt-1.5">
              <StarRating rating={recipe.rating} size="sm" readOnly />
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-stone-500 text-sm leading-relaxed line-clamp-2 flex-1">
          {recipe.description}
        </p>

        {/* Label pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DIFFICULTY_PILL[recipe.difficulty]}`}>
            {recipe.difficulty}
          </span>
          {isFavorite && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600">
              ❤️ Family Favorite
            </span>
          )}
          {firstTag && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 capitalize">
              {firstTag}
            </span>
          )}
        </div>

        {/* Meta row — just the two most useful numbers */}
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>🍽 {recipe.defaultServings} servings</span>
          <span className="text-stone-200">·</span>
          <span>⏱ {formatTime(recipe.totalTimeMinutes)} total</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={() => onViewDetail(recipe)}
            className="flex-1 py-3 sm:py-2.5 px-3 bg-stone-50 hover:bg-stone-100 text-stone-500
                       hover:text-stone-700 rounded-xl text-sm font-medium
                       transition-all duration-150 active:scale-[0.97]"
          >
            View Recipe
          </button>
          <button
            onClick={() => onSelect(recipe)}
            className={`
              flex-1 py-3 sm:py-2.5 px-3 font-semibold rounded-xl text-sm
              transition-all duration-150 active:scale-[0.97]
              ${isSelected
                ? 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500'
                : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow-md'
              }
            `}
          >
            {isSelected ? '✕ Remove' : '+ Add to List'}
          </button>
          {onPlanForDay && (
            <button
              onClick={(e) => { e.stopPropagation(); onPlanForDay(recipe); }}
              aria-label="Plan for Day"
              title="Plan for Day"
              className="flex-shrink-0 w-11 py-3 sm:py-2.5 bg-stone-50 hover:bg-amber-50
                         border border-stone-100 hover:border-amber-300
                         text-stone-400 hover:text-amber-600
                         rounded-xl text-base flex items-center justify-center
                         transition-all duration-150 active:scale-[0.97]"
            >
              📅
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
