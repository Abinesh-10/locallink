import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hireApi } from '@/features/hire/api';
import { RequestCard, ServiceRequestRow } from '@/features/hire/components/RequestCard';
import { Button } from '@/components/ui/Button';

export function RequestsInboxPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ServiceRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hireApi.listInboxRequests();
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

  async function handleAction(requestId: string, status: string) {
    setActingId(requestId);
    try {
      await hireApi.updateRequestStatus(requestId, status);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update request.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('hire.inboxTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && requests.length === 0 && <p className="py-8 text-center text-sm text-ink-500">{t('hire.noRequestsInbox')}</p>}

        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              otherPartyLabel={req.customer_name || ''}
              actions={
                req.status === 'pending' ? (
                  <>
                    <Button
                      type="button"
                      className="flex-1"
                      isLoading={actingId === req.id}
                      onClick={() => handleAction(req.id, 'accepted')}
                    >
                      {t('hire.accept')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      isLoading={actingId === req.id}
                      onClick={() => handleAction(req.id, 'declined')}
                    >
                      {t('hire.decline')}
                    </Button>
                  </>
                ) : req.status === 'accepted' ? (
                  <Button type="button" className="flex-1" isLoading={actingId === req.id} onClick={() => handleAction(req.id, 'completed')}>
                    {t('hire.markComplete')}
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
