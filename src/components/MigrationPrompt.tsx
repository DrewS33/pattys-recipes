import { useState } from 'react';
import { LocalStorageSnapshot } from '../lib/migration';

// ============================================================
// MigrationPrompt
// Shown once on first login when localStorage data exists but
// the user's Supabase account has no recipes yet.
// The user can import their saved data or start fresh.
// ============================================================

interface Props {
  snapshot: LocalStorageSnapshot;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}

export default function MigrationPrompt({ snapshot, onAccept, onDecline }: Props) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);

  const handle = async (choice: 'accept' | 'decline') => {
    setAction(choice);
    setLoading(true);
    if (choice === 'accept') {
      await onAccept();
    } else {
      await onDecline();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fdf8f0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 w-full max-w-md p-8">
        <div className="text-4xl mb-4 text-center">📦</div>
        <h2 className="font-display text-xl font-bold text-stone-800 text-center mb-2">
          Import your saved data?
        </h2>
        <p className="text-stone-500 text-sm text-center mb-6 leading-relaxed">
          We found saved data on this device. Import it into your account so it syncs across all your devices.
        </p>

        {/* Summary */}
        <div className="bg-stone-50 rounded-xl border border-stone-200 px-4 py-3 mb-6 space-y-1.5 text-sm text-stone-700">
          {snapshot.recipeCount > 0 && (
            <div className="flex justify-between">
              <span>Recipes</span>
              <span className="font-semibold">{snapshot.recipeCount}</span>
            </div>
          )}
          {snapshot.hasPantry && (
            <div className="flex justify-between">
              <span>Pantry settings</span>
              <span className="font-semibold">✓</span>
            </div>
          )}
          {snapshot.hasMealPlan && (
            <div className="flex justify-between">
              <span>Meal plan</span>
              <span className="font-semibold">✓</span>
            </div>
          )}
          {snapshot.hasStorePrefs && (
            <div className="flex justify-between">
              <span>Store preferences</span>
              <span className="font-semibold">✓</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handle('accept')}
            disabled={loading}
            className="w-full py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && action === 'accept' ? 'Importing…' : 'Import my data'}
          </button>
          <button
            onClick={() => handle('decline')}
            disabled={loading}
            className="w-full py-2.5 bg-white border border-stone-200 text-stone-600 font-semibold rounded-xl text-sm hover:bg-stone-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && action === 'decline' ? 'Setting up…' : 'Start fresh'}
          </button>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          This only runs once. Your local data stays on this device.
        </p>
      </div>
    </div>
  );
}
