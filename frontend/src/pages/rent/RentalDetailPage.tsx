import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Star, Truck, MapPin, MessageSquare } from 'lucide-react';
import { rentApi } from '@/features/rent/api';
import { chatApi } from '@/features/chat/api';
import { ReportButton } from '@/features/reports/components/ReportButton';
import { VerifiedBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BookingModal } from '@/features/rent/components/BookingModal';
import { useAuth } from '@/lib/auth';

interface ListingDetail {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  hourly_rate: string | null;
  daily_rate: string | null;
  weekly_rate: string | null;
  deposit: string;
  delivery_option: 'pickup' | 'delivery' | 'both';
  photos: string[];
  owner_name: string;
  owner_photo_url: string | null;
  category_names: Record<string, string> | null;
  is_verified_seller: boolean;
  rating_avg: string;
  rating_count: number;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
}

const DELIVERY_LABEL_KEY: Record<string, string> = {
  pickup: 'rent.deliveryPickup',
  delivery: 'rent.deliveryDelivery',
  both: 'rent.deliveryBoth',
};

export function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingRequested, setBookingRequested] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    if (!id) return;
    rentApi
      .getListing(id)
      .then((res) => {
        setListing(res.data.listing);
        setReviews(res.data.reviews);
      })
      .catch((err) => setError(err.response?.data?.detail || 'Listing not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !listing) {
    return <p className="px-4 py-8 text-center text-sm text-sos-500">{error}</p>;
  }

  const isOwnListing = user?.id === listing.owner_id;

  async function handleStartChat() {
    setIsStartingChat(true);
    try {
      const res = await chatApi.startChat(listing.owner_id);
      navigate(`/messages/${res.data.room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start chat.');
    } finally {
      setIsStartingChat(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        {listing.photos?.length > 0 ? (
          <img src={listing.photos[0]} alt={listing.title} className="mb-4 h-48 w-full rounded-lg object-cover" />
        ) : (
          <div className="mb-4 h-48 w-full rounded-lg bg-trust-50" />
        )}

        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-ink-900">{listing.title}</h1>
          {listing.is_verified_seller && <VerifiedBadge label={t('rent.verifiedSeller')} />}
        </div>
        <p className="mt-1 text-sm text-ink-500">{listing.category_names?.en}</p>
        {!isOwnListing && (
          <div className="mt-1">
            <ReportButton targetType="rental_listing" targetId={listing.id} />
          </div>
        )}

        <div className="mt-3 flex items-center gap-4 text-sm">
          {listing.rating_count > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-600">
              <Star className="h-4 w-4 fill-current" />
              {parseFloat(listing.rating_avg).toFixed(1)} ({listing.rating_count})
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-ink-500">
            <Truck className="h-4 w-4" />
            {t(DELIVERY_LABEL_KEY[listing.delivery_option])}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {listing.hourly_rate && (
            <span className="font-medium text-ink-900">₹{parseFloat(listing.hourly_rate).toFixed(0)}{t('rent.perHour')}</span>
          )}
          {listing.daily_rate && (
            <span className="font-medium text-ink-900">₹{parseFloat(listing.daily_rate).toFixed(0)}{t('rent.perDay')}</span>
          )}
          {listing.weekly_rate && (
            <span className="font-medium text-ink-900">₹{parseFloat(listing.weekly_rate).toFixed(0)}{t('rent.perWeek')}</span>
          )}
          {parseFloat(listing.deposit) > 0 && (
            <span className="text-ink-500">{t('rent.depositAmount', { amount: parseFloat(listing.deposit).toFixed(0) })}</span>
          )}
        </div>

        {listing.description && <p className="mt-4 text-sm leading-relaxed text-ink-700">{listing.description}</p>}

        <div className="mt-4 flex items-center gap-2 text-sm text-ink-500">
          <MapPin className="h-4 w-4" />
          {listing.owner_name}
        </div>

        {!isOwnListing && (
          <div className="mt-6 space-y-2">
            {bookingRequested ? (
              <p className="rounded border border-trust-300 bg-trust-50 px-4 py-3 text-center text-sm text-trust-700">
                {t('rent.bookingRequested')}
              </p>
            ) : (
              <Button type="button" className="w-full" onClick={() => setShowBookingModal(true)}>
                {t('rent.bookNow')}
              </Button>
            )}
            <Button type="button" variant="secondary" className="w-full" isLoading={isStartingChat} onClick={handleStartChat}>
              <MessageSquare className="h-4 w-4" />
              {t('chat.startChat')}
            </Button>
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{t('rent.reviews')}</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-ink-500">{t('rent.noReviews')}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded border border-ink-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-900">{r.reviewer_name}</span>
                    <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {r.rating}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-ink-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showBookingModal && listing && (
        <BookingModal
          listingId={listing.id}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            setBookingRequested(true);
          }}
        />
      )}
    </div>
  );
}
