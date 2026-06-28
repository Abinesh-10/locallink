import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Siren, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { communityApi } from '@/features/community/api';

export function SosButton() {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleTap() {
    setError(null);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setError(null);
    setIsSending(true);

    if (!navigator.geolocation) {
      setError(t('community.sosLocationRequired'));
      setIsSending(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await communityApi.sendSos(position.coords.latitude, position.coords.longitude);
          setSent(true);
          setShowConfirm(false);
        } catch (err: any) {
          if (err.response?.data?.title === 'phone_verification_required') {
            setError(t('community.sosPhoneRequired'));
          } else {
            setError(err.response?.data?.detail || 'Failed to send SOS. Please try calling for help directly.');
          }
        } finally {
          setIsSending(false);
        }
      },
      () => {
        setError(t('community.sosLocationRequired'));
        setIsSending(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-sos-500 bg-sos-500/10 px-4 py-3 text-center text-sm font-medium text-sos-600">
        {t('community.sosSent')}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-sos-500 py-4 text-lg font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
      >
        <Siren className="h-6 w-6" />
        {t('community.sosButton')}
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
          onClick={() => !isSending && setShowConfirm(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-sos-600">{t('community.sosConfirmTitle')}</h2>
              {!isSending && (
                <button type="button" onClick={() => setShowConfirm(false)} aria-label={t('common.cancel')}>
                  <X className="h-5 w-5 text-ink-500" />
                </button>
              )}
            </div>
            <p className="mb-4 text-sm text-ink-700">{t('community.sosConfirmBody')}</p>
            {error && <p className="mb-3 text-sm text-sos-500">{error}</p>}
            <Button type="button" variant="sos" className="w-full" isLoading={isSending} onClick={handleConfirm}>
              {t('community.sosConfirmSend')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
