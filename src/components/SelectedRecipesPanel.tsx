import { SelectedRecipe } from '../types';
import ServingAdjuster from './ServingAdjuster';

// ============================================================
// SelectedRecipesPanel: sidebar showing recipes in your meal plan
// ============================================================

interface SelectedRecipesPanelProps {
  selectedRecipes: SelectedRecipe[];
  onUpdateMultiplier: (recipeId: string, multiplier: number) => void;
  onRemove: (recipeId: string) => void;
  onViewShoppingList: () => void;
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

export default function SelectedRecipesPanel({
  selectedRecipes,
  onUpdateMultiplier,
  onRemove,
  onViewShoppingList,
}: SelectedRecipesPanelProps) {
  const count = selectedRecipes.length;

  return (
    <div className="bg-[#fffdf9] border border-stone-200/70 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] overflow-hidden no-print">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-stone-100 bg-primary-50/60">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-primary-900 flex items-center gap-2">
            🗒️ Your Meal Plan
            {count > 0 && (
              <span className="bg-primary-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </h2>
        </div>
        <p className="text-stone-500 text-xs mt-1 leading-snug">
          {count === 0
            ? 'Start by adding a recipe to your list'
            : `${count} recipe${count !== 1 ? 's' : ''} ready for your shopping list`}
        </p>
      </div>

      {/* Recipe list */}
      <div className="divide-y divide-stone-100">
        {count === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-5xl mb-3">🛒</div>
            <p className="text-stone-600 text-sm font-medium leading-snug">
              Nothing here yet!
            </p>
            <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
              Browse recipes below and tap<br />
              <span className="font-medium text-stone-500">"Add to Shopping List"</span> to get started.
            </p>
          </div>
        ) : (
          selectedRecipes.map(({ recipe, servingMultiplier }) => {
            const emoji = PROTEIN_EMOJI[recipe.proteinType] || '🍴';
            return (
              <div key={recipe.id} className="px-4 py-3.5">
                <div className="flex items-start gap-3 mb-2.5">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center text-xl shadow-sm">
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
                    <p className="font-semibold text-stone-800 text-sm leading-tight truncate">
                      {recipe.name}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {recipe.proteinType} · {recipe.mealType}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => onRemove(recipe.id)}
                    className="flex-shrink-0 w-6 h-6 rounded-full text-stone-300 hover:bg-red-50 hover:text-red-400 flex items-center justify-center text-xs transition-all duration-150"
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

      {/* Footer */}
      {count > 0 && (
        <div className="px-4 py-4 border-t border-stone-100 bg-stone-50/50">
          <button
            onClick={onViewShoppingList}
            className="w-full py-3 px-4 bg-primary-500 text-white font-bold rounded-xl text-sm hover:bg-primary-600 transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            🛒 View Shopping List
            <span className="opacity-70 text-base leading-none">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
