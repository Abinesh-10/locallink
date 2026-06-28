import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { marketApi } from '@/features/market/api';
import { OrderCard, OrderRow } from '@/features/market/components/OrderCard';
import { Button } from '@/components/ui/Button';

export function OrdersMinePage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await marketApi.listMyOrders();
      setOrders(res.data.orders);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(orderId: string) {
    setActingId(orderId);
    try {
      await marketApi.updateOrderStatus(orderId, 'cancelled');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel order.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('market.myOrdersTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && orders.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('market.noOrdersMine')}</p>}

        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              otherPartyLabel={o.seller_name || ''}
              actions={
                o.status === 'interested' ? (
                  <Button type="button" variant="secondary" className="flex-1" isLoading={actingId === o.id} onClick={() => handleCancel(o.id)}>
                    {t('market.cancelOrder')}
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
