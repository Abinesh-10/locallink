import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, Flag, FolderTree, BarChart3 } from 'lucide-react';
import { adminApi } from '@/features/admin/api';

interface AnalyticsOverview {
  dau: number;
  newListingsToday: number;
  newRequestsToday: number;
  totalUsers: number;
  openReports: number;
  pendingVerifications: number;
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  useEffect(() => {
    adminApi
      .getAnalyticsOverview()
      .then((res) => setOverview(res.data.overview))
      .catch(() => null);
  }, []);

  const links = [
    { to: '/admin/users', icon: Users, label: t('admin.users'), badge: overview?.totalUsers },
    { to: '/admin/verifications', icon: ShieldCheck, label: t('admin.verifications'), badge: overview?.pendingVerifications },
    { to: '/admin/reports', icon: Flag, label: t('admin.reports'), badge: overview?.openReports },
    { to: '/admin/categories', icon: FolderTree, label: t('admin.categories') },
    { to: '/admin/analytics', icon: BarChart3, label: t('admin.analytics') },
  ];

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 font-display text-xl font-semibold text-ink-900">{t('admin.dashboardTitle')}</h1>

        {overview && (
          <div className="mb-6 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-ink-100 bg-white p-3 text-center">
              <p className="text-xl font-semibold text-ink-900">{overview.dau}</p>
              <p className="text-xs text-ink-500">{t('admin.dau')}</p>
            </div>
            <div className="rounded-lg border border-ink-100 bg-white p-3 text-center">
              <p className="text-xl font-semibold text-ink-900">{overview.newListingsToday}</p>
              <p className="text-xs text-ink-500">{t('admin.newListingsToday')}</p>
            </div>
            <div className="rounded-lg border border-ink-100 bg-white p-3 text-center">
              <p className="text-xl font-semibold text-ink-900">{overview.newRequestsToday}</p>
              <p className="text-xs text-ink-500">{t('admin.newRequestsToday')}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {links.map(({ to, icon: Icon, label, badge }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-lg border border-ink-100 bg-white p-4">
              <Icon className="h-5 w-5 text-ink-500" />
              <span className="flex-1 font-medium text-ink-900">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">{badge}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
