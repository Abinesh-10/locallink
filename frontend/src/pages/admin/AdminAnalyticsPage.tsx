import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/features/admin/api';

interface AnalyticsOverview {
  dau: number;
  newListingsToday: number;
  newRequestsToday: number;
  totalUsers: number;
  openReports: number;
  pendingVerifications: number;
}

export function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getAnalyticsOverview()
      .then((res) => setOverview(res.data.overview))
      .finally(() => setIsLoading(false));
  }, []);

  const cards = overview
    ? [
        { label: t('admin.dau'), value: overview.dau },
        { label: t('admin.totalUsers'), value: overview.totalUsers },
        { label: t('admin.newListingsToday'), value: overview.newListingsToday },
        { label: t('admin.newRequestsToday'), value: overview.newRequestsToday },
        { label: t('admin.openReports'), value: overview.openReports },
        { label: t('admin.pendingVerifications'), value: overview.pendingVerifications },
      ]
    : [];

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/admin')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('admin.dashboardTitle')}
        </button>

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('admin.analytics')}</h1>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <div key={card.label} className="rounded-lg border border-ink-100 bg-white p-4 text-center">
                <p className="font-display text-2xl font-semibold text-ink-900">{card.value}</p>
                <p className="mt-1 text-xs text-ink-500">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-ink-400">
          DAU is approximated from users whose record was last touched in the past 24h — there's no dedicated
          session/activity log, so this undercounts pure-browsing visits with no writes.
        </p>
      </div>
    </div>
  );
}
