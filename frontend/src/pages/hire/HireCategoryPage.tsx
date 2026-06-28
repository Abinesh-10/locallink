import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { hireApi } from '@/features/hire/api';
import { WorkerCard, WorkerSearchResult } from '@/features/hire/components/WorkerCard';
import { useAuth } from '@/lib/auth';

export function HireCategoryPage() {
  const { category: categorySlug } = useParams<{ category: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categoryName, setCategoryName] = useState<string>(categorySlug || '');
  const [workers, setWorkers] = useState<WorkerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const catRes = await hireApi.getServiceCategories();
        const match = catRes.data.categories.find((c: any) => c.slug === categorySlug);
        if (!match) {
          setError('Category not found.');
          setIsLoading(false);
          return;
        }
        setCategoryName(match.name_en);

        const workersRes = await hireApi.searchWorkers({
          category: match.id,
          lat: user?.lat ?? undefined,
          lng: user?.lng ?? undefined,
          radius: (user?.search_radius_km as 5 | 10 | 15 | 25) ?? 10,
          sort: 'rating',
        });
        setWorkers(workersRes.data.workers);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load workers.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [categorySlug, user?.lat, user?.lng, user?.search_radius_km]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/hire')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('hire.browseTitle')}
        </button>

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{categoryName}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && workers.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('hire.noResults')}</p>
        )}

        <div className="space-y-2">
          {workers.map((w) => (
            <WorkerCard key={w.user_id} worker={w} />
          ))}
        </div>
      </div>
    </div>
  );
}
