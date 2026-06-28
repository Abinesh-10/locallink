import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';

export interface OrderRow {
  id: string;
  status: 'interested' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  qty: number;
  message: string | null;
  product_title: string;
  product_photos: string[];
  seller_name?: string;
  buyer_name?: string;
}

const STATUS_STYLES: Record<string, string> = {
  interested: 'bg-amber-100 text-amber-700',
  accepted: 'bg-trust-50 text-trust-700',
  declined: 'bg-sos-500/10 text-sos-600',
  completed: 'bg-ink-100 text-ink-700',
  cancelled: 'bg-ink-100 text-ink-500',
};

export function OrderCard({
  order,
  otherPartyLabel,
  actions,
}: {
  order: OrderRow;
  otherPartyLabel: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink-900">{order.product_title}</p>
          <p className="text-sm text-ink-500">
            {otherPartyLabel} · Qty {order.qty}
          </p>
          {order.message && <p className="mt-1 text-sm text-ink-700">{order.message}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}>
          {t(`market.status${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`)}
        </span>
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}
