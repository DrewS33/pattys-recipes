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
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden no-print">
      {/* Panel header */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <h2 className="font-display text-lg font-bold text-stone-800 flex items-center gap-2">
          🗒️ Selected Recipes
          {count > 0 && (
            <span className="bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {count}
            </span>
          )}
        </h2>
        <p className="text-stone-500 text-sm">
          {count === 0
            ? 'No recipes selected yet'
            : `${count} recipe${count !== 1 ? 's' : ''} selected`}
        </p>
      </div>

      {/* Recipe list */}
      <div className="divide-y divide-gray-100">
        {count === 0 ? (
          // Empty state
          <div className="p-6 text-center">
            <div className="text-5xl mb-3">🛒</div>
            <p className="text-gray-500 text-base leading-relaxed">
              No recipes selected yet.
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Click "Add to List" on any recipe to get started!
            </p>
          </div>
        ) : (
          selectedRecipes.map(({ recipe, servingMultiplier }) => (
            <div key={recipe.id} className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm leading-tight truncate">
                    {recipe.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {recipe.proteinType} · {recipe.mealType}
                  </p>
                </div>
                {/* Remove button */}
                <button
                  onClick={() => onRemove(recipe.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-sm font-bold transition-colors"
                  title="Remove recipe"
                >
                  ✕
                </button>
              </div>

              {/* Compact serving adjuster */}
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

      {/* Footer: View Shopping List button */}
      {count > 0 && (
        <div className="p-4 bg-amber-50 border-t border-amber-100">
          <button
            onClick={onViewShoppingList}
            className="w-full py-3 px-4 bg-primary-500 text-white font-bold rounded-xl text-base hover:bg-primary-600 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            🛒 View Shopping List
            <span className="text-primary-200">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
