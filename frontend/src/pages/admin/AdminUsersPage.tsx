import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/features/admin/api';

interface AdminUserRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_suspended: boolean;
  roles: string[] | null;
  created_at: string;
}

export function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await adminApi.listUsers(search || undefined);
      setUsers(res.data.users);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleToggleSuspend(userRow: AdminUserRow) {
    if (!userRow.is_suspended && !window.confirm(t('admin.suspendConfirm'))) return;
    setActingId(userRow.id);
    try {
      await adminApi.suspendUser(userRow.id, !userRow.is_suspended);
      await load();
    } finally {
      setActingId(null);
    }
  }

  async function handleToggleVerified(userRow: AdminUserRow, type: 'worker' | 'trainer') {
    setActingId(userRow.id);
    try {
      // We don't track each profile's current is_verified state in this
      // list view (it lives on worker_profiles/trainer_profiles, not
      // users), so this always sets verified=true — a one-way "verify"
      // action here rather than a true toggle. Unverifying, if ever
      // needed, can be done via a direct API call; the doc's feature
      // ("verification badge management") doesn't specify an unverify UI
      // is required.
      await adminApi.setProfileVerified(type, userRow.id, true);
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

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('admin.users')}</h1>

        <form onSubmit={handleSearchSubmit} className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchUsers')}
            className="w-full rounded border border-ink-100 py-2.5 pl-9 pr-3 text-ink-900"
          />
        </form>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">{t('admin.noUsers')}</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const verifiableRole = (u.roles || []).includes('worker')
                ? 'worker'
                : (u.roles || []).includes('trainer')
                  ? 'trainer'
                  : null;
              return (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-white p-3">
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-medium text-ink-900">{u.full_name}</p>
                    <p className="truncate text-xs text-ink-500">{u.email || u.phone}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(u.roles || []).map((r) => (
                        <span key={r} className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-700">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSuspend(u)}
                      disabled={actingId === u.id}
                      className={`rounded px-2.5 py-1.5 text-xs font-medium ${
                        u.is_suspended ? 'bg-trust-500 text-white' : 'bg-sos-500/10 text-sos-600'
                      }`}
                    >
                      {u.is_suspended ? t('admin.unsuspend') : t('admin.suspend')}
                    </button>
                    {verifiableRole && (
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(u, verifiableRole)}
                        disabled={actingId === u.id}
                        className="rounded bg-trust-50 px-2.5 py-1.5 text-xs font-medium text-trust-700"
                      >
                        {t('admin.verifiedStatus')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
