import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { hireApi } from '@/features/hire/api';

interface ReviewModalProps {
  workerId: string;
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ workerId, requestId, onClose, onSuccess }: ReviewModalProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await hireApi.createReview(workerId, requestId, rating, comment || undefined);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit review.');
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
          <h2 className="font-display text-lg font-semibold text-ink-900">{t('hire.leaveReview')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.cancel')}>
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>

        <div className="mb-4 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setRating(star)} aria-label={`${star} stars`}>
              <Star className={`h-8 w-8 ${star <= rating ? 'fill-amber-500 text-amber-500' : 'text-ink-100'}`} />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Optional comment…"
          className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
        />

        {error && <p className="mt-2 text-sm text-sos-500">{error}</p>}

        <Button type="submit" className="mt-4 w-full" isLoading={isLoading}>
          {t('hire.leaveReview')}
        </Button>
      </form>
    </div>
  );
}
