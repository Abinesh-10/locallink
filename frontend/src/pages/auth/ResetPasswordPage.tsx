import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/features/auth/api';
import { resetPasswordSchema } from '@/lib/validation';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!email) {
    navigate('/auth/forgot', { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ email, otp, newPassword });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Please check your details');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      navigate('/auth/login', { state: { resetSuccess: true } });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. The code may be incorrect or expired.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout title={t('auth.resetPasswordTitle')} subtitle={t('auth.otpSentTo', { destination: email })}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t('auth.otpLabel')}
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          autoFocus
        />
        <TextField
          label={t('auth.newPasswordLabel')}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-sos-500">{error}</p>}
        <Button type="submit" className="w-full" isLoading={isLoading}>
          {t('common.save')}
        </Button>
      </form>
    </AuthLayout>
  );
}
