import { useTranslation } from 'react-i18next';
import { Check, CheckCheck, MapPin } from 'lucide-react';
import { ReactNode } from 'react';

export interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'location';
  body: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export function MessageBubble({ message, isMine }: { message: ChatMessageRow; isMine: boolean }) {
  const { t } = useTranslation();

  let content: ReactNode;
  if (message.type === 'image') {
    content = <img src={message.body} alt="" className="max-w-[200px] rounded-lg" />;
  } else if (message.type === 'location') {
    let coords: { lat: number; lng: number } | null = null;
    try {
      coords = JSON.parse(message.body);
    } catch {
      coords = null;
    }
    content = coords ? (
      <a
        href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 underline"
      >
        <MapPin className="h-4 w-4" />
        {t('chat.viewLocation')}
      </a>
    ) : (
      <span>{t('chat.locationMessage')}</span>
    );
  } else {
    content = <span className="whitespace-pre-wrap">{message.body}</span>;
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isMine ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-900'
        }`}
      >
        {content}
        {isMine && (
          <div className="mt-1 flex items-center justify-end gap-1 text-xs opacity-70">
            {message.read_at ? (
              <CheckCheck className="h-3 w-3" />
            ) : message.delivered_at ? (
              <Check className="h-3 w-3" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
