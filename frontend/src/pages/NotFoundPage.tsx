import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 p-8 text-center">
      <p className="mb-2 font-display text-8xl font-bold text-ink-200" aria-hidden="true">
        404
      </p>
      <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">Page not found</h1>
      <p className="mb-8 max-w-xs text-sm text-ink-500">
        This page doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <Home className="h-4 w-4" />
          Home
        </button>
      </div>
    </div>
  );
}
