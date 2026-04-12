import { useState, useMemo } from 'react';
import { Recipe, MealPlan, MealPlanDay } from '../types';

// ============================================================
// PlanDayPicker: bottom-sheet modal for assigning a recipe
// to a specific day + meal slot in the weekly planner.
// Opened from the recipe card "Plan for Day" button.
// ============================================================

interface PlanDayPickerProps {
  recipe: Recipe;
  recipes: Recipe[];       // full list — used to look up names in occupied slots
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
const WEEK_RANGE_FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const DAY_DATE_FMT:   Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const day = today.getDay();
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
  return (
    days[0].toLocaleDateString('en-US', WEEK_RANGE_FMT) +
    ' – ' +
    days[6].toLocaleDateString('en-US', WEEK_RANGE_FMT)
  );
}

export default function PlanDayPicker({
  recipe,
  recipes,
  mealPlan,
  onSelect,
  onClose,
}: PlanDayPickerProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays  = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const todayKey  = dateKey(new Date());

  // O(1) recipe name lookup for occupied slots
  const recipeMap = useMemo(
    () => new Map(recipes.map((r) => [r.id, r])),
    [recipes]
  );

  const weekLabel =
    weekOffset === 0  ? 'This Week' :
    weekOffset === 1  ? 'Next Week' :
    weekOffset === -1 ? 'Last Week' :
    formatWeekRange(weekDays);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-slide-up bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden flex flex-col max-h-[85vh]">

        {/* ── Sticky header — outside the scroll container, always visible ── */}
        <div className="bg-amber-50 border-b border-amber-200 flex-shrink-0">

          {/* Title + recipe identity row */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Thumbnail — only rendered when the recipe has an image */}
              {recipe.image && (
                <img
                  src={recipe.image}
                  alt=""
                  className="flex-shrink-0 w-9 h-9 rounded-lg object-cover shadow-sm border border-amber-200"
                />
              )}
              <div className="min-w-0">
                <h3 className="font-display font-bold text-stone-800 text-base leading-tight">
                  Plan for Day
                </h3>
                {/* Recipe name — single line, ellipsis on overflow */}
                <p
                  className="text-xs text-stone-500 font-medium mt-0.5 truncate"
                  style={{ maxWidth: recipe.image ? '180px' : '220px' }}
                  title={recipe.name}
                >
                  {recipe.name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center text-stone-500 hover:bg-amber-100 transition-colors"
              aria-label="Close planner"
            >
              ✕
            </button>
          </div>

          {/* Week navigation */}
          <div className="px-4 pb-3 flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="flex-shrink-0 w-8 h-8 rounded-full border border-amber-200 bg-white hover:bg-amber-100 text-stone-600 flex items-center justify-center transition-colors text-sm font-bold"
              aria-label="Previous week"
            >
              ‹
            </button>

            <div className="flex-1 text-center">
              <p className="text-xs font-bold text-stone-700 leading-tight">{weekLabel}</p>
              {weekOffset !== 0 && (
                <p className="text-[10px] text-stone-400 leading-tight mt-0.5">
                  {formatWeekRange(weekDays)}
                </p>
              )}
            </div>

            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="flex-shrink-0 w-8 h-8 rounded-full border border-amber-200 bg-white hover:bg-amber-100 text-stone-600 flex items-center justify-center transition-colors text-sm font-bold"
              aria-label="Next week"
            >
              ›
            </button>
          </div>
        </div>

        {/* ── Day list — scrollable ── */}
        <div className="overflow-y-auto flex-1">
          {weekDays.map((day, i) => {
            const dk      = dateKey(day);
            const isToday = dk === todayKey;
            const dayPlan = mealPlan[dk];

            return (
              <div
                key={dk}
                className={`px-4 py-3 border-b border-amber-50 last:border-0 ${isToday ? 'bg-primary-50/40' : ''}`}
              >
                {/* Day label */}
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
                    const existingId     = dayPlan?.[mealKey];
                    const isThisRecipe   = existingId === recipe.id;
                    const hasOther       = !!existingId && !isThisRecipe;
                    const assignedRecipe = hasOther ? recipeMap.get(existingId!) : undefined;

                    return (
                      <button
                        key={mealKey}
                        onClick={() => onSelect(dk, mealKey, DAY_NAMES_FULL[i], label)}
                        aria-label={
                          `Plan ${recipe.name} for ${DAY_NAMES_FULL[i]} ${label}` +
                          (assignedRecipe ? ` (replaces ${assignedRecipe.name})` : '')
                        }
                        className={`
                          w-full px-1.5 py-2.5 rounded-xl text-xs font-semibold
                          flex flex-col items-center gap-0.5
                          transition-all duration-150 active:scale-[0.95]
                          ${isThisRecipe
                            ? 'bg-primary-500 text-white shadow-sm'
                            : hasOther
                              ? 'bg-amber-50 border-2 border-amber-300 text-amber-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700'
                              : 'bg-stone-50 border-2 border-stone-100 text-stone-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                          }
                        `}
                      >
                        {/* Icon */}
                        <span className="text-base leading-none">{icon}</span>

                        {/* Meal label */}
                        <span className="leading-snug">{label}</span>

                        {/* Assigned recipe name — only when another recipe occupies this slot */}
                        {assignedRecipe && (
                          <span
                            className="text-[10px] leading-tight opacity-70 w-full text-center"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                            title={assignedRecipe.name}
                          >
                            {assignedRecipe.name}
                          </span>
                        )}

                        {/* Status badges */}
                        {isThisRecipe && (
                          <span className="text-[10px] opacity-80 leading-none mt-0.5">✓ Set</span>
                        )}
                        {hasOther && (
                          <span className="text-[10px] opacity-80 leading-none mt-0.5">Replace</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/50 flex-shrink-0">
          <p className="text-xs text-stone-400 text-center">Tap a slot to schedule this recipe</p>
        </div>

      </div>
    </div>
  );
}
