import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '@/features/community/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth';

interface LostFoundItem {
  id: string;
  user_id: string;
  kind: 'lost' | 'found';
  title: string;
  description: string | null;
  photos: string[];
  status: 'open' | 'resolved';
  poster_name: string;
  created_at: string;
}

export function LostFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<'lost' | 'found'>('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const res = await communityApi.listLostFound(
        undefined,
        user?.lat ?? undefined,
        user?.lng ?? undefined,
        (user?.search_radius_km as 5 | 10 | 15 | 25) ?? 10
      );
      setItems(res.data.items);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.lat, user?.lng, user?.search_radius_km]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title) {
      setError('Title is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await communityApi.createLostFound({
        kind,
        title,
        description: description || undefined,
        lastSeenLat: user?.lat ?? undefined,
        lastSeenLng: user?.lng ?? undefined,
      });
      setTitle('');
      setDescription('');
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to post.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkResolved(itemId: string) {
    await communityApi.markLostFoundResolved(itemId);
    await load();
  }

  async function handleDelete(itemId: string) {
    if (!window.confirm(t('community.deleteConfirm'))) return;
    await communityApi.deleteLostFound(itemId);
    await load();
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/community')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('community.feedTitle')}
        </button>

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('community.lostFoundTitle')}</h1>

        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mb-4 w-full rounded border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500"
          >
            {t('community.lostFoundNew')}
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-ink-100 bg-white p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKind('lost')}
                className={`flex-1 rounded px-3 py-2 text-sm font-medium ${kind === 'lost' ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'}`}
              >
                {t('community.kindLost')}
              </button>
              <button
                type="button"
                onClick={() => setKind('found')}
                className={`flex-1 rounded px-3 py-2 text-sm font-medium ${kind === 'found' ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'}`}
              >
                {t('community.kindFound')}
              </button>
            </div>
            <TextField label={t('community.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t('community.descriptionPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
            {error && <p className="text-sm text-sos-500">{error}</p>}
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {t('community.lostFoundNew')}
            </Button>
          </form>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">{t('community.noLostFound')}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-ink-100 bg-white p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.kind === 'lost' ? 'bg-sos-500/10 text-sos-600' : 'bg-trust-50 text-trust-700'
                      }`}
                    >
                      {item.kind === 'lost' ? t('community.kindLost') : t('community.kindFound')}
                    </span>
                    <p className="font-medium text-ink-900">{item.title}</p>
                    <p className="text-xs text-ink-500">{item.poster_name}</p>
                  </div>
                  {item.status === 'resolved' ? (
                    <span className="text-xs text-ink-300">{t('community.resolvedLabel')}</span>
                  ) : item.user_id === user?.id ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleMarkResolved(item.id)} className="text-xs font-medium text-trust-500">
                        {t('community.markResolved')}
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)} aria-label={t('market.deleteListing')}>
                        <Trash2 className="h-3.5 w-3.5 text-sos-500" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {item.description && <p className="mt-1.5 text-sm text-ink-700">{item.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
