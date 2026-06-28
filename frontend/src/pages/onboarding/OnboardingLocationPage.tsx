import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';

const RADIUS_OPTIONS = [5, 10, 15, 25] as const;

export function OnboardingLocationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function handleUseCurrentLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError('Location is not supported on this device. You can set it later from your profile.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setError('Could not access your location. Please allow location access and try again.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleContinue() {
    if (!coords) {
      navigate('/onboarding/roles');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiClient.patch('/users/me/location', { lat: coords.lat, lng: coords.lng, searchRadiusKm: radius });
      await refreshUser();
      navigate('/onboarding/roles');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save location.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-ink-900">{t('onboarding.locationTitle')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('onboarding.locationSubtitle')}</p>
        </div>

        <Button type="button" className="w-full" onClick={handleUseCurrentLocation} isLoading={isLocating}>
          {t('onboarding.useCurrentLocation')}
        </Button>

        {coords && (
          <div className="rounded border border-trust-300 bg-trust-50 px-4 py-3 text-sm text-trust-700">
            Location captured ✓ ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-ink-700">{t('onboarding.radiusLabel')}</label>
          <div className="grid grid-cols-4 gap-2">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setRadius(km)}
                className={`rounded border py-2 text-sm font-medium transition-colors ${
                  radius === km ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-100 text-ink-700'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-sos-500">{error}</p>}

        <Button type="button" className="w-full" onClick={handleContinue} isLoading={isSaving}>
          {t('common.continue')}
        </Button>
      </div>
    </div>
  );
}
