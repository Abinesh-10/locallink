import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rentApi } from '@/features/rent/api';
import { BookingCard, BookingRow } from '@/features/rent/components/BookingCard';
import { Button } from '@/components/ui/Button';

export function OwnerBookingsPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await rentApi.listOwnerBookings();
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

  async function handleAction(bookingId: string, status: string) {
    setActingId(bookingId);
    try {
      await rentApi.updateBookingStatus(bookingId, status);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update booking.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('rent.ownerBookingsTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && bookings.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('rent.noBookingsOwner')}</p>}

        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              otherPartyLabel={b.renter_name || ''}
              actions={
                b.status === 'requested' ? (
                  <>
                    <Button type="button" className="flex-1" isLoading={actingId === b.id} onClick={() => handleAction(b.id, 'confirmed')}>
                      {t('rent.confirm')}
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1" isLoading={actingId === b.id} onClick={() => handleAction(b.id, 'declined')}>
                      {t('rent.decline')}
                    </Button>
                  </>
                ) : b.status === 'confirmed' ? (
                  <Button type="button" className="flex-1" isLoading={actingId === b.id} onClick={() => handleAction(b.id, 'returned')}>
                    {t('rent.markReturned')}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
