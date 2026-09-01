import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';

const linkBase =
  'px-3 py-1.5 text-sm rounded transition-colors border border-transparent';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <span className="font-mono text-sm tracking-tight text-text">
            webhook<span className="text-accent">.</span>relay
          </span>

          <nav className="flex gap-1">
            {/* NavLink knows whether its route is active, which is why the
                className is a function of that state rather than a string. */}
            <NavLink
              to="/subscriptions"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? 'border-line bg-surface text-text' : 'text-muted hover:text-text'}`
              }
            >
              Subscriptions
            </NavLink>
            <NavLink
              to="/events"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? 'border-line bg-surface text-text' : 'text-muted hover:text-text'}`
              }
            >
              Event log
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-xs text-faint">{user?.email}</span>
            <button
              onClick={logout}
              className="rounded border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-bright hover:text-text"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Outlet is where react-router renders whichever child route matched. */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
