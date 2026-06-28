import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';

const ROLES = [
  { value: 'worker', labelKey: 'onboarding.roleWorker' },
  { value: 'item_owner', labelKey: 'onboarding.roleItemOwner' },
  { value: 'seller', labelKey: 'onboarding.roleSeller' },
  { value: 'trainer', labelKey: 'onboarding.roleTrainer' },
] as const;

export function OnboardingRolesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(role: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  async function handleContinue() {
    setIsSaving(true);
    setError(null);
    try {
      // customer role is already assigned by default at signup — only
      // submit the additional roles the user explicitly picked.
      await Promise.all(
        Array.from(selected).map((role) => apiClient.post('/users/me/roles', { role }))
      );
      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save roles.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink-900">{t('onboarding.rolesTitle')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('onboarding.rolesSubtitle')}</p>
        </div>

        <div className="space-y-2">
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => toggle(role.value)}
              className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left text-sm font-medium transition-colors ${
                selected.has(role.value)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-100 text-ink-700'
              }`}
            >
              {t(role.labelKey)}
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  selected.has(role.value) ? 'border-brand-500 bg-brand-500' : 'border-ink-300'
                }`}
              >
                {selected.has(role.value) && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-sos-500">{error}</p>}

        <Button type="button" className="w-full" onClick={handleContinue} isLoading={isSaving}>
          {t('common.continue')}
        </Button>
      </div>
    </div>
  );
}
