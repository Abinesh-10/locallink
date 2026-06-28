import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/features/admin/api';
import { Button } from '@/components/ui/Button';

interface AdminVerificationRow {
  id: string;
  user_id: string;
  type: 'aadhaar' | 'driving_license' | 'gst';
  status: 'pending' | 'verified' | 'rejected';
  provider: string | null;
  provider_ref: string | null;
  user_name: string;
  user_email: string | null;
  user_phone: string | null;
  created_at: string;
}

const STATUS_FILTERS = ['pending', 'verified', 'rejected'] as const;

export function AdminVerificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [verifications, setVerifications] = useState<AdminVerificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await adminApi.listVerifications(statusFilter || undefined);
      setVerifications(res.data.verifications);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleReview(id: string, status: 'verified' | 'rejected') {
    setActingId(id);
    try {
      await adminApi.updateVerification(id, status);
      await load();
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/admin')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('admin.dashboardTitle')}
        </button>

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('admin.verifications')}</h1>

        <div className="mb-4 flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                statusFilter === s ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              {t(`admin.${s === 'pending' ? 'pendingVerifications' : s === 'verified' ? 'verifiedStatus' : 'rejectedStatus'}`)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : verifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">{t('admin.noVerifications')}</p>
        ) : (
          <div className="space-y-2">
            {verifications.map((v) => (
              <div key={v.id} className="rounded-lg border border-ink-100 bg-white p-3">
                <p className="text-sm font-medium text-ink-900">{v.user_name}</p>
                <p className="text-xs text-ink-500">
                  {v.type} · {v.user_email || v.user_phone}
                </p>
                {v.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <Button type="button" className="flex-1" isLoading={actingId === v.id} onClick={() => handleReview(v.id, 'verified')}>
                      {t('admin.approve')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      isLoading={actingId === v.id}
                      onClick={() => handleReview(v.id, 'rejected')}
                    >
                      {t('admin.reject')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
