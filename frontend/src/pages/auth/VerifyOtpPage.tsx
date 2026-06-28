import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/lib/auth';

interface LocationState {
  phone?: string;
  email?: string;
  purpose?: 'login' | 'verify';
  fullName?: string;
}

export function VerifyOtpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const state = (location.state as LocationState) || {};

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const destination = state.phone || state.email || '';
  const isPhoneFlow = Boolean(state.phone);

  if (!destination) {
    // Defensive: someone navigated here directly without going through send-otp.
    navigate('/auth/login', { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      if (isPhoneFlow) {
        const res = await authApi.phoneVerifyOtp(state.phone!, otp, state.purpose || 'login', state.fullName);
        setSession(res.data.accessToken, { ...res.data.user, roles: res.data.roles });
      } else {
        const res = await authApi.emailVerifyOtp(state.email!, otp);
        setSession(res.data.accessToken, { ...res.data.user, roles: res.data.roles });
      }
      navigate('/onboarding/location');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect or expired code.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setIsResending(true);
    try {
      if (isPhoneFlow) {
        await authApi.phoneSendOtp(state.phone!, state.purpose || 'login');
      } else {
        await authApi.emailResendOtp(state.email!);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthLayout title={t('auth.otpLabel')} subtitle={t('auth.otpSentTo', { destination })}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t('auth.otpLabel')}
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          autoComplete="one-time-code"
          autoFocus
        />
        {error && <p className="text-sm text-sos-500">{error}</p>}
        <Button type="submit" className="w-full" isLoading={isLoading}>
          {t('auth.verifyOtp')}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={handleResend} isLoading={isResending}>
          {t('auth.resendOtp')}
        </Button>
      </form>
    </AuthLayout>
  );
}
