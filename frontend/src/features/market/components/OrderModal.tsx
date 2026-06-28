import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { marketApi } from '@/features/market/api';

interface OrderModalProps {
  productId: string;
  maxQty: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function OrderModal({ productId, maxQty, onClose, onSuccess }: OrderModalProps) {
  const { t } = useTranslation();
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await marketApi.createOrder(productId, qty, message || undefined);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send your interest.');
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
          <h2 className="font-display text-lg font-semibold text-ink-900">{t('market.orderModalTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>

        <div className="space-y-4">
          {maxQty > 1 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('market.orderQtyLabel')}</label>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('market.orderMessageLabel')}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t('market.orderMessagePlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>
          {error && <p className="text-sm text-sos-500">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('market.contactSeller')}
          </Button>
        </div>
      </form>
    </div>
  );
}
