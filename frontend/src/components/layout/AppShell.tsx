import { Outlet, NavLink } from 'react-router-dom';
import { Home, User, MessageCircle, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SosAlertListener } from '@/features/community/components/SosAlertListener';
import { useUnreadCounts } from '@/lib/useUnreadCounts';

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sos-500 px-1 text-[10px] font-medium text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { unreadChats, unreadNotifications } = useUnreadCounts();

  return (
    <div className="min-h-screen bg-ink-50 pb-20">
      <SosAlertListener />
      <Outlet />

      <nav className="fixed bottom-0 left-0 right-0 border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium ${
                isActive ? 'text-brand-500' : 'text-ink-500'
              }`
            }
          >
            <Home className="h-5 w-5" />
            {t('common.appName')}
          </NavLink>
          <NavLink
            to="/messages"
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium ${
                isActive ? 'text-brand-500' : 'text-ink-500'
              }`
            }
          >
            <span className="relative">
              <MessageCircle className="h-5 w-5" />
              <NavBadge count={unreadChats} />
            </span>
            {t('chat.messagesTitle')}
          </NavLink>
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium ${
                isActive ? 'text-brand-500' : 'text-ink-500'
              }`
            }
          >
            <span className="relative">
              <Bell className="h-5 w-5" />
              <NavBadge count={unreadNotifications} />
            </span>
            {t('notifications.title')}
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium ${
                isActive ? 'text-brand-500' : 'text-ink-500'
              }`
            }
          >
            <User className="h-5 w-5" />
            {t('profile.title')}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
