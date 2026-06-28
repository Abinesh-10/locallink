import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send, Image as ImageIcon, MapPin } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { MessageBubble, ChatMessageRow } from '@/features/chat/components/MessageBubble';
import { connectSocket } from '@/lib/socket';
import { useAuth } from '@/lib/auth';
import { uploadToCloudinary, MAX_IMAGE_SIZE_BYTES } from '@/lib/cloudinary';

const TYPING_EMIT_THROTTLE_MS = 1500;

export function ConversationPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingEmitRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;
    setIsLoading(true);
    chatApi
      .listMessages(roomId)
      .then((res) => {
        // Backend returns newest-first (for cursor pagination); reverse for
        // natural top-to-bottom chat display.
        setMessages([...res.data.messages].reverse());
        scrollToBottom();
      })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load messages.'))
      .finally(() => setIsLoading(false));

    chatApi.markRead(roomId).catch(() => null);
  }, [roomId, scrollToBottom]);

  useEffect(() => {
    if (!roomId) return;
    const socket = connectSocket();

    function handleMessage(payload: { roomId: string; message: ChatMessageRow }) {
      if (payload.roomId !== roomId) return;
      setMessages((prev) => [...prev, payload.message]);
      scrollToBottom();
      // We're actively viewing this room, so mark it read immediately —
      // per the doc's notification trigger note ("new chat message when
      // not in that room"), being in the room is exactly the condition
      // that should suppress further unread accumulation.
      chatApi.markRead(roomId).catch(() => null);
    }
    function handleTyping(payload: { roomId: string }) {
      if (payload.roomId !== roomId) return;
      setOtherTyping(true);
      setTimeout(() => setOtherTyping(false), 3000);
    }
    function handleRead(payload: { roomId: string }) {
      if (payload.roomId !== roomId) return;
      setMessages((prev) => prev.map((m) => (m.sender_id === user?.id ? { ...m, read_at: new Date().toISOString() } : m)));
    }

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:read', handleRead);
    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:read', handleRead);
    };
  }, [roomId, scrollToBottom, user?.id]);

  function handleTextChange(value: string) {
    setText(value);
    if (!roomId) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current < TYPING_EMIT_THROTTLE_MS) return;
    lastTypingEmitRef.current = now;
    connectSocket().emit('chat:typing', { roomId });
  }

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !text.trim()) return;
    setIsSending(true);
    try {
      const res = await chatApi.sendMessage(roomId, 'text', text.trim());
      setMessages((prev) => [...prev, res.data.message]);
      setText('');
      scrollToBottom();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !roomId) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(t('chat.imageTooLarge'));
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const sigRes = await chatApi.getUploadSignature('chat_image');
      const url = await uploadToCloudinary(file, sigRes.data);
      const res = await chatApi.sendMessage(roomId, 'image', url);
      setMessages((prev) => [...prev, res.data.message]);
      scrollToBottom();
    } catch (err: any) {
      setError(err.message || err.response?.data?.detail || 'Failed to send image.');
    } finally {
      setIsSending(false);
    }
  }

  function handleSendLocation() {
    if (!roomId) return;
    if (!navigator.geolocation) {
      setError(t('chat.locationDenied'));
      return;
    }
    setIsSending(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const body = JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude });
          const res = await chatApi.sendMessage(roomId, 'location', body);
          setMessages((prev) => [...prev, res.data.message]);
          scrollToBottom();
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Failed to send location.');
        } finally {
          setIsSending(false);
        }
      },
      () => {
        setError(t('chat.locationDenied'));
        setIsSending(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center gap-2 border-b border-ink-100 bg-white px-4 py-3">
        <button type="button" onClick={() => navigate('/messages')} aria-label={t('common.back')}>
          <ChevronLeft className="h-5 w-5 text-ink-700" />
        </button>
        {otherTyping && <span className="text-sm text-ink-500">{t('chat.typing')}</span>}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={m.sender_id === user?.id} />
        ))}
      </div>

      {error && <p className="px-4 py-1 text-center text-sm text-sos-500">{error}</p>}

      <form onSubmit={handleSendText} className="flex items-center gap-2 border-t border-ink-100 bg-white p-3">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleSendImage} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} aria-label={t('chat.sendImage')}>
          <ImageIcon className="h-5 w-5 text-ink-500" />
        </button>
        <button type="button" onClick={handleSendLocation} aria-label={t('chat.sendLocation')}>
          <MapPin className="h-5 w-5 text-ink-500" />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={t('chat.typeMessage')}
          className="flex-1 rounded-full border border-ink-100 px-4 py-2 text-sm text-ink-900"
        />
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white disabled:opacity-50"
          aria-label={t('chat.send')}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
