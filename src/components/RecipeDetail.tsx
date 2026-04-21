import { useState, useEffect, useCallback } from 'react';
import { Recipe } from '../types';
import StarRating from './StarRating';
import { formatQuantity } from '../utils/ingredientMerger';
import ServingAdjuster from './ServingAdjuster';

// ============================================================
// RecipeDetail: full-screen modal showing all recipe details
// ============================================================

interface RecipeDetailProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  isSelected: boolean;
  selectedMultiplier: number;
  onAddToList: (recipe: Recipe, multiplier: number) => void;
  onRemoveFromList: (recipeId: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onRateRecipe: (recipeId: string, rating: number) => void;
  onShare?: (recipeId: string) => Promise<string | null>;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800',
};

function toRoman(num: number): string {
  const vals = [10, 9, 5, 4, 1];
  const syms = ['X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RecipeDetail({
  recipe,
  isOpen,
  onClose,
  isSelected,
  selectedMultiplier,
  onAddToList,
  onRemoveFromList,
  isFavorite,
  onToggleFavorite,
  onRateRecipe,
  onShare,
}: RecipeDetailProps) {
  // Local multiplier state — initialized from selectedMultiplier or 1
  const [multiplier, setMultiplier] = useState(selectedMultiplier || 1);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    if (!recipe || !onShare) return;
    setShareStatus('copying');
    setShareFallbackUrl(null);

    const shareId = await onShare(recipe.id);
    if (!shareId) {
      // enableSharing failed — likely the SQL columns haven't been added yet
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
      return;
    }

    const url = `${window.location.origin}${import.meta.env.BASE_URL}?share=${shareId}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.name, url });
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
      } catch {
        // User dismissed the native share sheet — show URL as manual fallback
        setShareFallbackUrl(url);
        setShareStatus('idle');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // Clipboard not available — show URL so user can copy manually
      setShareFallbackUrl(url);
      setShareStatus('idle');
    }
  }, [recipe, onShare]);

  // Sync local multiplier when modal opens or selectedMultiplier changes
  useEffect(() => {
    setMultiplier(selectedMultiplier > 0 ? selectedMultiplier : 1);
  }, [selectedMultiplier, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !recipe) return null;

  const currentServings = Math.round(recipe.defaultServings * multiplier * 10) / 10;

  const handlePrint = () => window.print();

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-start justify-center sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal panel — full-screen sheet on mobile, centered card on desktop */}
      <div className="bg-white w-full max-w-3xl sm:rounded-2xl shadow-2xl sm:my-4 overflow-hidden
                      rounded-t-2xl max-h-[92vh] overflow-y-auto">

        {/* Photo banner (if available) */}
        {recipe.image && (
          <div className="h-48 overflow-hidden">
            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-800 leading-tight mb-1">{recipe.name}</h2>
              <div className="mb-2">
                <StarRating
                  rating={recipe.rating}
                  size="lg"
                  onChange={(r) => onRateRecipe(recipe.id, r)}
                />
              </div>
              <p className="text-stone-500 text-base leading-relaxed">{recipe.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Share button */}
              {onShare && (
                <button
                  onClick={handleShare}
                  disabled={shareStatus === 'copying'}
                  className={`
                    h-11 rounded-full flex items-center justify-center text-sm font-semibold transition-all border px-3 gap-1.5
                    ${shareStatus === 'copied'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : shareStatus === 'error'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-white hover:bg-amber-100 border-amber-200 text-stone-600'}
                  `}
                  title="Share recipe"
                >
                  {shareStatus === 'copied' ? '✓ Copied!'
                    : shareStatus === 'copying' ? '…'
                    : shareStatus === 'error' ? '⚠️ Setup needed'
                    : '🔗 Share'}
                </button>
              )}
              {/* Favorite button */}
              <button
                onClick={() => onToggleFavorite(recipe.id)}
                className={`
                  w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all
                  ${isFavorite ? 'bg-yellow-400 hover:bg-yellow-300' : 'bg-white hover:bg-amber-100 border border-amber-200'}
                `}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? '⭐' : '☆'}
              </button>
              {/* Close button */}
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-full bg-white hover:bg-amber-100 border border-amber-200 flex items-center justify-center text-lg text-stone-600 transition-all"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Share fallback — shown when clipboard is unavailable */}
          {shareFallbackUrl && (
            <div className="mt-3 flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-xs text-stone-500 shrink-0">Share link:</span>
              <input
                readOnly
                value={shareFallbackUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 text-xs text-primary-700 bg-transparent outline-none truncate"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(shareFallbackUrl).catch(() => {}); setShareFallbackUrl(null); setShareStatus('copied'); setTimeout(() => setShareStatus('idle'), 2000); }}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 shrink-0"
              >
                Copy
              </button>
            </div>
          )}

          {/* Tags row */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
              {recipe.difficulty}
            </span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-primary-100 text-primary-700">
              {recipe.proteinType}
            </span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
              {recipe.mealType}
            </span>
            {recipe.tags.map((tag) => (
              <span key={tag} className="text-sm px-3 py-1 rounded-full bg-stone-100 text-stone-600">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Info bar */}
        <div className="bg-white px-6 py-3 grid grid-cols-4 gap-2 border-b border-amber-100">
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Prep</p>
            <p className="text-sm sm:text-base font-bold text-gray-800">{formatTime(recipe.prepTimeMinutes)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Cook</p>
            <p className="text-sm sm:text-base font-bold text-gray-800">{formatTime(recipe.cookTimeMinutes)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-sm sm:text-base font-bold text-gray-800">{formatTime(recipe.totalTimeMinutes)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Servings</p>
            <p className="text-sm sm:text-base font-bold text-gray-800">{recipe.defaultServings}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Serving adjuster */}
          <ServingAdjuster
            defaultServings={recipe.defaultServings}
            multiplier={multiplier}
            onChange={setMultiplier}
          />

          {/* Ingredients */}
          <section>
            <h3 className="font-display text-xl font-bold text-stone-800 mb-3 flex items-center gap-2">
              🛒 Ingredients
              <span className="text-sm font-normal text-gray-500">
                (for {currentServings} serving{currentServings !== 1 ? 's' : ''})
              </span>
            </h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, idx) => {
                const scaledQty = Math.round(ing.quantity * multiplier * 100) / 100;
                return (
                  <li
                    key={idx}
                    className="flex items-baseline gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-base font-bold text-primary-600 min-w-[80px] text-right">
                      {formatQuantity(scaledQty)}{ing.unit ? ` ${ing.unit}` : ''}
                    </span>
                    <span className="text-base text-gray-700">
                      {ing.name}
                      {ing.prepNote && (
                        <span className="text-gray-400 text-sm ml-1">({ing.prepNote})</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Instructions */}
          <section>
            <h3 className="font-display text-xl font-bold text-stone-800 mb-3">📋 Instructions</h3>
            <ol className="space-y-4">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 border border-primary-200 rounded-full flex items-center justify-center font-bold text-xs font-display">
                    {toRoman(idx + 1)}
                  </span>
                  <p className="text-base text-gray-700 leading-relaxed pt-1">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Notes */}
          {recipe.notes && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-display text-lg font-bold text-primary-800 mb-2">🍷 Note dello Chef</h3>
              <p className="text-base text-amber-900 leading-relaxed">{recipe.notes}</p>
            </section>
          )}
        </div>

        {/* Footer action buttons */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          {isSelected ? (
            <button
              onClick={() => onRemoveFromList(recipe.id)}
              className="flex-1 py-4 sm:py-3 px-6 bg-red-500 text-white font-bold rounded-xl text-base hover:bg-red-600 transition-colors shadow-md active:scale-[0.98]"
            >
              ✕ Remove from Shopping List
            </button>
          ) : (
            <button
              onClick={() => onAddToList(recipe, multiplier)}
              className="flex-1 py-4 sm:py-3 px-6 bg-primary-500 text-white font-bold rounded-xl text-base hover:bg-primary-600 transition-colors shadow-md active:scale-[0.98]"
            >
              🛒 Add to Shopping List
            </button>
          )}
          <button
            onClick={handlePrint}
            className="py-4 sm:py-3 px-6 bg-gray-100 text-gray-700 font-bold rounded-xl text-base hover:bg-gray-200 transition-colors active:scale-[0.98]"
          >
            🖨️ Print Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
