
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
  const currentServings = Math.round(defaultServings * multiplier * 10) / 10;

  // Quick preset buttons
  const presets = [
    { label: '½', value: 0.5 },
    { label: '1x', value: 1 },
    { label: '2x', value: 2 },
  ];

  const handleDecrement = () => {
    // Step down by 0.5, min 0.5
    const next = Math.max(0.5, Math.round((multiplier - 0.5) * 10) / 10);
    onChange(next);
  };

  const handleIncrement = () => {
    // Step up by 0.5, max 10
    const next = Math.min(10, Math.round((multiplier + 0.5) * 10) / 10);
    onChange(next);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDecrement}
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
          onClick={handleIncrement}
          disabled={multiplier >= 10}
          className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center hover:bg-primary-200 disabled:opacity-40 transition-colors"
          title="Increase servings"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-semibold text-gray-700">Servings:</span>
        <span className="text-lg font-bold text-primary-700">
          {currentServings} serving{currentServings !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick preset buttons */}
        <div className="flex gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange(preset.value)}
              className={`
                px-4 py-2 rounded-lg text-base font-bold border-2 transition-all
                ${multiplier === preset.value
                  ? 'bg-primary-500 border-primary-500 text-white shadow-md'
                  : 'bg-white border-primary-200 text-primary-700 hover:border-primary-400'
                }
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Manual +/- controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrement}
            disabled={multiplier <= 0.5}
            className="w-10 h-10 rounded-full bg-white border-2 border-primary-300 text-primary-700 font-bold text-xl flex items-center justify-center hover:bg-primary-100 disabled:opacity-40 transition-colors"
          >
            −
          </button>
          <span className="text-lg font-bold text-primary-700 min-w-[40px] text-center">
            {multiplier}x
          </span>
          <button
            onClick={handleIncrement}
            disabled={multiplier >= 10}
            className="w-10 h-10 rounded-full bg-white border-2 border-primary-300 text-primary-700 font-bold text-xl flex items-center justify-center hover:bg-primary-100 disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
