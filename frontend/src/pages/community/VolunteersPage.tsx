import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '@/features/community/api';
import { useAuth } from '@/lib/auth';

interface Volunteer {
  id: string;
  full_name: string;
  photo_url: string | null;
  phone: string | null;
  distance_km: string;
}

export function VolunteersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (user?.lat == null || user?.lng == null) {
        setError(t('community.sosLocationRequired'));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await communityApi.getVolunteers(user.lat, user.lng, (user.search_radius_km as 5 | 10 | 15 | 25) ?? 10);
        setVolunteers(res.data.volunteers);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load volunteers.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user?.lat, user?.lng, user?.search_radius_km]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/community')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('community.feedTitle')}
        </button>

        <h1 className="mb-1 font-display text-xl font-semibold text-ink-900">{t('community.volunteersTitle')}</h1>
        <p className="mb-4 text-sm text-ink-500">{t('community.becomeVolunteerPrompt')}</p>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && volunteers.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('community.noVolunteersNearby')}</p>
        )}

        <div className="space-y-2">
          {volunteers.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-lg border border-ink-100 bg-white p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-trust-50 text-base font-display font-semibold text-trust-700">
                {v.photo_url ? (
                  <img src={v.photo_url} alt={v.full_name} className="h-full w-full object-cover" />
                ) : (
                  v.full_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink-900">{v.full_name}</p>
                <p className="text-xs text-ink-500">{parseFloat(v.distance_km).toFixed(1)} km away</p>
              </div>
              {v.phone && (
                <a
                  href={`tel:${v.phone}`}
                  className="flex items-center gap-1 rounded bg-trust-500 px-3 py-2 text-sm font-medium text-white"
                >
                  <Phone className="h-4 w-4" />
                  {t('community.callVolunteer')}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
