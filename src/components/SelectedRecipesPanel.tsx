import { useMemo } from 'react';
import { SelectedRecipe } from '../types';
import ServingAdjuster from './ServingAdjuster';
import { mergeIngredients } from '../utils/ingredientMerger';

// ============================================================
// SelectedRecipesPanel — "Your Grocery List"
//   Shows selected recipes with thumbnails + serving controls.
//   Displays live ingredient count so users feel the list
//   is being built as they add recipes.
// ============================================================

interface SelectedRecipesPanelProps {
  selectedRecipes: SelectedRecipe[];
  onUpdateMultiplier: (recipeId: string, multiplier: number) => void;
  onRemove: (recipeId: string) => void;
  onViewShoppingList: () => void;
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

export default function SelectedRecipesPanel({
  selectedRecipes,
  onUpdateMultiplier,
  onRemove,
  onViewShoppingList,
}: SelectedRecipesPanelProps) {
  const count = selectedRecipes.length;

  // Live ingredient count — updates whenever recipes / multipliers change
  const ingredientCount = useMemo(
    () => (count > 0 ? mergeIngredients(selectedRecipes).length : 0),
    [selectedRecipes, count]
  );

  return (
    <div className="bg-[#fffdf9] border border-stone-200/60 rounded-2xl shadow-card overflow-hidden no-print">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-stone-100 bg-gradient-to-b from-primary-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-primary-900 flex items-center gap-2">
            🧺 Your Grocery List
            {count > 0 && (
              <span className="bg-primary-500 text-white text-xs font-semibold rounded-full w-5 h-5
                               flex items-center justify-center leading-none">
                {count}
              </span>
            )}
          </h2>
        </div>

        {count === 0 ? (
          <p className="text-stone-400 text-xs mt-1 leading-snug">
            Add recipes below to start your list
          </p>
        ) : (
          <p className="text-stone-500 text-xs mt-1 leading-snug">
            {count} recipe{count !== 1 ? 's' : ''}
            <span className="text-stone-300 mx-1">·</span>
            <span className="text-emerald-600 font-medium">{ingredientCount} ingredients</span>
          </p>
        )}
      </div>

      {/* ── Recipe rows ── */}
      <div className="divide-y divide-stone-100/80">
        {count === 0 ? (
          /* ── Empty state ── */
          <div className="px-5 py-10 text-center">
            <div className="text-5xl mb-3 select-none">🛒</div>
            <p className="font-display text-base font-semibold text-stone-700 mb-1">
              Start building your grocery list
            </p>
            <p className="text-stone-400 text-xs leading-relaxed">
              Tap <strong className="font-semibold text-stone-500">Add to Shopping List</strong> on<br />
              any recipe to get started.
            </p>
          </div>
        ) : (
          selectedRecipes.map(({ recipe, servingMultiplier }) => {
            const emoji = PROTEIN_EMOJI[recipe.proteinType] || '🍴';
            return (
              <div key={recipe.id} className="px-4 py-3.5">
                {/* Recipe row */}
                <div className="flex items-center gap-3 mb-2.5">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden
                                  bg-stone-100 flex items-center justify-center text-xl shadow-sm">
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{emoji}</span>
                    )}
                  </div>

                  {/* Name + type */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm leading-tight line-clamp-1">
                      {recipe.name}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      {recipe.mealType} · {recipe.proteinType}
                    </p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => onRemove(recipe.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-full text-stone-300
                               hover:bg-red-50 hover:text-red-400
                               flex items-center justify-center text-xs
                               transition-all duration-150 active:scale-95"
                    title="Remove from list"
                  >
                    ✕
                  </button>
                </div>

                {/* Serving adjuster */}
                <ServingAdjuster
                  defaultServings={recipe.defaultServings}
                  multiplier={servingMultiplier}
                  onChange={(m) => onUpdateMultiplier(recipe.id, m)}
                  compact
                />
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer CTA ── */}
      {count > 0 && (
        <div className="px-4 py-4 border-t border-stone-100">
          <button
            onClick={onViewShoppingList}
            className="w-full py-3 px-4 bg-primary-500 text-white font-bold rounded-xl text-sm
                       hover:bg-primary-600 transition-all duration-150
                       shadow-sm hover:shadow-md active:scale-[0.98]
                       flex items-center justify-center gap-2"
          >
            🛒 View Full Shopping List
            <span className="opacity-60 text-base leading-none">→</span>
          </button>
          <p className="text-center text-[11px] text-stone-400 mt-2">
            {ingredientCount} items ready to check off
          </p>
        </div>
      )}
    </div>
  );
}
