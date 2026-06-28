import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { hireApi } from '@/features/hire/api';

interface RequestServiceModalProps {
  workerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestServiceModal({ workerId, onClose, onSuccess }: RequestServiceModalProps) {
  const { t } = useTranslation();
  const [scheduledFor, setScheduledFor] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await hireApi.createServiceRequest(
        workerId,
        scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        description || undefined
      );
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send request.');
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
          <h2 className="font-display text-lg font-semibold text-ink-900">{t('hire.requestModalTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('hire.requestDateLabel')}</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('hire.requestDescriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>
          {error && <p className="text-sm text-sos-500">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('hire.requestService')}
          </Button>
        </div>
      </form>
    </div>
  );
}
