import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { hireApi } from '@/features/hire/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

type KycType = 'aadhaar' | 'driving_license' | 'gst';

interface VerificationRow {
  type: KycType;
  status: 'pending' | 'verified' | 'rejected';
}

const TYPES: { type: KycType; labelKey: string }[] = [
  { type: 'aadhaar', labelKey: 'hire.verifyAadhaar' },
  { type: 'driving_license', labelKey: 'hire.verifyDl' },
  { type: 'gst', labelKey: 'hire.verifyGst' },
];

function StatusIcon({ status }: { status?: string }) {
  if (status === 'verified') return <ShieldCheck className="h-5 w-5 text-trust-500" />;
  if (status === 'rejected') return <ShieldAlert className="h-5 w-5 text-sos-500" />;
  if (status === 'pending') return <ShieldQuestion className="h-5 w-5 text-amber-500" />;
  return <ShieldQuestion className="h-5 w-5 text-ink-300" />;
}

export function ProfileVerifyPage() {
  const { t } = useTranslation();
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [activeType, setActiveType] = useState<KycType | null>(null);
  const [documentNumber, setDocumentNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const res = await hireApi.getVerificationStatus();
      setVerifications(res.data.verifications);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function statusFor(type: KycType): string | undefined {
    return verifications.find((v) => v.type === type)?.status;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeType || !documentNumber) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await hireApi.initiateVerification(activeType, documentNumber);
      setDocumentNumber('');
      setActiveType(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit for verification.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('hire.verifyTitle')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('hire.verifySubtitle')}</p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {TYPES.map(({ type, labelKey }) => {
              const status = statusFor(type);
              return (
                <div key={type} className="rounded border border-ink-100 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={status} />
                      <span className="font-medium text-ink-900">{t(labelKey)}</span>
                    </div>
                    {status !== 'verified' && (
                      <button
                        type="button"
                        onClick={() => setActiveType(activeType === type ? null : type)}
                        className="text-sm font-medium text-brand-500"
                      >
                        {status ? 'Retry' : t('hire.verifySubmit')}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {status === 'verified'
                      ? t('hire.verifyStatusVerified')
                      : status === 'pending'
                      ? t('hire.verifyStatusPending')
                      : status === 'rejected'
                      ? t('hire.verifyStatusRejected')
                      : t('hire.verifyNotStarted')}
                  </p>

                  {activeType === type && (
                    <form onSubmit={handleSubmit} className="mt-3 space-y-3 border-t border-ink-100 pt-3">
                      <TextField
                        label={t('hire.verifyDocNumberLabel')}
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                      />
                      {error && <p className="text-sm text-sos-500">{error}</p>}
                      <Button type="submit" className="w-full" isLoading={isSubmitting}>
                        {t('hire.verifySubmit')}
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
