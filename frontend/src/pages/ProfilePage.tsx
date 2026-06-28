import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

const ROLE_LABELS: Record<string, string> = {
  customer: 'Customer',
  worker: 'Worker',
  item_owner: 'Item Owner',
  seller: 'Seller',
  trainer: 'Trainer',
  volunteer: 'Volunteer',
  admin: 'Admin',
};

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [isTogglingVolunteer, setIsTogglingVolunteer] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/auth/login', { replace: true });
  }

  async function handleToggleVolunteer() {
    if (!user) return;
    setIsTogglingVolunteer(true);
    try {
      if (user.roles.includes('volunteer')) {
        await apiClient.delete('/users/me/roles/volunteer');
      } else {
        await apiClient.post('/users/me/roles', { role: 'volunteer' });
      }
      await refreshUser();
    } finally {
      setIsTogglingVolunteer(false);
    }
  }

  if (!user) return null;

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-display font-semibold text-brand-700">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.full_name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              user.full_name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink-900">{user.full_name}</h1>
            <p className="text-sm text-ink-500">{user.email || user.phone}</p>
          </div>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-500">{t('profile.myRoles')}</h2>
          <div className="flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span key={role} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
                {ROLE_LABELS[role] || role}
              </span>
            ))}
          </div>
        </section>

        <Link
          to="/profile/verify"
          className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
        >
          {t('hire.verifyTitle')}
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        {user.roles.includes('worker') && (
          <>
            <Link
              to="/become-a-worker"
              className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
            >
              Edit worker profile
              <ChevronRight className="h-4 w-4 text-ink-300" />
            </Link>
            <Link
              to="/requests/inbox"
              className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
            >
              {t('hire.inboxTitle')}
              <ChevronRight className="h-4 w-4 text-ink-300" />
            </Link>
          </>
        )}

        <Link
          to="/requests/sent"
          className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
        >
          {t('hire.sentTitle')}
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        {user.roles.includes('item_owner') && (
          <>
            <Link
              to="/list-an-item"
              className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
            >
              {t('rent.myListings')}
              <ChevronRight className="h-4 w-4 text-ink-300" />
            </Link>
            <Link
              to="/bookings/owner"
              className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
            >
              {t('rent.ownerBookingsTitle')}
              <ChevronRight className="h-4 w-4 text-ink-300" />
            </Link>
          </>
        )}

        <Link
          to="/bookings/mine"
          className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
        >
          {t('rent.myBookingsTitle')}
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        {user.roles.includes('seller') && (
          <>
            <Link
              to="/sell"
              className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
            >
              {t('market.myListings')}
              <ChevronRight className="h-4 w-4 text-ink-300" />
            </Link>
            <Link
              to="/orders/seller"
              className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
            >
              {t('market.sellerOrdersTitle')}
              <ChevronRight className="h-4 w-4 text-ink-300" />
            </Link>
          </>
        )}

        <Link
          to="/orders/mine"
          className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
        >
          {t('market.myOrdersTitle')}
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        <Link
          to="/profile/emergency-contacts"
          className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
        >
          Emergency contacts
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        <button
          type="button"
          onClick={handleToggleVolunteer}
          disabled={isTogglingVolunteer}
          className="flex w-full items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-left text-sm font-medium text-ink-900 disabled:opacity-50"
        >
          {user.roles.includes('volunteer') ? 'Stop volunteering' : t('community.becomeVolunteerPrompt')}
          <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${user.roles.includes('volunteer') ? 'bg-trust-500' : 'bg-ink-100'}`}>
            <span
              className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                user.roles.includes('volunteer') ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </span>
        </button>

        {user.roles.includes('trainer') && (
          <Link
            to="/my-courses"
            className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
          >
            {t('learn.myCourses')}
            <ChevronRight className="h-4 w-4 text-ink-300" />
          </Link>
        )}

        <Link
          to="/my-enrollments"
          className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
        >
          {t('learn.myEnrollmentsTitle')}
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        <Link
          to="/settings/language"
          className="flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900"
        >
          {t('profile.language')}
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        {user.roles.includes('admin') && (
          <Link
            to="/admin"
            className="flex items-center justify-between rounded border border-brand-500 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700"
          >
            {t('admin.dashboardTitle')}
            <ChevronRight className="h-4 w-4 text-brand-500" />
          </Link>
        )}

        <Button type="button" variant="secondary" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {t('profile.logout')}
        </Button>
      </div>
    </div>
  );
}
