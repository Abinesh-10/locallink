import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hireApi } from '@/features/hire/api';
import { RequestCard, ServiceRequestRow } from '@/features/hire/components/RequestCard';
import { ReviewModal } from '@/features/hire/components/ReviewModal';
import { Button } from '@/components/ui/Button';

interface SentRequestRow extends ServiceRequestRow {
  worker_id: string;
}

export function RequestsSentPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<SentRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ workerId: string; requestId: string } | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hireApi.listSentRequests();
      setRequests(res.data.requests);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load requests.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(requestId: string) {
    setActingId(requestId);
    try {
      await hireApi.updateRequestStatus(requestId, 'cancelled');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel request.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('hire.sentTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && requests.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('hire.noRequestsSent')}</p>}

        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              otherPartyLabel={req.worker_name || ''}
              actions={
                req.status === 'pending' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    isLoading={actingId === req.id}
                    onClick={() => handleCancel(req.id)}
                  >
                    {t('hire.cancelRequest')}
                  </Button>
                ) : req.status === 'completed' && !reviewedIds.has(req.id) ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setReviewTarget({ workerId: req.worker_id, requestId: req.id })}
                  >
                    {t('hire.leaveReview')}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>

      {reviewTarget && (
        <ReviewModal
          workerId={reviewTarget.workerId}
          requestId={reviewTarget.requestId}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setReviewedIds((prev) => new Set(prev).add(reviewTarget.requestId));
            setReviewTarget(null);
          }}
        />
      )}
    </div>
  );
}
