import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { ReactNode } from 'react';

export interface BookingRow {
  id: string;
  status: 'requested' | 'confirmed' | 'declined' | 'returned' | 'cancelled';
  start: string | null;
  end: string | null;
  total_amount: string | null;
  listing_title: string;
  listing_photos: string[];
  owner_name?: string;
  renter_name?: string;
  listing_id?: string;
}

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-trust-50 text-trust-700',
  declined: 'bg-sos-500/10 text-sos-600',
  returned: 'bg-ink-100 text-ink-700',
  cancelled: 'bg-ink-100 text-ink-500',
};

export function BookingCard({
  booking,
  otherPartyLabel,
  actions,
}: {
  booking: BookingRow;
  otherPartyLabel: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink-900">{booking.listing_title}</p>
          <p className="text-sm text-ink-500">{otherPartyLabel}</p>
          {booking.start && booking.end && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(booking.start).toLocaleDateString()} – {new Date(booking.end).toLocaleDateString()}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[booking.status]}`}>
          {t(`rent.status${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`)}
        </span>
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}
