import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { rentApi } from '@/features/rent/api';

interface BookingModalProps {
  listingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface BlockedPeriod {
  status: string;
  start: string | null;
  end: string | null;
}

export function BookingModal({ listingId, onClose, onSuccess }: BookingModalProps) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);

  // Show the renter what's already booked before they pick dates — the
  // backend's EXCLUDE constraint is the real source of truth and still
  // enforces this server-side, but surfacing it here avoids a guaranteed
  // 409 round-trip for an obviously-taken date range.
  useEffect(() => {
    rentApi
      .getAvailability(listingId)
      .then((res) => setBlockedPeriods(res.data.availability))
      .catch(() => setBlockedPeriods([]))
      .finally(() => setIsLoadingAvailability(false));
  }, [listingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    setIsLoading(true);
    try {
      await rentApi.createBooking(listingId, new Date(startDate).toISOString(), new Date(endDate).toISOString());
      onSuccess();
    } catch (err: any) {
      if (err.response?.data?.title === 'booking_conflict') {
        setError(t('rent.bookingConflict'));
      } else {
        setError(err.response?.data?.detail || 'Failed to book this item.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-lg bg-white p-5 sm:rounded-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">{t('rent.bookingModalTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>

        {!isLoadingAvailability && blockedPeriods.length > 0 && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <CalendarX className="h-3.5 w-3.5" />
              Already booked
            </p>
            <ul className="space-y-0.5 text-xs text-amber-700">
              {blockedPeriods.map((p, idx) => (
                <li key={idx}>
                  {p.start && new Date(p.start).toLocaleDateString()} – {p.end && new Date(p.end).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('rent.startDateLabel')}</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('rent.endDateLabel')}</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>
          {error && <p className="text-sm text-sos-500">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('rent.bookNow')}
          </Button>
        </div>
      </form>
    </div>
  );
}
