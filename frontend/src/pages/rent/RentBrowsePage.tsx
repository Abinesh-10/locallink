import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Drill, Armchair, PartyPopper, Car, Tv, Dumbbell, Package } from 'lucide-react';
import { rentApi } from '@/features/rent/api';
import { ListingCard, ListingSearchResult } from '@/features/rent/components/ListingCard';
import { useAuth } from '@/lib/auth';

interface RentalCategory {
  id: string;
  slug: string;
  names: Record<string, string>;
  icon: string | null;
}

const CATEGORY_ICONS: Record<string, typeof Drill> = {
  drill: Drill,
  armchair: Armchair,
  'party-popper': PartyPopper,
  car: Car,
  tv: Tv,
  dumbbell: Dumbbell,
};

function CategoryIcon({ icon }: { icon: string | null }) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Package;
  return <Icon className="h-3.5 w-3.5" />;
}

export function RentBrowsePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [listings, setListings] = useState<ListingSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rentApi
      .getRentalCategories()
      .then((res) => setCategories(res.data.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await rentApi.searchListings({
          category: activeCategory || undefined,
          lat: user?.lat ?? undefined,
          lng: user?.lng ?? undefined,
          radius: (user?.search_radius_km as 5 | 10 | 15 | 25) ?? 10,
          verified: verifiedOnly || undefined,
        });
        setListings(res.data.listings);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load listings.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [activeCategory, verifiedOnly, user?.lat, user?.lng, user?.search_radius_km]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-4">
          <h1 className="font-display text-xl font-semibold text-ink-900">{t('rent.browseTitle')}</h1>
          <p className="text-sm text-ink-500">{t('rent.browseSubtitle')}</p>
        </header>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              activeCategory === null ? 'bg-trust-500 text-white' : 'bg-ink-100 text-ink-700'
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
                activeCategory === cat.id ? 'bg-trust-500 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              <CategoryIcon icon={cat.icon} />
              {cat.names?.en}
            </button>
          ))}
        </div>

        <div className="mb-4 flex justify-end">
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
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && listings.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('rent.noResults')}</p>
        )}

        <div className="space-y-2">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/list-an-item')}
          className="mt-6 w-full rounded border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500"
        >
          {t('rent.listItemTitle')}
        </button>
      </div>
    </div>
  );
}
