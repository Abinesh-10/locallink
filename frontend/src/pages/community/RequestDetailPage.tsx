import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Phone } from 'lucide-react';
import { communityApi } from '@/features/community/api';
import { RespondModal } from '@/features/community/components/RespondModal';
import { ReportButton } from '@/features/reports/components/ReportButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { connectSocket } from '@/lib/socket';

interface RequestDetail {
  id: string;
  requester_id: string;
  type: string;
  urgency: string;
  blood_group: string | null;
  title: string;
  description: string | null;
  is_sos: boolean;
  status: 'open' | 'closed';
  requester_name: string;
  requester_photo_url: string | null;
  requester_phone: string | null;
  response_count: string;
  created_at: string;
}

interface ResponseRow {
  id: string;
  responder_name: string;
  responder_phone: string | null;
  message: string | null;
  created_at: string;
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [responseSent, setResponseSent] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const res = await communityApi.getRequest(id);
      setRequest(res.data.request);
      setResponses(res.data.responses);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Request not found.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!request?.is_sos) return;
    const socket = connectSocket();
    function handleNotification(payload: { type: string; requestId: string }) {
      if (payload.type === 'community_response' && payload.requestId === id) {
        load();
      }
    }
    socket.on('notification:new', handleNotification);
    return () => socket.off('notification:new', handleNotification);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.is_sos, id]);

  async function handleClose() {
    if (!id || !window.confirm(t('community.closeConfirm'))) return;
    await communityApi.close(id);
    await load();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !request) {
    return <p className="px-4 py-8 text-center text-sm text-sos-500">{error}</p>;
  }

  const isOwnRequest = user?.id === request.requester_id;
  const responseCount = parseInt(request.response_count, 10);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        {request.is_sos && (
          <div className="mb-3 rounded-full bg-sos-500 px-3 py-1 text-center text-xs font-bold text-white">
            {t('community.typeEmergency').toUpperCase()} SOS
          </div>
        )}

        <h1 className="font-display text-xl font-semibold text-ink-900">{request.title}</h1>
        <p className="mt-1 text-sm text-ink-500">{request.requester_name}</p>
        {!isOwnRequest && (
          <div className="mt-1">
            <ReportButton targetType="community_request" targetId={request.id} />
          </div>
        )}

        {request.blood_group && (
          <span className="mt-2 inline-block rounded-full bg-sos-500/10 px-3 py-1 text-sm font-medium text-sos-600">
            {request.blood_group}
          </span>
        )}

        {request.description && <p className="mt-4 text-sm leading-relaxed text-ink-700">{request.description}</p>}

        {request.requester_phone && (
          <a href={`tel:${request.requester_phone}`} className="mt-4 flex items-center gap-2 text-sm text-brand-500">
            <Phone className="h-4 w-4" />
            {request.requester_phone}
          </a>
        )}

        {request.status === 'closed' && (
          <p className="mt-4 rounded bg-ink-100 px-3 py-2 text-center text-sm text-ink-500">
            {t('community.requestClosed')}
          </p>
        )}

        {!isOwnRequest && request.status === 'open' && (
          <div className="mt-6">
            {responseSent ? (
              <p className="rounded border border-trust-300 bg-trust-50 px-4 py-3 text-center text-sm text-trust-700">
                {t('community.responseSent')}
              </p>
            ) : (
              <Button type="button" className="w-full" onClick={() => setShowRespondModal(true)}>
                {t('community.respondButton')}
              </Button>
            )}
          </div>
        )}

        {isOwnRequest && request.status === 'open' && (
          <Button type="button" variant="secondary" className="mt-6 w-full" onClick={handleClose}>
            {t('community.closeRequest')}
          </Button>
        )}

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">
            {request.is_sos ? t('community.helpersOnTheWay', { count: responseCount }) : t('community.responses')}
          </h2>
          {responses.length === 0 ? (
            <p className="text-sm text-ink-500">{t('community.noResponses')}</p>
          ) : (
            <div className="space-y-3">
              {responses.map((r) => (
                <div key={r.id} className="rounded border border-ink-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-900">{r.responder_name}</span>
                    {r.responder_phone && (
                      <a href={`tel:${r.responder_phone}`} className="text-xs text-brand-500">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {r.message && <p className="mt-1 text-sm text-ink-700">{r.message}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showRespondModal && id && (
        <RespondModal
          requestId={id}
          onClose={() => setShowRespondModal(false)}
          onSuccess={() => {
            setShowRespondModal(false);
            setResponseSent(true);
            load();
          }}
        />
      )}
    </div>
  );
}
