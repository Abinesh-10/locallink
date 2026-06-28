import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/Badge';

export interface ProductSearchResult {
  id: string;
  title: string;
  price: string;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  qty: number;
  photos: string[];
  seller_name: string;
  seller_photo_url: string | null;
  category_names: Record<string, string> | null;
  is_verified_seller: boolean;
  distance_km: string | null;
}

const CONDITION_LABEL_KEY: Record<string, string> = {
  new: 'market.conditionNew',
  like_new: 'market.conditionLikeNew',
  used: 'market.conditionUsed',
  refurbished: 'market.conditionRefurbished',
};

export function ProductCard({ product }: { product: ProductSearchResult }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categoryName = product.category_names?.en;

  return (
    <button
      type="button"
      onClick={() => navigate(`/products/${product.id}`)}
      className="flex w-full items-center gap-3 rounded-lg border border-ink-100 bg-white p-3 text-left transition-shadow hover:shadow-sm"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50">
        {product.photos?.[0] ? (
          <img src={product.photos[0]} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-6 w-6 text-brand-500" />
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-ink-900">{product.title}</h3>
          {product.is_verified_seller && <VerifiedBadge label="✓" />}
        </div>
        <p className="truncate text-sm text-ink-500">
          {categoryName ? `${categoryName} · ` : ''}
          {t(CONDITION_LABEL_KEY[product.condition])}
        </p>
        {product.distance_km && <p className="mt-0.5 text-xs text-ink-500">{parseFloat(product.distance_km).toFixed(1)} km</p>}
      </div>

      <div className="shrink-0 text-right text-sm font-medium text-ink-900">₹{parseFloat(product.price).toFixed(0)}</div>
    </button>
  );
}
