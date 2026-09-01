import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { AuthProvider, useAuth } from './lib/auth.js';
import { EventDetail } from './pages/EventDetail.js';
import { EventLog } from './pages/EventLog.js';
import { Login, Signup } from './pages/Login.js';
import { Subscriptions } from './pages/Subscriptions.js';

/**
 * Wraps the signed-in area. While the stored token is being verified we
 * render nothing rather than the login page - otherwise a refresh would flash
 * the login screen for a moment before the check completes.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/subscriptions" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/events" element={<EventLog />} />
            <Route path="/events/:id" element={<EventDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/subscriptions" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
