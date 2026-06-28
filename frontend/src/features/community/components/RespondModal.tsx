import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { communityApi } from '@/features/community/api';

interface RespondModalProps {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RespondModal({ requestId, onClose, onSuccess }: RespondModalProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await communityApi.respond(requestId, message || undefined);
      onSuccess();
    } catch (err: any) {
      if (err.response?.data?.title === 'already_responded') {
        setError(t('community.alreadyResponded'));
      } else {
        setError(err.response?.data?.detail || 'Failed to send your offer to help.');
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
          <h2 className="font-display text-lg font-semibold text-ink-900">{t('community.respondModalTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('community.respondMessageLabel')}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('community.respondMessagePlaceholder')}
          className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
        />

        {error && <p className="mt-2 text-sm text-sos-500">{error}</p>}

        <Button type="submit" className="mt-4 w-full" isLoading={isLoading}>
          {t('community.respondButton')}
        </Button>
      </form>
    </div>
  );
}
