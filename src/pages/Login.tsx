import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  async function submit(e: FormEvent) {
    // Without this the browser does a full page reload and the request is
    // never made by our code.
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await (isSignup ? signup(email, password) : login(email, password));
      navigate('/subscriptions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="font-mono text-sm tracking-tight text-text">
            webhook<span className="text-accent">.</span>relay
          </div>
          <p className="mt-1 text-sm text-muted">
            {isSignup ? 'Create an account to start receiving events.' : 'Sign in to your account.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-faint">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded border border-line bg-surface px-3 py-2 font-mono text-sm text-text outline-none transition-colors focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-faint">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              className="w-full rounded border border-line bg-surface px-3 py-2 font-mono text-sm text-text outline-none transition-colors focus:border-accent"
            />
            {isSignup && (
              <span className="mt-1 block text-xs text-faint">At least 8 characters.</span>
            )}
          </label>

          {error && (
            <p className="rounded border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Working...' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link
            to={isSignup ? '/login' : '/signup'}
            className="text-accent hover:underline"
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function Login() {
  return <AuthForm mode="login" />;
}

export function Signup() {
  return <AuthForm mode="signup" />;
}
