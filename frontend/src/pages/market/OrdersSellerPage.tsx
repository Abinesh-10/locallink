import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { marketApi } from '@/features/market/api';
import { OrderCard, OrderRow } from '@/features/market/components/OrderCard';
import { Button } from '@/components/ui/Button';

export function OrdersSellerPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await marketApi.listSellerOrders();
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

  async function handleAction(orderId: string, status: string) {
    setActingId(orderId);
    try {
      await marketApi.updateOrderStatus(orderId, status);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update order.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('market.sellerOrdersTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && orders.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('market.noOrdersSeller')}</p>}

        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              otherPartyLabel={o.buyer_name || ''}
              actions={
                o.status === 'interested' ? (
                  <>
                    <Button type="button" className="flex-1" isLoading={actingId === o.id} onClick={() => handleAction(o.id, 'accepted')}>
                      {t('market.accept')}
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1" isLoading={actingId === o.id} onClick={() => handleAction(o.id, 'declined')}>
                      {t('market.decline')}
                    </Button>
                  </>
                ) : o.status === 'accepted' ? (
                  <Button type="button" className="flex-1" isLoading={actingId === o.id} onClick={() => handleAction(o.id, 'completed')}>
                    {t('market.markComplete')}
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
