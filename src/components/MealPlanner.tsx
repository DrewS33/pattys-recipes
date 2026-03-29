import { useState, useMemo } from 'react';
import { Recipe, MealPlan, MealPlanDay } from '../types';

// ============================================================
// MealPlanner: weekly calendar for planning meals
// ============================================================

interface MealPlannerProps {
  recipes: Recipe[];
  mealPlan: MealPlan;
  onUpdateMealPlan: (plan: MealPlan) => void;
  onAddToShoppingList: (recipes: Recipe[]) => void;
}

const MEAL_SLOTS: Array<{ key: keyof MealPlanDay; label: string; icon: string }> = [
  { key: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { key: 'lunch',     label: 'Lunch',     icon: '🌤️' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMon + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatWeekRange(days: Date[]): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${days[0].toLocaleDateString('en-US', opts)} – ${days[6].toLocaleDateString('en-US', opts)}`;
}

interface PickerState {
  dateKey: string;
  meal: keyof MealPlanDay;
  dayLabel: string;
  mealLabel: string;
}

export default function MealPlanner({
  recipes,
  mealPlan,
  onUpdateMealPlan,
  onAddToShoppingList,
}: MealPlannerProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  // Recipes planned this week (for "Add to list" button)
  const weekRecipes = useMemo(() => {
    const ids = new Set<string>();
    for (const day of weekDays) {
      const dayPlan = mealPlan[dateKey(day)];
      if (!dayPlan) continue;
      for (const slot of MEAL_SLOTS) {
        const id = dayPlan[slot.key];
        if (id) ids.add(id);
      }
    }
    return recipes.filter((r) => ids.has(r.id));
  }, [weekDays, mealPlan, recipes]);

  const today = dateKey(new Date());

  function setMeal(dk: string, meal: keyof MealPlanDay, recipeId: string | undefined) {
    const updated = {
      ...mealPlan,
      [dk]: { ...mealPlan[dk], [meal]: recipeId },
    };
    // Clean up empty days
    if (!updated[dk].breakfast && !updated[dk].lunch && !updated[dk].dinner) {
      const { [dk]: _, ...rest } = updated;
      onUpdateMealPlan(rest);
    } else {
      onUpdateMealPlan(updated);
    }
  }

  function getRecipe(id?: string): Recipe | undefined {
    return id ? recipes.find((r) => r.id === id) : undefined;
  }

  const filteredForPicker = useMemo(() => {
    if (!pickerSearch.trim()) return recipes;
    const q = pickerSearch.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.proteinType.toLowerCase().includes(q) ||
        r.mealType.toLowerCase().includes(q)
    );
  }, [recipes, pickerSearch]);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-stone-800">📅 Meal Planner</h2>
            <p className="text-stone-500 text-sm mt-0.5">Plan your week, then build your shopping list</p>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="w-9 h-9 rounded-full border border-amber-200 bg-white hover:bg-amber-50 text-stone-600 flex items-center justify-center transition-colors"
            >
              ‹
            </button>
            <div className="text-center min-w-[120px] sm:min-w-[160px]">
              <p className="text-sm font-bold text-stone-700">
                {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
              </p>
              <p className="text-xs text-stone-400">{formatWeekRange(weekDays)}</p>
            </div>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="w-9 h-9 rounded-full border border-amber-200 bg-white hover:bg-amber-50 text-stone-600 flex items-center justify-center transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {/* Add to shopping list — full width on mobile */}
        {weekRecipes.length > 0 && (
          <button
            onClick={() => onAddToShoppingList(weekRecipes)}
            className="w-full sm:w-auto py-3 sm:py-2.5 px-5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            🛒 Add {weekRecipes.length} recipe{weekRecipes.length !== 1 ? 's' : ''} to shopping list
          </button>
        )}
      </div>

      {/* ── Desktop calendar grid (hidden on mobile) ── */}
      <div className="hidden sm:block overflow-x-auto pb-2">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div /> {/* meal label column */}
            {weekDays.map((day, i) => {
              const dk = dateKey(day);
              const isToday = dk === today;
              return (
                <div key={dk} className="text-center">
                  <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-primary-600' : 'text-stone-400'}`}>
                    {DAY_NAMES[i]}
                  </p>
                  <p className={`text-lg font-display font-bold ${isToday ? 'text-primary-700' : 'text-stone-700'}`}>
                    {day.getDate()}
                  </p>
                  {isToday && <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mx-auto mt-0.5" />}
                </div>
              );
            })}
          </div>

          {/* Meal rows */}
          {MEAL_SLOTS.map(({ key: mealKey, label, icon }) => (
            <div key={mealKey} className="grid grid-cols-8 gap-2 mb-2">
              {/* Meal label */}
              <div className="flex items-center gap-1.5 pr-2">
                <span className="text-base">{icon}</span>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{label}</span>
              </div>

              {/* Day cells */}
              {weekDays.map((day, i) => {
                const dk = dateKey(day);
                const recipe = getRecipe(mealPlan[dk]?.[mealKey]);

                return (
                  <div key={dk} className="min-h-[64px]">
                    {recipe ? (
                      <div className="h-full bg-white border border-primary-200 rounded-xl p-2 flex flex-col justify-between group hover:border-primary-400 transition-colors">
                        <p
                          className="text-xs font-semibold text-stone-700 leading-tight line-clamp-2 cursor-pointer"
                          onClick={() =>
                            setPicker({ dateKey: dk, meal: mealKey, dayLabel: DAY_NAMES_FULL[i], mealLabel: label })
                          }
                        >
                          {recipe.name}
                        </p>
                        <button
                          onClick={() => setMeal(dk, mealKey, undefined)}
                          className="text-xs text-stone-300 hover:text-red-400 self-end transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setPickerSearch('');
                          setPicker({ dateKey: dk, meal: mealKey, dayLabel: DAY_NAMES_FULL[i], mealLabel: label });
                        }}
                        className="w-full h-full min-h-[64px] border-2 border-dashed border-amber-200 rounded-xl text-stone-300 hover:border-primary-300 hover:text-primary-400 hover:bg-primary-50 transition-all text-lg flex items-center justify-center"
                        title={`Add ${label} for ${DAY_NAMES_FULL[i]}`}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile day-card list (hidden on desktop) ── */}
      <div className="sm:hidden space-y-3">
        {weekDays.map((day, i) => {
          const dk = dateKey(day);
          const isToday = dk === today;
          return (
            <div
              key={dk}
              className={`rounded-2xl border overflow-hidden ${
                isToday ? 'border-primary-300 shadow-card' : 'border-amber-100 bg-white'
              }`}
            >
              {/* Day header */}
              <div className={`px-4 py-2.5 flex items-center gap-2 ${isToday ? 'bg-primary-50' : 'bg-amber-50/60'}`}>
                <span className={`font-display font-bold text-lg ${isToday ? 'text-primary-700' : 'text-stone-700'}`}>
                  {day.getDate()}
                </span>
                <span className={`text-sm font-semibold ${isToday ? 'text-primary-600' : 'text-stone-500'}`}>
                  {DAY_NAMES_FULL[i]}
                </span>
                {isToday && (
                  <span className="ml-auto text-xs font-bold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">Today</span>
                )}
              </div>

              {/* Meal slots */}
              <div className="divide-y divide-amber-50">
                {MEAL_SLOTS.map(({ key: mealKey, label, icon }) => {
                  const recipe = getRecipe(mealPlan[dk]?.[mealKey]);
                  return (
                    <div key={mealKey} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-base w-6 flex-shrink-0">{icon}</span>
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wide w-16 flex-shrink-0">{label}</span>
                      {recipe ? (
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setPickerSearch('');
                              setPicker({ dateKey: dk, meal: mealKey, dayLabel: DAY_NAMES_FULL[i], mealLabel: label });
                            }}
                            className="flex-1 text-left text-sm font-semibold text-stone-700 leading-tight"
                          >
                            {recipe.name}
                          </button>
                          <button
                            onClick={() => setMeal(dk, mealKey, undefined)}
                            className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-100 text-stone-400 hover:bg-red-100 hover:text-red-400 flex items-center justify-center text-xs transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPickerSearch('');
                            setPicker({ dateKey: dk, meal: mealKey, dayLabel: DAY_NAMES_FULL[i], mealLabel: label });
                          }}
                          className="flex-1 py-2 border-2 border-dashed border-amber-200 rounded-xl text-stone-300 hover:border-primary-300 hover:text-primary-400 hover:bg-primary-50 transition-all text-sm flex items-center justify-center gap-1"
                        >
                          <span>+</span>
                          <span>Add {label}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {weekRecipes.length === 0 && (
        <div className="text-center py-8 text-stone-400 text-sm italic">
          Click any + to plan a meal for this week
        </div>
      )}

      {/* Recipe picker modal */}
      {picker && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setPicker(null)}
        >
          <div className="modal-slide-up bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Picker header */}
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-stone-800">
                  {picker.mealLabel} — {picker.dayLabel}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">Pick a recipe</p>
              </div>
              <button
                onClick={() => setPicker(null)}
                className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center text-stone-500 hover:bg-amber-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-4">
              <input
                autoFocus
                type="text"
                placeholder="Search recipes..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-amber-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 transition-colors bg-amber-50/50"
              />
            </div>

            {/* Recipe list */}
            <div className="overflow-y-auto max-h-80 px-4 py-3 space-y-1.5">
              {filteredForPicker.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">No recipes match</p>
              ) : (
                filteredForPicker.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => {
                      setMeal(picker.dateKey, picker.meal, recipe.id);
                      setPicker(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-amber-100 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    <p className="font-semibold text-stone-800 text-sm">{recipe.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {recipe.proteinType} · {recipe.mealType} · {recipe.totalTimeMinutes}m
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* Clear option if slot is filled */}
            {mealPlan[picker.dateKey]?.[picker.meal] && (
              <div className="px-4 pb-4 border-t border-amber-100 pt-3">
                <button
                  onClick={() => {
                    setMeal(picker.dateKey, picker.meal, undefined);
                    setPicker(null);
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Remove this meal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
