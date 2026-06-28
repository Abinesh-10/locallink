import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { ReactNode } from 'react';

export interface ServiceRequestRow {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  scheduled_for: string | null;
  description: string | null;
  created_at: string;
  worker_id?: string;
  worker_name?: string;
  worker_photo_url?: string | null;
  customer_name?: string;
  customer_photo_url?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-trust-50 text-trust-700',
  declined: 'bg-sos-500/10 text-sos-600',
  completed: 'bg-ink-100 text-ink-700',
  cancelled: 'bg-ink-100 text-ink-500',
};

export function RequestCard({
  request,
  otherPartyLabel,
  actions,
}: {
  request: ServiceRequestRow;
  otherPartyLabel: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink-900">{otherPartyLabel}</p>
          {request.scheduled_for && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(request.scheduled_for).toLocaleString()}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[request.status]}`}>
          {t(`hire.status${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`)}
        </span>
      </div>
      {request.description && <p className="mt-2 text-sm text-ink-700">{request.description}</p>}
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}
