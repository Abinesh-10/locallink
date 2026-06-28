import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Droplet, Stethoscope, Users, PackageSearch } from 'lucide-react';
import { communityApi } from '@/features/community/api';
import { RequestFeedCard, CommunityRequestRow } from '@/features/community/components/RequestFeedCard';
import { SosButton } from '@/features/community/components/SosButton';
import { useAuth } from '@/lib/auth';

const TYPES = ['blood', 'volunteer', 'emergency', 'medical', 'other'] as const;

export function CommunityFeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeType, setActiveType] = useState<string | null>(null);
  const [requests, setRequests] = useState<CommunityRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await communityApi.listRequests({
          type: activeType || undefined,
          lat: user?.lat ?? undefined,
          lng: user?.lng ?? undefined,
          radius: (user?.search_radius_km as 5 | 10 | 15 | 25) ?? 10,
        });
        setRequests(res.data.requests);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load requests.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [activeType, user?.lat, user?.lng, user?.search_radius_km]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-4">
          <h1 className="font-display text-xl font-semibold text-ink-900">{t('community.feedTitle')}</h1>
          <p className="text-sm text-ink-500">{t('community.feedSubtitle')}</p>
        </header>

        <div className="mb-4">
          <SosButton />
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => navigate('/community/blood')}
            className="flex flex-col items-center gap-1 rounded-lg bg-sos-500/10 p-2 text-xs font-medium text-sos-600"
          >
            <Droplet className="h-5 w-5" />
            {t('community.typeBlood')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/community/emergency')}
            className="flex flex-col items-center gap-1 rounded-lg bg-amber-100 p-2 text-xs font-medium text-amber-700"
          >
            <Stethoscope className="h-5 w-5" />
            {t('community.typeMedical')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/community/volunteers')}
            className="flex flex-col items-center gap-1 rounded-lg bg-trust-50 p-2 text-xs font-medium text-trust-700"
          >
            <Users className="h-5 w-5" />
            {t('community.volunteersTitle')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/community/lost-found')}
            className="flex flex-col items-center gap-1 rounded-lg bg-brand-50 p-2 text-xs font-medium text-brand-700"
          >
            <PackageSearch className="h-5 w-5" />
            {t('community.lostFoundTitle')}
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveType(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              activeType === null ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
            }`}
          >
            All
          </button>
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                activeType === type ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              {t(`community.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/community/new')}
          className="mb-4 w-full rounded border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500"
        >
          {t('community.newRequestTitle')}
        </button>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && requests.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('community.noResults')}</p>
        )}

        <div className="space-y-2">
          {requests.map((r) => (
            <RequestFeedCard key={r.id} request={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
