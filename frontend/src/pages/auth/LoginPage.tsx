import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/features/auth/api';
import { phoneSendOtpSchema, emailLoginSchema } from '@/lib/validation';

type Mode = 'phone' | 'email';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [mode, setMode] = useState<Mode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = phoneSendOtpSchema.safeParse({ phone });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid phone number');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.phoneSendOtp(phone, 'login');
      navigate('/auth/verify-otp', { state: { phone, purpose: 'login' } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = emailLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Invalid email or password');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.emailLogin(email, password);
      setSession(res.data.accessToken, { ...res.data.user, roles: res.data.roles });
      navigate('/');
    } catch (err: any) {
      const code = err.response?.data?.title;
      if (code === 'email_not_verified') {
        navigate('/auth/verify-otp', { state: { email, purpose: 'verify' } });
        return;
      }
      setError(err.response?.data?.detail || 'Incorrect email or password.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = authApi.googleLoginUrl();
  }

  return (
    <AuthLayout title={t('auth.loginTitle')}>
      <div className="space-y-4">
        {mode === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <TextField
              label={t('auth.phoneLabel')}
              type="tel"
              placeholder={t('auth.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
            {error && <p className="text-sm text-sos-500">{error}</p>}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {t('auth.sendOtp')}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <TextField
              label={t('auth.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <TextField
              label={t('auth.passwordLabel')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className="text-right">
              <Link to="/auth/forgot" className="text-sm text-brand-500 hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            {error && <p className="text-sm text-sos-500">{error}</p>}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {t('common.continue')}
            </Button>
          </form>
        )}

        <div className="flex items-center gap-3 text-xs text-ink-300">
          <div className="h-px flex-1 bg-ink-100" />
          <span>or</span>
          <div className="h-px flex-1 bg-ink-100" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setMode(mode === 'phone' ? 'email' : 'phone')}
        >
          {mode === 'phone' ? t('auth.loginWithEmail') : t('auth.loginWithPhone')}
        </Button>

        <Button type="button" variant="secondary" className="w-full" onClick={handleGoogleLogin}>
          {t('auth.loginWithGoogle')}
        </Button>

        <p className="text-center text-sm text-ink-500">
          {t('auth.noAccount')}{' '}
          <Link to="/auth/register" className="font-medium text-brand-500 hover:underline">
            {t('auth.registerTitle')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
