import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// AuthPage — login / sign-up / forgot-password screens
// Matches the app's existing warm stone/cream color palette.
// ============================================================

type Screen = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = (next: Screen) => {
    setError(null);
    setInfo(null);
    setPassword('');
    setConfirmPassword('');
    setScreen(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (screen === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (screen === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (screen === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else if (screen === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error);
        } else {
          setInfo('Account created! Check your email to confirm, then log in.');
          setScreen('login');
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error);
        } else {
          setInfo('Password reset email sent. Check your inbox.');
        }
      }
    } finally {
      setLoading(false);
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
          {screen === 'login' && 'Sign in to your account'}
          {screen === 'signup' && 'Create an account'}
          {screen === 'forgot' && 'Reset your password'}
        </h2>

        {/* Feedback */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          {/* Password (not on forgot screen) */}
          {screen !== 'forgot' && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={screen === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Confirm password (signup only) */}
          {screen === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1" htmlFor="auth-confirm">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Forgot password link */}
          {screen === 'login' && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => resetForm('forgot')}
                className="text-xs text-primary-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {loading
              ? 'Please wait…'
              : screen === 'login'
              ? 'Sign in'
              : screen === 'signup'
              ? 'Create account'
              : 'Send reset email'}
          </button>
        </form>

        {/* Screen switcher */}
        <div className="mt-5 text-center text-sm text-stone-500">
          {screen === 'login' && (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => resetForm('signup')}
                className="text-primary-600 font-semibold hover:underline"
              >
                Sign up
              </button>
            </>
          )}
          {screen === 'signup' && (
            <>
              Already have an account?{' '}
              <button
                onClick={() => resetForm('login')}
                className="text-primary-600 font-semibold hover:underline"
              >
                Sign in
              </button>
            </>
          )}
          {screen === 'forgot' && (
            <button
              onClick={() => resetForm('login')}
              className="text-primary-600 font-semibold hover:underline"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
