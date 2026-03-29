import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Recipe, SelectedRecipe, Filters, MealPlan } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { sampleRecipes } from './data/recipes';
import Navigation from './components/Navigation';
import FilterBar from './components/FilterBar';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import SelectedRecipesPanel from './components/SelectedRecipesPanel';
import ShoppingList from './components/ShoppingList';
import AddEditRecipe from './components/AddEditRecipe';
import MealPlanner from './components/MealPlanner';
import { mergeIngredients } from './utils/ingredientMerger';

// ============================================================
// App: root component — orchestrates all state and routing
// ============================================================

const DEFAULT_FILTERS: Filters = {
  search: '',
  difficulty: 'All',
  proteinType: 'All',
  mealType: 'All',
  maxTime: null,
  minTime: null,
  favoritesOnly: false,
};

// Build a stable shopping item key (matches ShoppingList.tsx)
function itemKey(name: string, unit: string): string {
  return `${name.toLowerCase()}|${unit.toLowerCase()}`;
}

export default function App() {
  // ---- Persisted state (localStorage) ----

  // Recipes list — seeded with Patty's recipes on first visit
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes-v2', sampleRecipes);

  // Selected recipes for shopping list
  const [selectedRecipes, setSelectedRecipes] = useLocalStorage<SelectedRecipe[]>(
    'selectedRecipes',
    []
  );

  // Favorite recipe IDs stored as array (Set not JSON-serializable)
  const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>('favoriteIds', []);

  // Checked shopping list item keys (stored as array)
  const [checkedItemKeys, setCheckedItemKeys] = useLocalStorage<string[]>('checkedItems', []);

  // Meal plan — date key → { breakfast, lunch, dinner } recipe IDs
  const [mealPlan, setMealPlan] = useLocalStorage<MealPlan>('mealPlan', {});

  // Merge any new seed recipes into existing localStorage data (handles returning users)
  useEffect(() => {
    const existingIds = new Set(recipes.map((r) => r.id));
    const toAdd = sampleRecipes.filter((r) => !existingIds.has(r.id));
    if (toAdd.length > 0) {
      setRecipes((prev) => [...prev, ...toAdd]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Local (non-persisted) UI state ----

  const [activeTab, setActiveTab] = useState<'recipes' | 'shopping' | 'favorites' | 'planner'>('recipes');
  const importFileRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeRecipeDetail, setActiveRecipeDetail] = useState<Recipe | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Derived sets for O(1) lookups
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const checkedSet = useMemo(() => new Set(checkedItemKeys), [checkedItemKeys]);
  const selectedIds = useMemo(
    () => new Set(selectedRecipes.map((sr) => sr.recipe.id)),
    [selectedRecipes]
  );

  // ---- Shopping list count (for nav badge) ----
  const shoppingListCount = useMemo(() => {
    return mergeIngredients(selectedRecipes).length;
  }, [selectedRecipes]);

  // ---- Filtering ----

  const getFilteredRecipes = useCallback(
    (sourceRecipes: Recipe[]) => {
      return sourceRecipes.filter((r) => {
        // Search: match name, description, tags, ingredients
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const haystack =
            r.name.toLowerCase() +
            ' ' +
            r.description.toLowerCase() +
            ' ' +
            r.tags.join(' ').toLowerCase() +
            ' ' +
            r.ingredients.map((i) => i.name.toLowerCase()).join(' ');
          if (!haystack.includes(q)) return false;
        }

        if (filters.difficulty !== 'All' && r.difficulty !== filters.difficulty) return false;
        if (filters.proteinType !== 'All' && r.proteinType !== filters.proteinType) return false;
        if (filters.mealType !== 'All' && r.mealType !== filters.mealType) return false;
        if (filters.maxTime !== null && r.totalTimeMinutes > filters.maxTime) return false;
        if (filters.minTime !== null && r.totalTimeMinutes <= filters.minTime) return false;
        if (filters.favoritesOnly && !favoriteSet.has(r.id)) return false;

        return true;
      });
    },
    [filters, favoriteSet]
  );

  // Filtered recipe lists for each tab
  const filteredRecipes = useMemo(() => getFilteredRecipes(recipes), [getFilteredRecipes, recipes]);
  const favoriteRecipes = useMemo(
    () => recipes.filter((r) => favoriteSet.has(r.id)),
    [recipes, favoriteSet]
  );

  // ---- Handlers ----

  const handleAddToList = useCallback((recipe: Recipe, multiplier: number) => {
    setSelectedRecipes((prev) => {
      const existing = prev.find((sr) => sr.recipe.id === recipe.id);
      if (existing) {
        // Update multiplier if already selected
        return prev.map((sr) =>
          sr.recipe.id === recipe.id ? { ...sr, servingMultiplier: multiplier } : sr
        );
      }
      return [...prev, { recipe, servingMultiplier: multiplier }];
    });
  }, [setSelectedRecipes]);

  const handleRemoveFromList = useCallback((recipeId: string) => {
    setSelectedRecipes((prev) => prev.filter((sr) => sr.recipe.id !== recipeId));
  }, [setSelectedRecipes]);

  const handleUpdateMultiplier = useCallback((recipeId: string, multiplier: number) => {
    setSelectedRecipes((prev) =>
      prev.map((sr) =>
        sr.recipe.id === recipeId ? { ...sr, servingMultiplier: multiplier } : sr
      )
    );
  }, [setSelectedRecipes]);

  const handleToggleFavorite = useCallback((recipeId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
    );
  }, [setFavoriteIds]);

  const handleSaveRecipe = useCallback((recipe: Recipe) => {
    setRecipes((prev) => {
      const exists = prev.find((r) => r.id === recipe.id);
      if (exists) {
        // Update existing recipe
        return prev.map((r) => (r.id === recipe.id ? recipe : r));
      }
      // Add new recipe at top
      return [recipe, ...prev];
    });
    // If the updated recipe is in the selected list, sync it there too
    setSelectedRecipes((prev) =>
      prev.map((sr) => (sr.recipe.id === recipe.id ? { ...sr, recipe } : sr))
    );
  }, [setRecipes, setSelectedRecipes]);

  const handleDeleteRecipe = useCallback((recipeId: string) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setSelectedRecipes((prev) => prev.filter((sr) => sr.recipe.id !== recipeId));
    setFavoriteIds((prev) => prev.filter((id) => id !== recipeId));
    setIsDetailOpen(false);
    setActiveRecipeDetail(null);
  }, [setRecipes, setSelectedRecipes, setFavoriteIds]);

  const handleToggleCheck = useCallback((key: string) => {
    setCheckedItemKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, [setCheckedItemKeys]);

  const handleClearList = useCallback(() => {
    if (!window.confirm('Clear all selected recipes?')) return;
    setSelectedRecipes([]);
    setCheckedItemKeys([]);
  }, [setSelectedRecipes, setCheckedItemKeys]);

  const handleClearChecked = useCallback(() => {
    // Get current item keys from the merged list
    const currentItems = mergeIngredients(selectedRecipes);
    const currentKeys = new Set(currentItems.map((i) => itemKey(i.name, i.unit)));
    // Only remove keys that are in the current list
    setCheckedItemKeys((prev) => prev.filter((k) => !currentKeys.has(k)));
  }, [selectedRecipes, setCheckedItemKeys]);

  const handleViewDetail = useCallback((recipe: Recipe) => {
    setActiveRecipeDetail(recipe);
    setIsDetailOpen(true);
  }, []);

  const handleOpenAdd = () => {
    setEditingRecipe(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsAddEditOpen(true);
  };

  // Get the current multiplier for a recipe in the selected list
  const getSelectedMultiplier = (recipeId: string): number => {
    return selectedRecipes.find((sr) => sr.recipe.id === recipeId)?.servingMultiplier ?? 1;
  };

  // ---- Star rating ----
  const handleRateRecipe = useCallback((recipeId: string, rating: number) => {
    setRecipes((prev) =>
      prev.map((r) => r.id === recipeId ? { ...r, rating: rating || undefined } : r)
    );
    // Keep detail view in sync
    setActiveRecipeDetail((prev) =>
      prev?.id === recipeId ? { ...prev, rating: rating || undefined } : prev
    );
  }, [setRecipes]);

  // ---- Meal planner ----
  const handleAddMealPlanToList = useCallback((planRecipes: Recipe[]) => {
    planRecipes.forEach((recipe) => {
      if (!selectedIds.has(recipe.id)) handleAddToList(recipe, 1);
    });
    setActiveTab('shopping');
  }, [selectedIds, handleAddToList]);

  // ---- Import / Export ----
  const handleExport = () => {
    const json = JSON.stringify(recipes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "pattys-recipes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string) as Recipe[];
        if (!Array.isArray(imported) || !imported.every((r) => r.id && r.name)) {
          throw new Error('Invalid recipe file format');
        }
        if (window.confirm(`Import ${imported.length} recipes? Duplicates will be skipped.`)) {
          setRecipes((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            return [...prev, ...imported.filter((r) => !existingIds.has(r.id))];
          });
        }
      } catch (err: unknown) {
        alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // ---- Render helpers ----

  // Recipe grid (shared between Recipes and Favorites tabs)
  const renderRecipeGrid = (recipeList: Recipe[], emptyMessage: string) => {
    if (recipeList.length === 0) {
      return (
        <div className="text-center py-24 px-4">
          <div className="text-7xl mb-4">🍽️</div>
          <h3 className="font-display text-xl font-bold text-stone-600 mb-2">Nothing found</h3>
          <p className="text-stone-400 text-base leading-relaxed">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {recipeList.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isSelected={selectedIds.has(recipe.id)}
            isFavorite={favoriteSet.has(recipe.id)}
            onSelect={(r) => {
              if (selectedIds.has(r.id)) {
                handleRemoveFromList(r.id);
              } else {
                handleAddToList(r, 1);
              }
            }}
            onViewDetail={handleViewDetail}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    );
  };

  // ---- Main render ----

  return (
    <div className="min-h-screen bg-[#fdf8f0]">
      {/* Top navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shoppingListCount={shoppingListCount}
        selectedRecipesCount={selectedRecipes.length}
      />

      {/* Page content */}
      {/* pb-24 on mobile = room for fixed bottom tab bar */}
      <main className="max-w-7xl mx-auto px-4 pt-5 sm:pt-8 pb-28 sm:pb-8">

        {/* ---- RECIPES TAB ---- */}
        {activeTab === 'recipes' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: filter + recipe grid */}
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-display text-2xl font-bold text-stone-800">Browse Recipes</h2>
                  <p className="text-stone-400 text-sm mt-0.5">
                    {filteredRecipes.length} of {recipes.length} recipes
                  </p>
                </div>
                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={handleExport}
                    className="py-2 px-2.5 sm:px-3 bg-white border border-stone-200 text-stone-500 font-medium rounded-xl text-sm hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                    title="Export all recipes as JSON"
                  >
                    <span>📤</span>
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    onClick={() => importFileRef.current?.click()}
                    className="py-2 px-2.5 sm:px-3 bg-white border border-stone-200 text-stone-500 font-medium rounded-xl text-sm hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                    title="Import recipes from JSON file"
                  >
                    <span>📥</span>
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <button
                    onClick={handleOpenAdd}
                    className="py-2 px-3 sm:px-4 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <span>+</span>
                    <span className="hidden xs:inline sm:inline">Add Recipe</span>
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <FilterBar filters={filters} onFilterChange={setFilters} />

              {/* Recipe grid */}
              {renderRecipeGrid(
                filteredRecipes,
                filters.search || filters.difficulty !== 'All' || filters.proteinType !== 'All' || filters.mealType !== 'All' || filters.maxTime !== null || filters.minTime !== null || filters.favoritesOnly
                  ? 'Try adjusting your filters — something delicious is waiting!'
                  : 'Your recipe box is empty. Tap "Add Recipe" to start building your family cookbook!'
              )}
            </div>

            {/* Right: selected recipes panel */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0">
              <div className="sticky top-4">
                <SelectedRecipesPanel
                  selectedRecipes={selectedRecipes}
                  onUpdateMultiplier={handleUpdateMultiplier}
                  onRemove={handleRemoveFromList}
                  onViewShoppingList={() => setActiveTab('shopping')}
                />

                {/* Edit/Delete buttons for selected recipes */}
                {selectedRecipes.length > 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setActiveTab('shopping')}
                      className="text-primary-600 text-sm font-semibold hover:underline"
                    >
                      Open your full shopping list →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- PLANNER TAB ---- */}
        {activeTab === 'planner' && (
          <MealPlanner
            recipes={recipes}
            mealPlan={mealPlan}
            onUpdateMealPlan={setMealPlan}
            onAddToShoppingList={handleAddMealPlanToList}
          />
        )}

        {/* ---- SHOPPING TAB ---- */}
        {activeTab === 'shopping' && (
          <ShoppingList
            selectedRecipes={selectedRecipes}
            checkedItems={checkedSet}
            onToggleCheck={handleToggleCheck}
            onClearList={handleClearList}
            onClearChecked={handleClearChecked}
          />
        )}

        {/* ---- FAVORITES TAB ---- */}
        {activeTab === 'favorites' && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-stone-800 mb-1">⭐ Your Favorites</h2>
              <p className="text-stone-500 text-sm">
                {favoriteRecipes.length} favorite recipe{favoriteRecipes.length !== 1 ? 's' : ''}
              </p>
            </div>

            {favoriteRecipes.length === 0 ? (
              <div className="text-center py-24 px-4">
                <div className="text-7xl mb-4">⭐</div>
                <h3 className="font-display text-xl font-bold text-stone-600 mb-2">No favorites yet</h3>
                <p className="text-stone-400 text-base leading-relaxed">
                  Tap the ⭐ star on any recipe card to save your family's go-to meals here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {favoriteRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isSelected={selectedIds.has(recipe.id)}
                    isFavorite={true}
                    onSelect={(r) => {
                      if (selectedIds.has(r.id)) {
                        handleRemoveFromList(r.id);
                      } else {
                        handleAddToList(r, 1);
                      }
                    }}
                    onViewDetail={handleViewDetail}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---- MODALS ---- */}

      {/* Recipe Detail Modal */}
      <RecipeDetail
        recipe={activeRecipeDetail}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveRecipeDetail(null);
        }}
        isSelected={activeRecipeDetail ? selectedIds.has(activeRecipeDetail.id) : false}
        selectedMultiplier={activeRecipeDetail ? getSelectedMultiplier(activeRecipeDetail.id) : 1}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
        isFavorite={activeRecipeDetail ? favoriteSet.has(activeRecipeDetail.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onRateRecipe={handleRateRecipe}
      />

      {/* Add / Edit Recipe Modal */}
      <AddEditRecipe
        recipe={editingRecipe}
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingRecipe(null);
        }}
        onSave={handleSaveRecipe}
      />

      {/* Edit/Delete buttons accessible from detail modal */}
      {isDetailOpen && activeRecipeDetail && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex gap-3 no-print">
          <button
            onClick={() => {
              setIsDetailOpen(false);
              handleOpenEdit(activeRecipeDetail);
            }}
            className="py-2.5 px-5 bg-white text-gray-700 font-bold rounded-full shadow-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            ✏️ Edit Recipe
          </button>
          <button
            onClick={() => handleDeleteRecipe(activeRecipeDetail.id)}
            className="py-2.5 px-5 bg-white text-red-600 font-bold rounded-full shadow-xl text-sm border border-red-100 hover:bg-red-50 transition-colors"
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
