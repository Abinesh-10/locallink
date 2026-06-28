import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/features/auth/api';
import { phoneVerifyOtpSchema, emailRegisterSchema } from '@/lib/validation';

type Mode = 'phone' | 'email';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('phone');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = phoneVerifyOtpSchema.pick({ phone: true, fullName: true }).safeParse({ phone, fullName });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Please check your details');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.phoneSendOtp(phone, 'login');
      navigate('/auth/verify-otp', { state: { phone, purpose: 'login', fullName } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = emailRegisterSchema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Please check your details');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.emailRegister(email, password, fullName);
      navigate('/auth/verify-otp', { state: { email, purpose: 'verify' } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout title={t('auth.registerTitle')}>
      <div className="space-y-4">
        <TextField
          label={t('auth.fullNameLabel')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />

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
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-sos-500">{error}</p>}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {t('common.continue')}
            </Button>
          </form>
        )}

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setMode(mode === 'phone' ? 'email' : 'phone')}
        >
          {mode === 'phone' ? t('auth.loginWithEmail') : t('auth.loginWithPhone')}
        </Button>

        <p className="text-center text-sm text-ink-500">
          {t('auth.haveAccount')}{' '}
          <Link to="/auth/login" className="font-medium text-brand-500 hover:underline">
            {t('auth.loginTitle')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
