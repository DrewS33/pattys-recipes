import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// ResetPasswordPage — shown when the app detects a Supabase
// PASSWORD_RECOVERY event (user opened a password-reset link).
// ============================================================

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f0] flex flex-col items-center justify-center px-4">
      {/* Logo / header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🍽️</div>
        <h1 className="font-display text-3xl font-bold text-stone-800">Patty's Recipe Box</h1>
        <p className="text-stone-500 mt-1 text-sm">Family favorites, all in one place</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 w-full max-w-sm p-7">
        <h2 className="font-display text-xl font-bold text-stone-800 mb-5">
          Set a new password
        </h2>

        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-stone-700 font-semibold mb-1">Password updated!</p>
            <p className="text-stone-500 text-sm">You're now signed in. Taking you to the app…</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1" htmlFor="rp-password">
                  New password
                </label>
                <input
                  id="rp-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1" htmlFor="rp-confirm">
                  Confirm new password
                </label>
                <input
                  id="rp-confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
