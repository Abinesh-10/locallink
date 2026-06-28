import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Package } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/Badge';

export interface ListingSearchResult {
  id: string;
  title: string;
  owner_name: string;
  owner_photo_url: string | null;
  category_names: Record<string, string> | null;
  hourly_rate: string | null;
  daily_rate: string | null;
  weekly_rate: string | null;
  deposit: string;
  rating_avg: string;
  rating_count: number;
  photos: string[];
  is_verified_seller: boolean;
  distance_km: string | null;
}

function primaryRate(listing: ListingSearchResult, t: (key: string) => string): string | null {
  if (listing.daily_rate) return `₹${parseFloat(listing.daily_rate).toFixed(0)}${t('rent.perDay')}`;
  if (listing.hourly_rate) return `₹${parseFloat(listing.hourly_rate).toFixed(0)}${t('rent.perHour')}`;
  if (listing.weekly_rate) return `₹${parseFloat(listing.weekly_rate).toFixed(0)}${t('rent.perWeek')}`;
  return null;
}

export function ListingCard({ listing }: { listing: ListingSearchResult }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categoryName = listing.category_names?.en;

  return (
    <button
      type="button"
      onClick={() => navigate(`/rentals/${listing.id}`)}
      className="flex w-full items-center gap-3 rounded-lg border border-ink-100 bg-white p-3 text-left transition-shadow hover:shadow-sm"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-trust-50">
        {listing.photos?.[0] ? (
          <img src={listing.photos[0]} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-6 w-6 text-trust-500" />
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-ink-900">{listing.title}</h3>
          {listing.is_verified_seller && <VerifiedBadge label="✓" />}
        </div>
        <p className="truncate text-sm text-ink-500">
          {categoryName} · {listing.owner_name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          {listing.rating_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <Star className="h-3.5 w-3.5 fill-current" />
              {parseFloat(listing.rating_avg).toFixed(1)} ({listing.rating_count})
            </span>
          )}
          {listing.distance_km && <span>{parseFloat(listing.distance_km).toFixed(1)} km</span>}
        </div>
      </div>

      {primaryRate(listing, t) && (
        <div className="shrink-0 text-right text-sm font-medium text-ink-900">{primaryRate(listing, t)}</div>
      )}
    </button>
  );
}
