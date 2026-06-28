import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Siren, X } from 'lucide-react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';

interface SosAlertPayload {
  requestId: string;
  lat: number;
  lng: number;
  description: string | null;
  createdAt: string;
}

export function SosAlertListener() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [alert, setAlert] = useState<SosAlertPayload | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = connectSocket();
    function handleSosAlert(payload: SosAlertPayload) {
      setAlert(payload);
    }
    socket.on('sos:alert', handleSosAlert);

    return () => {
      socket.off('sos:alert', handleSosAlert);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  if (!alert) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[60] bg-sos-500 px-4 py-3 text-white shadow-md"
    >
      <div className="mx-auto flex max-w-md items-start gap-3">
        <Siren className="mt-0.5 h-5 w-5 shrink-0 animate-pulse" />
        <button
          type="button"
          onClick={() => {
            navigate(`/community/${alert.requestId}`);
            setAlert(null);
          }}
          className="flex-1 text-left text-sm font-medium"
        >
          {alert.description || 'Someone nearby needs urgent help.'}
        </button>
        <button type="button" onClick={() => setAlert(null)} aria-label={t('common.cancel')}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
