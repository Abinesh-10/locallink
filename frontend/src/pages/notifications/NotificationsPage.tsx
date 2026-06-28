import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { notificationsApi } from '@/features/notifications/api';

interface NotificationRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

const TYPE_LABEL_KEY: Record<string, string> = {
  service_request_new: 'notifications.serviceRequestNew',
  service_request_status: 'notifications.serviceRequestStatus',
  booking_new: 'notifications.bookingNew',
  booking_status: 'notifications.bookingStatus',
  order_new: 'notifications.orderNew',
  order_status: 'notifications.orderStatus',
  review_new: 'notifications.reviewNew',
  community_response: 'notifications.communityResponse',
  enrollment_new: 'notifications.enrollmentNew',
  enrollment_status: 'notifications.enrollmentStatus',
  chat_message: 'notifications.chatMessage',
};

export function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data.notifications);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    try {
      await notificationsApi.markAsRead(id);
    } catch {
      await load();
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      await load();
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold text-ink-900">{t('notifications.title')}</h1>
          {notifications.some((n) => !n.read_at) && (
            <button type="button" onClick={handleMarkAllRead} className="text-sm font-medium text-brand-500">
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && notifications.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('notifications.noNotifications')}</p>
        )}

        <div className="space-y-1">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.read_at && handleMarkRead(n.id)}
              className={`flex w-full items-start gap-3 rounded-lg p-3 text-left ${n.read_at ? '' : 'bg-brand-50'}`}
            >
              <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read_at ? 'text-ink-300' : 'text-brand-500'}`} />
              <div>
                <p className={`text-sm ${n.read_at ? 'text-ink-700' : 'font-medium text-ink-900'}`}>
                  {t(TYPE_LABEL_KEY[n.type] || n.type)}
                </p>
                <p className="text-xs text-ink-400">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
