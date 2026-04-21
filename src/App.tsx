import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useToast } from './contexts/ToastContext';
import { MealPlanDay } from './types';
import { Recipe, SelectedRecipe, Filters, MealPlan } from './types';
import { useAuth } from './contexts/AuthContext';
import { useRecipes } from './hooks/useRecipes';
import { useShoppingSelections } from './hooks/useShoppingSelections';
import { useShoppingState } from './hooks/useShoppingState';
import { usePlanner } from './hooks/usePlanner';
import { usePantry } from './hooks/usePantry';
import { useStorePreferences } from './hooks/useStorePreferences';
import { checkMigrationNeeded, performMigration, declineMigration, LocalStorageSnapshot } from './lib/migration';
import AuthPage from './components/AuthPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import MigrationPrompt from './components/MigrationPrompt';
import Navigation from './components/Navigation';
import FilterBar from './components/FilterBar';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import SelectedRecipesPanel from './components/SelectedRecipesPanel';
import ShoppingList from './components/ShoppingList';
import AddEditRecipe from './components/AddEditRecipe';
import MealPlanner from './components/MealPlanner';
import Pantry from './components/Pantry';
import PlanDayPicker from './components/PlanDayPicker';
import StorePreferencesModal from './components/StorePreferencesModal';
import { mergeIngredients } from './utils/ingredientMerger';
import { isPantryStaple } from './utils/pantryUtils';

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
  const { user, loading: authLoading, isRecovery, signOut } = useAuth();

  // ---- Migration gate state ----
  const [migrationState, setMigrationState] = useState<'checking' | 'prompt' | 'done'>('checking');
  const [migrationSnapshot, setMigrationSnapshot] = useState<LocalStorageSnapshot | null>(null);

  // Run migration check once after the user is confirmed signed in
  useEffect(() => {
    if (!user) return;

    checkMigrationNeeded(user.id).then((snapshot) => {
      if (snapshot) {
        setMigrationSnapshot(snapshot);
        setMigrationState('prompt');
      } else {
        setMigrationState('done');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ---- Cloud data hooks ----
  const {
    recipes,
    loading: recipesLoading,
    saveRecipe,
    deleteRecipe,
    toggleFavorite,
    rateRecipe,
    reloadRecipes,
    enableSharing,
    restoreDefaultRecipes,
  } = useRecipes();

  const {
    selectedRecipes,
    addToList,
    removeFromList,
    updateMultiplier,
    clearSelections,
  } = useShoppingSelections(recipes);

  const {
    checkedItemKeys,
    toggleCheck,
    clearChecked,
    clearAllChecked,
  } = useShoppingState();

  const { mealPlan, setMealPlan } = usePlanner();

  const { pantryItems, updatePantry } = usePantry();

  const { storePreferences, updateStorePreferences, setIngredientStore } = useStorePreferences();

  // Defensive: always have ingredientOverrides defined
  const safeStorePrefs = {
    ...storePreferences,
    ingredientOverrides: storePreferences.ingredientOverrides ?? {},
  };

  // ---- Local (non-persisted) UI state ----

  const [activeTab, setActiveTab] = useState<'recipes' | 'shopping' | 'pantry' | 'planner'>('recipes');
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeRecipeDetail, setActiveRecipeDetail] = useState<Recipe | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const { addToast } = useToast();

  // Plan-for-day shortcut state
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);

  // Keep the detail modal in sync when a recipe is edited/rated/favorited
  useEffect(() => {
    if (activeRecipeDetail) {
      const updated = recipes.find((r) => r.id === activeRecipeDetail.id);
      if (updated) setActiveRecipeDetail(updated);
    }
  // Only run when the recipes array changes, not on detail open/close
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes]);

  // ---- Derived state ----

  // Favorites derived from the recipe's .favorite field (source of truth is now Supabase)
  const favoriteIds = useMemo(() => recipes.filter((r) => r.favorite).map((r) => r.id), [recipes]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const checkedSet = useMemo(() => new Set(checkedItemKeys), [checkedItemKeys]);

  const selectedIds = useMemo(
    () => new Set(selectedRecipes.map((sr) => sr.recipe.id)),
    [selectedRecipes]
  );

  // O(1) recipe lookup by ID (used for planner → shopping sync)
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  // All recipes currently assigned anywhere in the meal plan
  const plannerSelectedRecipes = useMemo((): SelectedRecipe[] => {
    const seen = new Set<string>();
    const result: SelectedRecipe[] = [];
    for (const dayPlan of Object.values(mealPlan)) {
      for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
        const id = dayPlan[meal];
        if (id && !seen.has(id)) {
          seen.add(id);
          const recipe = recipeMap.get(id);
          if (recipe) result.push({ recipe, servingMultiplier: 1 });
        }
      }
    }
    return result;
  }, [mealPlan, recipeMap]);

  // Combined shopping list: manual selections + planner recipes (deduped, manual takes priority)
  const allShoppingRecipes = useMemo((): SelectedRecipe[] => {
    const manualIds = new Set(selectedRecipes.map((sr) => sr.recipe.id));
    const plannerOnly = plannerSelectedRecipes.filter((sr) => !manualIds.has(sr.recipe.id));
    return [...selectedRecipes, ...plannerOnly];
  }, [selectedRecipes, plannerSelectedRecipes]);

  // Count of planner-only additions (for the shopping list banner)
  const plannerOnlyCount = useMemo(
    () => plannerSelectedRecipes.filter((sr) => !selectedIds.has(sr.recipe.id)).length,
    [plannerSelectedRecipes, selectedIds]
  );

  // Shopping list count (for nav badge — excludes pantry staples)
  const shoppingListCount = useMemo(() => {
    return mergeIngredients(allShoppingRecipes).filter(
      (item) => !isPantryStaple(item.name, pantryItems)
    ).length;
  }, [allShoppingRecipes, pantryItems]);

  // ---- Filtering ----

  const getFilteredRecipes = useCallback(
    (sourceRecipes: Recipe[]) => {
      return sourceRecipes.filter((r) => {
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

  const filteredRecipes = useMemo(() => getFilteredRecipes(recipes), [getFilteredRecipes, recipes]);

  // ---- Handlers ----

  const handleAddToList = useCallback((recipe: Recipe, multiplier: number) => {
    addToList(recipe, multiplier);
  }, [addToList]);

  const handleRemoveFromList = useCallback((recipeId: string) => {
    removeFromList(recipeId);
  }, [removeFromList]);

  const handleUpdateMultiplier = useCallback((recipeId: string, multiplier: number) => {
    updateMultiplier(recipeId, multiplier);
  }, [updateMultiplier]);

  const handleToggleFavorite = useCallback((recipeId: string) => {
    toggleFavorite(recipeId);
  }, [toggleFavorite]);

  const handleSaveRecipe = useCallback((recipe: Recipe) => {
    saveRecipe(recipe);
    addToast(`✅ ${recipe.name} saved`);
  }, [saveRecipe, addToast]);

  const handleDeleteRecipe = useCallback((recipeId: string) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    const name = recipes.find((r) => r.id === recipeId)?.name;
    deleteRecipe(recipeId);
    removeFromList(recipeId);
    setIsDetailOpen(false);
    setActiveRecipeDetail(null);
    if (name) addToast(`🗑️ ${name} deleted`);
  }, [deleteRecipe, removeFromList, recipes, addToast]);

  const handleToggleCheck = useCallback((key: string) => {
    toggleCheck(key);
  }, [toggleCheck]);

  const handleClearList = useCallback(async () => {
    if (!window.confirm('Clear all selected recipes?')) return;
    await clearSelections();
    await clearAllChecked();
  }, [clearSelections, clearAllChecked]);

  const handleSetIngredientStore = useCallback((normalizedName: string, storeId: string) => {
    setIngredientStore(normalizedName, storeId);
  }, [setIngredientStore]);

  const handleClearChecked = useCallback(() => {
    const currentItems = mergeIngredients(allShoppingRecipes);
    const currentKeys = new Set(currentItems.map((i) => itemKey(i.name, i.unit)));
    clearChecked(currentKeys);
  }, [allShoppingRecipes, clearChecked]);

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

  const getSelectedMultiplier = (recipeId: string): number => {
    return selectedRecipes.find((sr) => sr.recipe.id === recipeId)?.servingMultiplier ?? 1;
  };

  // ---- Star rating ----
  const handleRateRecipe = useCallback((recipeId: string, rating: number) => {
    rateRecipe(recipeId, rating);
  }, [rateRecipe]);

  // ---- Plan-for-day shortcut ----
  const handleAssignToPlanner = useCallback(
    (dateKey: string, meal: keyof MealPlanDay, dayLabel: string, mealLabel: string) => {
      if (!planningRecipe) return;
      const updated: MealPlan = {
        ...mealPlan,
        [dateKey]: { ...mealPlan[dateKey], [meal]: planningRecipe.id },
      };
      setMealPlan(updated);
      setPlanningRecipe(null);
      addToast(`📅 Planned for ${dayLabel} ${mealLabel.toLowerCase()}`);
    },
    [planningRecipe, mealPlan, setMealPlan, addToast]
  );

  // ---- Meal planner ----
  const handleAddMealPlanToList = useCallback((planRecipes: Recipe[]) => {
    const toAdd = planRecipes.filter((r) => !selectedIds.has(r.id));
    toAdd.forEach((r) => addToList(r, 1));
    if (toAdd.length > 0) {
      addToast(`🛒 ${toAdd.length} recipe${toAdd.length !== 1 ? 's' : ''} added to shopping list`);
    }
    setActiveTab('shopping');
  }, [selectedIds, addToList, addToast]);

  // ---- Restore default recipes ----
  const [restoringDefaults, setRestoringDefaults] = useState(false);

  const handleRestoreDefaults = useCallback(async () => {
    setRestoringDefaults(true);
    try {
      const added = await restoreDefaultRecipes();
      if (added) {
        addToast('Default recipes restored');
      } else {
        addToast('All default recipes are already present');
      }
    } finally {
      setRestoringDefaults(false);
    }
  }, [restoreDefaultRecipes, addToast]);

  // ---- Import / Export ----
  const handleExport = () => {
    const json = JSON.stringify(recipes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pattys-recipes.json';
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
          const existingIds = new Set(recipes.map((r) => r.id));
          imported
            .filter((r) => !existingIds.has(r.id))
            .forEach((r) => saveRecipe(r));
        }
      } catch (err: unknown) {
        alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // ---- Render helpers ----

  const renderRecipeGrid = (recipeList: Recipe[], emptyMessage: string) => {
    if (recipesLoading) {
      return (
        <div className="text-center py-24 px-4">
          <div className="text-5xl mb-4 animate-pulse">🍳</div>
          <p className="text-stone-400 text-base">Loading your recipes…</p>
        </div>
      );
    }

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
                addToast(`✅ ${r.name} added to list`);
              }
            }}
            onViewDetail={handleViewDetail}
            onToggleFavorite={handleToggleFavorite}
            onPlanForDay={setPlanningRecipe}
          />
        ))}
      </div>
    );
  };

  // ---- Auth / migration gate ----

  // Still initializing the session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fdf8f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍽️</div>
          <p className="text-stone-400">Loading…</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) return <AuthPage />;

  // Opened via a password-reset email link — show the set-new-password screen
  if (isRecovery) return <ResetPasswordPage />;

  // Migration check in progress
  if (migrationState === 'checking') {
    return (
      <div className="min-h-screen bg-[#fdf8f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍽️</div>
          <p className="text-stone-400">Loading your recipes…</p>
        </div>
      </div>
    );
  }

  // Migration prompt
  if (migrationState === 'prompt' && migrationSnapshot) {
    return (
      <MigrationPrompt
        snapshot={migrationSnapshot}
        onAccept={async () => {
          await performMigration(user.id, migrationSnapshot);
          await reloadRecipes();
          setMigrationState('done');
        }}
        onDecline={async () => {
          await declineMigration(user.id);
          await reloadRecipes();
          setMigrationState('done');
        }}
      />
    );
  }

  // ---- Main render ----

  return (
    <div className="min-h-screen bg-[#fdf8f0]">
      {/* Top navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shoppingListCount={shoppingListCount}
        selectedRecipesCount={selectedRecipes.length}
        onSignOut={signOut}
        userEmail={user.email}
      />

      {/* Page content */}
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
                    onClick={handleRestoreDefaults}
                    disabled={restoringDefaults}
                    className="py-2 px-2.5 sm:px-3 bg-white border border-stone-200 text-stone-500 font-medium rounded-xl text-sm hover:bg-stone-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Restore any missing Patty default recipes (won't touch your own recipes or duplicates)"
                  >
                    <span>🔄</span>
                    <span className="hidden sm:inline">{restoringDefaults ? 'Restoring…' : 'Restore Defaults'}</span>
                  </button>
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
                filters.search ||
                  filters.difficulty !== 'All' ||
                  filters.proteinType !== 'All' ||
                  filters.mealType !== 'All' ||
                  filters.maxTime !== null ||
                  filters.minTime !== null ||
                  filters.favoritesOnly
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
            selectedRecipes={allShoppingRecipes}
            plannerRecipeCount={plannerOnlyCount}
            checkedItems={checkedSet}
            onToggleCheck={handleToggleCheck}
            onClearList={handleClearList}
            onClearChecked={handleClearChecked}
            pantryItems={pantryItems}
            storePreferences={safeStorePrefs}
            onOpenStoreSettings={() => setShowStoreSettings(true)}
            onSetIngredientStore={handleSetIngredientStore}
          />
        )}

        {/* ---- PANTRY TAB ---- */}
        {activeTab === 'pantry' && (
          <Pantry
            pantryItems={pantryItems}
            onUpdatePantry={updatePantry}
          />
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
        onShare={enableSharing}
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

      {/* Plan for Day modal */}
      {planningRecipe && (
        <PlanDayPicker
          recipe={planningRecipe}
          recipes={recipes}
          mealPlan={mealPlan}
          onSelect={handleAssignToPlanner}
          onClose={() => setPlanningRecipe(null)}
        />
      )}

      {/* Store Preferences Modal */}
      {showStoreSettings && (
        <StorePreferencesModal
          prefs={safeStorePrefs}
          onChange={updateStorePreferences}
          onClose={() => setShowStoreSettings(false)}
        />
      )}

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
