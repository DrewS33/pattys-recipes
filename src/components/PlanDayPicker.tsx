import { useMemo } from 'react';
import { Recipe, MealPlan, MealPlanDay } from '../types';

// ============================================================
// PlanDayPicker: bottom-sheet modal for assigning a recipe
// to a specific day + meal slot in the weekly planner.
// Opened from the recipe card "Plan for Day" button.
// ============================================================

interface PlanDayPickerProps {
  recipe: Recipe;
  mealPlan: MealPlan;
  onSelect: (dateKey: string, meal: keyof MealPlanDay, dayLabel: string, mealLabel: string) => void;
  onClose: () => void;
}

const MEAL_SLOTS: Array<{ key: keyof MealPlanDay; label: string; icon: string }> = [
  { key: 'breakfast', label: 'Breakfast', icon: '☀️' },
  { key: 'lunch',     label: 'Lunch',     icon: '🌤️' },
  { key: 'dinner',    label: 'Dinner',    icon: '🌙' },
];

const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getWeekDays(): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMon);
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

const DAY_DATE_FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

export default function PlanDayPicker({ recipe, mealPlan, onSelect, onClose }: PlanDayPickerProps) {
  const weekDays = useMemo(() => getWeekDays(), []);
  const todayKey = dateKey(new Date());

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-slide-up bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-stone-800 text-base leading-tight">Plan for Day</h3>
            <p className="text-xs text-stone-500 mt-1 truncate">{recipe.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center text-stone-500 hover:bg-amber-100 transition-colors"
            aria-label="Close planner"
          >
            ✕
          </button>
        </div>

        {/* Day list — scrollable */}
        <div className="overflow-y-auto flex-1">
          {weekDays.map((day, i) => {
            const dk = dateKey(day);
            const isToday = dk === todayKey;
            const dayPlan = mealPlan[dk];

            return (
              <div
                key={dk}
                className={`px-4 py-3 border-b border-amber-50 last:border-0 ${isToday ? 'bg-primary-50/40' : ''}`}
              >
                {/* Day label row */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-sm font-bold ${isToday ? 'text-primary-700' : 'text-stone-700'}`}>
                    {DAY_NAMES_FULL[i]}
                  </span>
                  <span className="text-xs text-stone-400">
                    {day.toLocaleDateString('en-US', DAY_DATE_FMT)}
                  </span>
                  {isToday && (
                    <span className="text-xs font-bold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>

                {/* Meal slot buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {MEAL_SLOTS.map(({ key: mealKey, label, icon }) => {
                    const existingId = dayPlan?.[mealKey];
                    const isThisRecipe = existingId === recipe.id;
                    const hasOther = !!existingId && !isThisRecipe;

                    return (
                      <button
                        key={mealKey}
                        onClick={() => onSelect(dk, mealKey, DAY_NAMES_FULL[i], label)}
                        aria-label={`Plan ${recipe.name} for ${DAY_NAMES_FULL[i]} ${label}${hasOther ? ' (replaces current)' : ''}`}
                        className={`
                          py-2.5 px-1 rounded-xl text-xs font-semibold
                          flex flex-col items-center gap-1
                          transition-all duration-150 active:scale-[0.95]
                          min-h-[60px] justify-center
                          ${isThisRecipe
                            ? 'bg-primary-500 text-white shadow-sm'
                            : hasOther
                              ? 'bg-amber-50 border-2 border-amber-300 text-amber-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700'
                              : 'bg-stone-50 border-2 border-stone-100 text-stone-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                          }
                        `}
                      >
                        <span className="text-base leading-none">{icon}</span>
                        <span className="leading-none">{label}</span>
                        {isThisRecipe && (
                          <span className="text-[10px] opacity-80 leading-none">✓ Set</span>
                        )}
                        {hasOther && (
                          <span className="text-[10px] opacity-70 leading-none">Replace</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/50 flex-shrink-0">
          <p className="text-xs text-stone-400 text-center">Tap a slot to schedule this recipe</p>
        </div>

      </div>
    </div>
  );
}
