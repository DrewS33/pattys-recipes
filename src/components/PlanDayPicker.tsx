import { useState, useMemo } from 'react';
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
const WEEK_RANGE_FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const DAY_DATE_FMT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const day = today.getDay(); // 0 = Sun
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
  return `${days[0].toLocaleDateString('en-US', WEEK_RANGE_FMT)} – ${days[6].toLocaleDateString('en-US', WEEK_RANGE_FMT)}`;
}

export default function PlanDayPicker({ recipe, mealPlan, onSelect, onClose }: PlanDayPickerProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const todayKey = dateKey(new Date());

  const weekLabel =
    weekOffset === 0 ? 'This Week' :
    weekOffset === 1 ? 'Next Week' :
    weekOffset === -1 ? 'Last Week' :
    formatWeekRange(weekDays);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-slide-up bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden flex flex-col max-h-[85vh]">

        {/* ── Sticky header — stays visible while day list scrolls ── */}
        <div className="bg-amber-50 border-b border-amber-200 flex-shrink-0">

          {/* Title row */}
          <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-stone-800 text-base leading-tight">
                Plan for Day
              </h3>
              {/* Recipe name — truncated with ellipsis, never wraps */}
              <p
                className="text-xs text-stone-500 mt-1 font-medium"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}
                title={recipe.name}
              >
                {recipe.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center text-stone-500 hover:bg-amber-100 transition-colors"
              aria-label="Close planner"
            >
              ✕
            </button>
          </div>

          {/* Week navigation row */}
          <div className="px-4 pb-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="w-8 h-8 rounded-full border border-amber-200 bg-white hover:bg-amber-100 text-stone-600 flex items-center justify-center transition-colors text-sm font-bold flex-shrink-0"
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
              className="w-8 h-8 rounded-full border border-amber-200 bg-white hover:bg-amber-100 text-stone-600 flex items-center justify-center transition-colors text-sm font-bold flex-shrink-0"
              aria-label="Next week"
            >
              ›
            </button>
          </div>

        </div>

        {/* ── Day list — scrollable ── */}
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

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/50 flex-shrink-0">
          <p className="text-xs text-stone-400 text-center">Tap a slot to schedule this recipe</p>
        </div>

      </div>
    </div>
  );
}
