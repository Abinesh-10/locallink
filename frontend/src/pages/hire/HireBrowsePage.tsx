import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Zap, Wrench, Hammer, Paintbrush, Sparkles, Leaf, Briefcase } from 'lucide-react';
import { hireApi } from '@/features/hire/api';
import { WorkerCard, WorkerSearchResult } from '@/features/hire/components/WorkerCard';
import { useAuth } from '@/lib/auth';

interface ServiceCategory {
  id: string;
  slug: string;
  name_en: string;
  icon: string | null;
}

type SortOption = 'rating' | 'distance' | 'trust';

// Maps the icon name strings stored in service_categories.icon (seeded as
// Lucide icon names, e.g. 'zap', 'wrench') to actual components — never
// render the name string itself as text.
const CATEGORY_ICONS: Record<string, typeof Zap> = {
  zap: Zap,
  wrench: Wrench,
  hammer: Hammer,
  paintbrush: Paintbrush,
  sparkles: Sparkles,
  leaf: Leaf,
};

function CategoryIcon({ icon }: { icon: string | null }) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Briefcase;
  return <Icon className="h-3.5 w-3.5" />;
}

export function HireBrowsePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('rating');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [workers, setWorkers] = useState<WorkerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hireApi
      .getServiceCategories()
      .then((res) => setCategories(res.data.categories))
      .catch(() => setCategories([])); // category chips are a progressive enhancement; search still works without them
  }, []);

  useEffect(() => {
    async function loadWorkers() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await hireApi.searchWorkers({
          category: activeCategory || undefined,
          lat: user?.lat ?? undefined,
          lng: user?.lng ?? undefined,
          radius: (user?.search_radius_km as 5 | 10 | 15 | 25) ?? 10,
          verified: verifiedOnly || undefined,
          sort,
        });
        setWorkers(res.data.workers);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load workers.');
      } finally {
        setIsLoading(false);
      }
    }
    loadWorkers();
  }, [activeCategory, sort, verifiedOnly, user?.lat, user?.lng, user?.search_radius_km]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-4">
          <h1 className="font-display text-xl font-semibold text-ink-900">{t('hire.browseTitle')}</h1>
          <p className="text-sm text-ink-500">{t('hire.browseSubtitle')}</p>
        </header>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              activeCategory === null ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                activeCategory === cat.id ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              <CategoryIcon icon={cat.icon} />
              {cat.name_en}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {(['rating', 'distance', 'trust'] as SortOption[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  sort === s ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
                }`}
              >
                {t(`hire.sort${s.charAt(0).toUpperCase() + s.slice(1)}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium ${
              verifiedOnly ? 'bg-trust-500 text-white' : 'bg-ink-100 text-ink-700'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            {t('hire.verifiedOnly')}
          </button>
        </div>

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

        <button
          type="button"
          onClick={() => navigate('/become-a-worker')}
          className="mt-6 w-full rounded border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500"
        >
          {t('hire.becomeWorkerTitle')}
        </button>
      </div>
    </div>
  );
}
