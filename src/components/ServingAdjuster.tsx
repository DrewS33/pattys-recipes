
// ============================================================
// ServingAdjuster: lets the user scale serving sizes
// ============================================================

interface ServingAdjusterProps {
  defaultServings: number;
  multiplier: number;
  onChange: (multiplier: number) => void;
  compact?: boolean; // compact mode for use in SelectedRecipesPanel
}

export default function ServingAdjuster({
  defaultServings,
  multiplier,
  onChange,
  compact = false,
}: ServingAdjusterProps) {
  const safeDefault = Math.max(1, defaultServings);
  const currentServings = Math.max(1, Math.round(safeDefault * multiplier));

  // ── Compact mode (used in SelectedRecipesPanel) ─────────────
  // Steps by 0.5x multiplier — kept separate from the full-mode logic.
  const handleCompactDecrement = () => {
    const next = Math.max(0.5, Math.round((multiplier - 0.5) * 10) / 10);
    onChange(next);
  };
  const handleCompactIncrement = () => {
    const next = Math.min(10, Math.round((multiplier + 0.5) * 10) / 10);
    onChange(next);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleCompactDecrement}
          disabled={multiplier <= 0.5}
          className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center hover:bg-primary-200 disabled:opacity-40 transition-colors"
          title="Decrease servings"
        >
          −
        </button>
        <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-center">
          {currentServings} srv
        </span>
        <button
          onClick={handleCompactIncrement}
          disabled={multiplier >= 10}
          className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center hover:bg-primary-200 disabled:opacity-40 transition-colors"
          title="Increase servings"
        >
          +
        </button>
      </div>
    );
  }

  // ── Full mode (used in RecipeDetail) ─────────────────────────
  // Steps by 1 whole serving; minimum 1 serving.
  const handleDecrement = () => {
    const next = Math.max(1, currentServings - 1);
    onChange(next / safeDefault);
  };
  const handleIncrement = () => {
    onChange((currentServings + 1) / safeDefault);
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
      <span className="text-sm font-semibold text-stone-500">Servings</span>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDecrement}
          disabled={currentServings <= 1}
          className="w-9 h-9 rounded-full border border-stone-200 text-stone-500 font-bold text-lg flex items-center justify-center hover:bg-stone-100 disabled:opacity-40 transition-colors"
          title="Decrease servings"
        >
          −
        </button>
        <span className="text-base font-bold text-stone-700 min-w-[2rem] text-center">
          {currentServings}
        </span>
        <button
          onClick={handleIncrement}
          className="w-9 h-9 rounded-full border border-stone-200 text-stone-500 font-bold text-lg flex items-center justify-center hover:bg-stone-100 transition-colors"
          title="Increase servings"
        >
          +
        </button>
      </div>
    </div>
  );
}
