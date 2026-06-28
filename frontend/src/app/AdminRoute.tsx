import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Per doc: "/admin/* gated by role=admin". This is a UX guard only —
  // the real security boundary is the backend's requireRole('admin')
  // middleware. A non-admin who somehow reached this UI would still get
  // 403s on every API call; this just avoids showing them the shell at all.
  if (!user?.roles.includes('admin')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
