import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '@/features/chat/api';

interface ChatRoom {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_photo_url: string | null;
  last_message_body: string | null;
  last_message_type: 'text' | 'image' | 'location' | null;
  last_message_sender_id: string | null;
  unread_count: string;
  last_message_at: string | null;
}

function previewText(room: ChatRoom, t: (key: string) => string): string {
  if (!room.last_message_body) return '';
  if (room.last_message_type === 'image') return t('chat.sendImage');
  if (room.last_message_type === 'location') return t('chat.locationMessage');
  return room.last_message_body;
}

export function MessagesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chatApi
      .listRooms()
      .then((res) => setRooms(res.data.rooms))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load conversations.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('chat.messagesTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && rooms.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('chat.noConversations')}</p>
        )}

        <div className="space-y-1">
          {rooms.map((room) => {
            const unread = parseInt(room.unread_count, 10);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => navigate(`/messages/${room.id}`)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-ink-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-base font-display font-semibold text-brand-700">
                  {room.other_user_photo_url ? (
                    <img src={room.other_user_photo_url} alt={room.other_user_name} className="h-full w-full object-cover" />
                  ) : (
                    room.other_user_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className={`truncate text-sm ${unread > 0 ? 'font-semibold text-ink-900' : 'font-medium text-ink-900'}`}>
                    {room.other_user_name}
                  </p>
                  <p className={`truncate text-xs ${unread > 0 ? 'font-medium text-ink-700' : 'text-ink-500'}`}>
                    {previewText(room, t)}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-medium text-white">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
