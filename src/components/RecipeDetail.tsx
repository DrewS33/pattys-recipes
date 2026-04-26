import { useState, useEffect, useCallback, useRef } from 'react';
import { Recipe } from '../types';
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
  onEdit?: () => void;
  onDelete?: () => void;
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
  onRateRecipe: _onRateRecipe,
  onShare,
  onEdit,
  onDelete,
}: RecipeDetailProps) {
  const [multiplier, setMultiplier] = useState(selectedMultiplier || 1);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    if (!recipe || !onShare) return;
    setShareStatus('copying');
    setShareFallbackUrl(null);

    const shareId = await onShare(recipe.id);
    if (!shareId) {
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
      setShareFallbackUrl(url);
      setShareStatus('idle');
    }
  }, [recipe, onShare]);

  // Reset state when modal opens or closes
  useEffect(() => {
    setMultiplier(selectedMultiplier > 0 ? selectedMultiplier : 1);
    setShowMoreMenu(false);
    setShowDeleteConfirm(false);
  }, [selectedMultiplier, isOpen]);

  // Reset delete confirm when More menu closes
  useEffect(() => {
    if (!showMoreMenu) setShowDeleteConfirm(false);
  }, [showMoreMenu]);

  // Escape key — close More menu first, then modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMoreMenu) { setShowMoreMenu(false); return; }
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, showMoreMenu]);

  // Close More menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

  if (!isOpen || !recipe) return null;

  const currentServings = Math.round(recipe.defaultServings * multiplier * 10) / 10;

  const handlePrint = () => {
    document.body.classList.add('printing-recipe');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-recipe');
    }, { once: true });
    window.print();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-start justify-center sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal panel */}
      <div className="bg-white w-full max-w-3xl sm:rounded-2xl shadow-2xl sm:my-4 overflow-hidden
                      rounded-t-2xl max-h-[92vh] overflow-y-auto">

        {/* Photo banner */}
        {recipe.image && (
          <div className="h-48 overflow-hidden">
            <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
            {/* Title + description — full width on mobile, flex-1 on sm+ */}
            <div className="flex-1 min-w-0 order-2 sm:order-1">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-800 leading-snug mb-1">
                {recipe.name}
              </h2>
              <p className="text-stone-500 text-base leading-relaxed">{recipe.description}</p>
            </div>

            {/* Top-right actions: Edit · Favorite · ··· More · ✕ */}
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-start order-1 sm:order-2 sm:pt-1.5">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="h-9 px-2.5 rounded-full flex items-center gap-1.5 bg-white hover:bg-amber-50 border border-stone-300 text-stone-600 hover:text-stone-800 transition-all"
                  title="Edit recipe"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span className="hidden sm:inline text-sm font-medium">Edit</span>
                </button>
              )}

              <button
                onClick={() => onToggleFavorite(recipe.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border
                  ${isFavorite
                    ? 'bg-yellow-400 hover:bg-yellow-300 border-yellow-300 text-yellow-900'
                    : 'bg-white hover:bg-amber-50 border-stone-300 text-stone-500 hover:text-amber-500'}`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                )}
              </button>

              {/* More menu (⋯) */}
              <div className="relative w-9" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu(v => !v)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border
                    ${showMoreMenu
                      ? 'bg-amber-50 border-stone-300 text-stone-600'
                      : 'bg-white hover:bg-amber-50 border-stone-300 text-stone-500 hover:text-stone-700'}`}
                  title="More options"
                  aria-label="More options"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="19" cy="12" r="1.75" />
                  </svg>
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[172px] z-10">
                    {showDeleteConfirm ? (
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-medium text-stone-600 mb-2">Delete this recipe?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { onDelete?.(); setShowMoreMenu(false); }}
                            className="flex-1 py-1.5 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-1.5 bg-gray-100 text-stone-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {onShare && (
                          <button
                            onClick={() => { setShowMoreMenu(false); handleShare(); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                          >
                            🔗 Share Recipe
                          </button>
                        )}
                        <button
                          onClick={() => { setShowMoreMenu(false); handlePrint(); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                        >
                          🖨️ Print Recipe
                        </button>
                        {onDelete && (
                          <>
                            <hr className="my-1 border-gray-100" />
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center gap-2.5 transition-colors"
                            >
                              🗑️ Delete Recipe
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-transparent hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-all"
                title="Close"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Share status feedback (appears inline after share action) */}
          {shareStatus === 'copied' && (
            <p className="mt-2 text-xs text-emerald-600 font-medium">✓ Link copied to clipboard!</p>
          )}
          {shareStatus === 'error' && (
            <p className="mt-2 text-xs text-red-400 font-medium">⚠️ Sharing not available</p>
          )}

          {/* Share fallback URL input */}
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
                onClick={() => {
                  navigator.clipboard.writeText(shareFallbackUrl).catch(() => {});
                  setShareFallbackUrl(null);
                  setShareStatus('copied');
                  setTimeout(() => setShareStatus('idle'), 2000);
                }}
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
        <div className="bg-white px-6 py-3 grid grid-cols-4 gap-2 border-b border-stone-200">
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
            <ul className="space-y-0">
              {recipe.ingredients.map((ing, idx) => {
                const scaledQty = Math.round(ing.quantity * multiplier * 100) / 100;
                return (
                  <li
                    key={idx}
                    className="flex items-baseline gap-3 py-1.5 border-b border-gray-100 last:border-0"
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

        {/* Print-only clean recipe layout — hidden on screen, rendered when printing */}
        <div id="print-recipe" className="print-only" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="rp-brand">Patty's Recipe Box</span>
          <h1 className="rp-title">{recipe.name}</h1>
          {recipe.description && <p className="rp-desc">{recipe.description}</p>}
          <div className="rp-meta">
            <span>{recipe.difficulty}</span>
            <span>{recipe.proteinType}</span>
            <span>{recipe.mealType}</span>
            <span>Prep: {formatTime(recipe.prepTimeMinutes)}</span>
            <span>Cook: {formatTime(recipe.cookTimeMinutes)}</span>
            <span>Total: {formatTime(recipe.totalTimeMinutes)}</span>
            <span>Serves: {recipe.defaultServings}</span>
          </div>

          <div className="rp-section">
            <h2 className="rp-section-title">Ingredients</h2>
            <ul className="rp-ingredients">
              {recipe.ingredients.map((ing, idx) => {
                const scaledQty = Math.round(ing.quantity * multiplier * 100) / 100;
                return (
                  <li key={idx} className="rp-ingredient">
                    <span className="rp-checkbox" />
                    <span className="rp-qty">{formatQuantity(scaledQty)}{ing.unit ? ` ${ing.unit}` : ''}</span>
                    <span className="rp-ing-name">
                      {ing.name}{ing.prepNote ? ` (${ing.prepNote})` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rp-section">
            <h2 className="rp-section-title">Instructions</h2>
            <ol className="rp-instructions">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="rp-step">{step}</li>
              ))}
            </ol>
          </div>

          {recipe.notes && (
            <div className="rp-section">
              <h2 className="rp-section-title">Chef's Note</h2>
              <div className="rp-notes-box"><p>{recipe.notes}</p></div>
            </div>
          )}
        </div>

        {/* Footer action */}
        <div className="px-6 pb-6 pt-2">
          {isSelected ? (
            <button
              onClick={() => onRemoveFromList(recipe.id)}
              className="w-full py-4 sm:py-3 px-6 bg-red-500 text-white font-bold rounded-xl text-base hover:bg-red-600 transition-colors shadow-md active:scale-[0.98]"
            >
              ✕ Remove from Shopping List
            </button>
          ) : (
            <button
              onClick={() => onAddToList(recipe, multiplier)}
              className="w-full py-4 sm:py-3 px-6 bg-primary-500 text-white font-bold rounded-xl text-base hover:bg-primary-600 transition-colors shadow-md active:scale-[0.98]"
            >
              🛒 Add to Shopping List
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
