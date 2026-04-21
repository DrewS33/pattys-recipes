import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { rowToRecipe } from '../lib/dbMapper';
import { Recipe } from '../types';
import { formatQuantity } from '../utils/ingredientMerger';
import { ingredientsToRows, instructionsToRows } from '../lib/dbMapper';

// ============================================================
// SharedRecipePage — public read-only view of a shared recipe.
// Rendered when URL contains ?share=<shareId>.
// Logged-in users can copy it into their own account.
// ============================================================

interface SharedRecipePageProps {
  shareId: string;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function toRoman(num: number): string {
  const vals = [10, 9, 5, 4, 1];
  const syms = ['X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800',
};

export default function SharedRecipePage({ shareId }: SharedRecipePageProps) {
  const { user, loading: authLoading } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(true);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Sign-in form state (shown when not logged in)
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    async function loadSharedRecipe() {
      setRecipeLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(*), recipe_instructions(*)')
        .eq('share_id', shareId)
        .eq('is_shareable', true)
        .single();

      if (error || !data) {
        setLoadError('This recipe link is invalid or is no longer shared.');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecipe(rowToRecipe(data as any));
      }
      setRecipeLoading(false);
    }

    loadSharedRecipe();
  }, [shareId]);

  async function handleSave() {
    if (!user || !recipe) return;
    setSaveStatus('saving');

    const newId = crypto.randomUUID();
    const newRecipe: Recipe = {
      ...recipe,
      id: newId,
      isShareable: false,
      shareId: undefined,
      favorite: false,
      rating: undefined,
    };

    const now = new Date().toISOString();
    const recipeRow = {
      id: newId,
      user_id: user.id,
      name: newRecipe.name,
      description: newRecipe.description,
      difficulty: newRecipe.difficulty,
      protein_type: newRecipe.proteinType,
      meal_type: newRecipe.mealType,
      prep_minutes: newRecipe.prepTimeMinutes,
      cook_minutes: newRecipe.cookTimeMinutes,
      total_minutes: newRecipe.totalTimeMinutes,
      default_servings: newRecipe.defaultServings,
      tags: newRecipe.tags,
      image: newRecipe.image ?? null,
      notes: newRecipe.notes ?? null,
      is_favorite: false,
      rating: null,
      share_id: null,
      is_shareable: false,
      created_at: now,
      updated_at: now,
    };

    const { error: recipeErr } = await supabase.from('recipes').insert(recipeRow);
    if (recipeErr) {
      console.error('[SharedRecipePage] save recipe failed:', recipeErr.message);
      setSaveStatus('error');
      return;
    }

    const ingRows = ingredientsToRows(newRecipe, user.id);
    if (ingRows.length > 0) {
      const { error: ingErr } = await supabase.from('recipe_ingredients').insert(ingRows);
      if (ingErr) {
        console.error('[SharedRecipePage] save ingredients failed:', ingErr.message);
        setSaveStatus('error');
        return;
      }
    }

    const instRows = instructionsToRows(newRecipe, user.id);
    if (instRows.length > 0) {
      const { error: instErr } = await supabase.from('recipe_instructions').insert(instRows);
      if (instErr) {
        console.error('[SharedRecipePage] save instructions failed:', instErr.message);
        setSaveStatus('error');
        return;
      }
    }

    setSaveStatus('saved');
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError(null);
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (error) {
      setSignInError(error.message);
    } else {
      setShowSignIn(false);
    }
  }

  // ---- Loading / error states ----

  if (recipeLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#fdf8f0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🍳</div>
          <p className="text-stone-400">Loading recipe…</p>
        </div>
      </div>
    );
  }

  if (loadError || !recipe) {
    return (
      <div className="min-h-screen bg-[#fdf8f0] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="font-display text-xl font-bold text-stone-700 mb-2">Link not found</h2>
          <p className="text-stone-400 text-sm">{loadError}</p>
          <a
            href={import.meta.env.BASE_URL}
            className="mt-6 inline-block py-2 px-5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors"
          >
            Go to Patty's Recipe Box
          </a>
        </div>
      </div>
    );
  }

  // ---- Recipe view ----

  return (
    <div className="min-h-screen bg-[#fdf8f0]">
      {/* Minimal header banner */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <span className="font-display font-bold text-primary-700 text-base">🍷 Patty's Recipe Box</span>
        <a
          href={import.meta.env.BASE_URL}
          className="text-xs text-stone-400 hover:text-primary-600 transition-colors font-medium"
        >
          Open App →
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
        {/* Recipe header */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6">
          {recipe.image && (
            <div className="h-48 rounded-xl overflow-hidden mb-4">
              <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="font-display text-2xl font-bold text-stone-800 mb-1">{recipe.name}</h1>
          <p className="text-stone-500 text-base leading-relaxed mb-4">{recipe.description}</p>
          <div className="flex flex-wrap gap-2">
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${DIFFICULTY_COLORS[recipe.difficulty]}`}>
              {recipe.difficulty}
            </span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-primary-100 text-primary-700">
              {recipe.proteinType}
            </span>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
              {recipe.mealType}
            </span>
          </div>
        </div>

        {/* Time bar */}
        <div className="bg-white rounded-2xl border border-stone-100 px-6 py-4 grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'Prep', value: formatTime(recipe.prepTimeMinutes) },
            { label: 'Cook', value: formatTime(recipe.cookTimeMinutes) },
            { label: 'Total', value: formatTime(recipe.totalTimeMinutes) },
            { label: 'Servings', value: `${recipe.defaultServings}` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-bold text-stone-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Ingredients */}
        <section className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-stone-800 mb-4">🛒 Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-baseline gap-3 py-1.5 border-b border-stone-50 last:border-0">
                <span className="text-sm font-bold text-primary-600 min-w-[80px] text-right">
                  {formatQuantity(ing.quantity)}{ing.unit ? ` ${ing.unit}` : ''}
                </span>
                <span className="text-sm text-stone-700">
                  {ing.name}
                  {ing.prepNote && <span className="text-stone-400 ml-1">({ing.prepNote})</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Instructions */}
        <section className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-stone-800 mb-4">📋 Instructions</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((step, idx) => (
              <li key={idx} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 bg-primary-100 text-primary-700 border border-primary-200 rounded-full flex items-center justify-center font-bold text-xs font-display">
                  {toRoman(idx + 1)}
                </span>
                <p className="text-sm text-stone-700 leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Notes */}
        {recipe.notes && (
          <section className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-6">
            <h2 className="font-display text-base font-bold text-primary-800 mb-2">🍷 Chef's Note</h2>
            <p className="text-sm text-amber-900 leading-relaxed">{recipe.notes}</p>
          </section>
        )}
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-4 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          {user ? (
            // Logged in — show Save button
            saveStatus === 'saved' ? (
              <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-semibold text-sm">✓ Saved to your recipes!</span>
                <a
                  href={import.meta.env.BASE_URL}
                  className="text-xs text-emerald-600 underline hover:text-emerald-800 ml-1"
                >
                  Open app →
                </a>
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-xl text-base hover:bg-primary-700 transition-colors shadow-md disabled:opacity-60"
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? '⚠️ Error — try again' : '📥 Save to My Recipes'}
              </button>
            )
          ) : (
            // Not logged in
            showSignIn ? (
              <form onSubmit={handleSignIn} className="space-y-3">
                <p className="text-xs text-stone-500 text-center font-medium">Sign in to save this recipe</p>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                {signInError && <p className="text-xs text-red-500">{signInError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSignIn(false)}
                    className="flex-1 py-2.5 bg-stone-100 text-stone-600 font-semibold rounded-xl text-sm hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={signingIn}
                    className="flex-1 py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors disabled:opacity-60"
                  >
                    {signingIn ? 'Signing in…' : 'Sign In'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignIn(true)}
                  className="flex-1 py-3.5 bg-primary-600 text-white font-bold rounded-xl text-base hover:bg-primary-700 transition-colors shadow-md"
                >
                  Sign in to Save Recipe
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
