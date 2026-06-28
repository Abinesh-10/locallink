import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';

/**
 * Lands here after GET /auth/google/callback redirects the browser to
 * FRONTEND_OAUTH_REDIRECT_URL#accessToken=... The token is in the URL
 * fragment (never sent to servers/logs), so we read it client-side, store
 * it in memory, then fetch the user profile before routing onward.
 */
export function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    async function complete() {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const token = params.get('accessToken');

      if (!token) {
        navigate('/auth/login', { replace: true });
        return;
      }

      setAccessToken(token);
      // Clear the fragment from the URL bar immediately so the token isn't
      // visible in browser history.
      window.history.replaceState(null, '', window.location.pathname);

      await refreshUser();
      navigate('/onboarding/location', { replace: true });
    }
    complete();
  }, [navigate, refreshUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}
