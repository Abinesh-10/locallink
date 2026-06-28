import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/features/admin/api';
import { Button } from '@/components/ui/Button';

interface AdminReportRow {
  id: string;
  reporter_id: string;
  reporter_name: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed' | 'actioned';
  created_at: string;
}

const STATUS_FILTERS = ['open', 'reviewed', 'dismissed', 'actioned'] as const;

const STATUS_LABEL_KEY: Record<string, string> = {
  open: 'admin.openReports',
  reviewed: 'admin.reviewedStatus',
  dismissed: 'admin.dismissedStatus',
  actioned: 'admin.actionedStatus',
};

export function AdminReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await adminApi.listReports(statusFilter || undefined);
      setReports(res.data.reports);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleUpdate(id: string, status: 'reviewed' | 'dismissed' | 'actioned') {
    setActingId(id);
    try {
      await adminApi.updateReport(id, status);
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

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('admin.reports')}</h1>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                statusFilter === s ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              {t(STATUS_LABEL_KEY[s])}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">{t('admin.noReports')}</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="rounded-lg border border-ink-100 bg-white p-3">
                <p className="text-xs font-medium text-ink-500">
                  {r.target_type} · reported by {r.reporter_name}
                </p>
                <p className="mt-1 text-sm text-ink-900">{r.reason}</p>
                {r.status === 'open' && (
                  <div className="mt-2 flex gap-2">
                    <Button type="button" className="flex-1" isLoading={actingId === r.id} onClick={() => handleUpdate(r.id, 'actioned')}>
                      {t('admin.markActioned')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      isLoading={actingId === r.id}
                      onClick={() => handleUpdate(r.id, 'dismissed')}
                    >
                      {t('admin.dismiss')}
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
