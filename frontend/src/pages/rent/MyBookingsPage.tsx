import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rentApi } from '@/features/rent/api';
import { BookingCard, BookingRow } from '@/features/rent/components/BookingCard';
import { RentReviewModal } from '@/features/rent/components/RentReviewModal';
import { Button } from '@/components/ui/Button';

interface MyBookingRow extends BookingRow {
  listing_id: string;
}

export function MyBookingsPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<MyBookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ listingId: string; bookingId: string } | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await rentApi.listMyBookings();
      setBookings(res.data.bookings);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load bookings.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(bookingId: string) {
    setActingId(bookingId);
    try {
      await rentApi.updateBookingStatus(bookingId, 'cancelled');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel booking.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('rent.myBookingsTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && bookings.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('rent.noBookingsMine')}</p>}

        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              otherPartyLabel={b.owner_name || ''}
              actions={
                b.status === 'requested' ? (
                  <Button type="button" variant="secondary" className="flex-1" isLoading={actingId === b.id} onClick={() => handleCancel(b.id)}>
                    {t('rent.cancelBooking')}
                  </Button>
                ) : b.status === 'returned' && !reviewedIds.has(b.id) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setReviewTarget({ listingId: b.listing_id, bookingId: b.id })}
                  >
                    {t('rent.leaveReview')}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>

      {reviewTarget && (
        <RentReviewModal
          listingId={reviewTarget.listingId}
          bookingId={reviewTarget.bookingId}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewedIds((prev) => new Set(prev).add(reviewTarget.bookingId));
            setReviewTarget(null);
          }}
        />
      )}
    </div>
  );
}
