import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Armchair, Tv, Shirt, Wheat, Cookie, BookOpen, Package } from 'lucide-react';
import { marketApi } from '@/features/market/api';
import { ProductCard, ProductSearchResult } from '@/features/market/components/ProductCard';
import { useAuth } from '@/lib/auth';

interface ProductCategory {
  id: string;
  slug: string;
  names: Record<string, string>;
}

// product_categories has no icon column (unlike service/rental categories,
// per migration 0007) — icons are mapped locally by slug instead of read
// from the API.
const CATEGORY_ICONS: Record<string, typeof Armchair> = {
  furniture: Armchair,
  electronics: Tv,
  clothing: Shirt,
  'farm-produce': Wheat,
  'homemade-goods': Cookie,
  books: BookOpen,
};

function CategoryIcon({ slug }: { slug: string }) {
  const Icon = CATEGORY_ICONS[slug] || Package;
  return <Icon className="h-3.5 w-3.5" />;
}

const CONDITIONS = ['new', 'like_new', 'used', 'refurbished'] as const;

// Explicit map rather than deriving the i18n key from the enum value via
// string transforms — fragile string manipulation (e.g. trying to turn
// 'like_new' into 'LikeNew' programmatically) is exactly the kind of thing
// that looks clever but breaks silently; an explicit lookup is safer.
const CONDITION_LABEL_KEY: Record<string, string> = {
  new: 'market.conditionNew',
  like_new: 'market.conditionLikeNew',
  used: 'market.conditionUsed',
  refurbished: 'market.conditionRefurbished',
};

export function MarketBrowsePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCondition, setActiveCondition] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    marketApi
      .getProductCategories()
      .then((res) => setCategories(res.data.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await marketApi.searchListings({
          category: activeCategory || undefined,
          condition: activeCondition || undefined,
          lat: user?.lat ?? undefined,
          lng: user?.lng ?? undefined,
          radius: (user?.search_radius_km as 5 | 10 | 15 | 25) ?? 10,
        });
        setProducts(res.data.listings);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load listings.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [activeCategory, activeCondition, user?.lat, user?.lng, user?.search_radius_km]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-4">
          <h1 className="font-display text-xl font-semibold text-ink-900">{t('market.browseTitle')}</h1>
          <p className="text-sm text-ink-500">{t('market.browseSubtitle')}</p>
        </header>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
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
              <CategoryIcon slug={cat.slug} />
              {cat.names?.en}
            </button>
          ))}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCondition(null)}
            className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium ${
              activeCondition === null ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
            }`}
          >
            Any condition
          </button>
          {CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCondition(c)}
              className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium ${
                activeCondition === c ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              {t(CONDITION_LABEL_KEY[c])}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && products.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('market.noResults')}</p>
        )}

        <div className="space-y-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/sell')}
          className="mt-6 w-full rounded border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500"
        >
          {t('market.sellItemTitle')}
        </button>
      </div>
    </div>
  );
}
