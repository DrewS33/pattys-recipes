import { SelectedRecipe } from '../types';
import ServingAdjuster from './ServingAdjuster';

// ============================================================
// SelectedRecipesPanel: sidebar showing recipes added to shopping list
// ============================================================

interface SelectedRecipesPanelProps {
  selectedRecipes: SelectedRecipe[];
  onUpdateMultiplier: (recipeId: string, multiplier: number) => void;
  onRemove: (recipeId: string) => void;
  onViewShoppingList: () => void;
}

export default function SelectedRecipesPanel({
  selectedRecipes,
  onUpdateMultiplier,
  onRemove,
  onViewShoppingList,
}: SelectedRecipesPanelProps) {
  const count = selectedRecipes.length;

  return (
    <div className="bg-white/80 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.09)] overflow-hidden no-print">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-stone-100">
        <h2 className="font-display text-base font-semibold text-stone-800 flex items-center gap-2">
          🗒️ Selected Recipes
          {count > 0 && (
            <span className="bg-primary-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {count}
            </span>
          )}
        </h2>
        <p className="text-stone-400 text-xs mt-0.5">
          {count === 0
            ? 'No recipes selected yet'
            : `${count} recipe${count !== 1 ? 's' : ''} selected`}
        </p>
      </div>

      {/* Recipe list */}
      <div className="divide-y divide-stone-100">
        {count === 0 ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3 opacity-60">🛒</div>
            <p className="text-stone-500 text-sm leading-relaxed">No recipes selected yet.</p>
            <p className="text-stone-400 text-xs mt-1">Click "+ Add to List" to get started.</p>
          </div>
        ) : (
          selectedRecipes.map(({ recipe, servingMultiplier }) => (
            <div key={recipe.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm leading-tight truncate">
                    {recipe.name}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {recipe.proteinType} · {recipe.mealType}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(recipe.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-full text-stone-400 hover:bg-red-50 hover:text-red-400 flex items-center justify-center text-xs transition-all duration-150"
                  title="Remove recipe"
                >
                  ✕
                </button>
              </div>
              <ServingAdjuster
                defaultServings={recipe.defaultServings}
                multiplier={servingMultiplier}
                onChange={(m) => onUpdateMultiplier(recipe.id, m)}
                compact
              />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {count > 0 && (
        <div className="px-4 py-3 border-t border-stone-100">
          <button
            onClick={onViewShoppingList}
            className="w-full py-2.5 px-4 bg-primary-500 text-white font-semibold rounded-xl text-sm hover:bg-primary-600 transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
          >
            🛒 View Shopping List
            <span className="opacity-60">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
