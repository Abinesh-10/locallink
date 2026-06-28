import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/features/auth/api';
import { forgotPasswordSchema } from '@/lib/validation';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Enter a valid email');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      navigate('/auth/reset', { state: { email } });
    } catch (err: any) {
      // Backend is enumeration-safe and always returns success — this catch
      // mainly covers network/rate-limit errors.
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout title={t('auth.resetPasswordTitle')} subtitle="We'll send a code to your email.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t('auth.emailLabel')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />
        {error && <p className="text-sm text-sos-500">{error}</p>}
        <Button type="submit" className="w-full" isLoading={isLoading}>
          {t('common.continue')}
        </Button>
        <p className="text-center text-sm text-ink-500">
          <Link to="/auth/login" className="font-medium text-brand-500 hover:underline">
            {t('common.back')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
