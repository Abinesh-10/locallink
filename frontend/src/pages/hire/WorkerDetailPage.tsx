import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Star, Phone, MessageCircle, MessageSquare } from 'lucide-react';
import { hireApi } from '@/features/hire/api';
import { chatApi } from '@/features/chat/api';
import { ReportButton } from '@/features/reports/components/ReportButton';
import { VerifiedBadge, TierBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RequestServiceModal } from '@/features/hire/components/RequestServiceModal';
import { useAuth } from '@/lib/auth';

interface WorkerDetail {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  phone: string | null;
  bio: string | null;
  category_name_en: string | null;
  sub_skills: string[];
  experience_years: number | null;
  hourly_rate: string | null;
  day_rate: string | null;
  portfolio_urls: string[];
  is_verified: boolean;
  rating_avg: string;
  rating_count: number;
  trust_score: string | null;
  tier: string | null;
  completed_jobs: number | null;
  response_rate_pct: number | null;
}

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_photo_url: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

function tierLabelKey(tier: string): string {
  return `hire.tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
}

export function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    if (!id) return;
    hireApi
      .getWorker(id)
      .then((res) => {
        setWorker(res.data.profile);
        setReviews(res.data.reviews);
      })
      .catch((err) => setError(err.response?.data?.detail || 'Worker not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !worker) {
    return <p className="px-4 py-8 text-center text-sm text-sos-500">{error}</p>;
  }

  const isOwnProfile = user?.id === worker.user_id;
  const waNumber = worker.phone?.replace(/[^\d]/g, '');

  async function handleStartChat() {
    setIsStartingChat(true);
    try {
      const res = await chatApi.startChat(worker.user_id);
      navigate(`/messages/${res.data.room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start chat.');
    } finally {
      setIsStartingChat(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-2xl font-display font-semibold text-brand-700">
            {worker.photo_url ? (
              <img src={worker.photo_url} alt={worker.full_name} className="h-full w-full object-cover" />
            ) : (
              worker.full_name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-ink-900">{worker.full_name}</h1>
              {worker.is_verified && <VerifiedBadge label={t('hire.verifiedBadge')} />}
            </div>
            <p className="text-sm text-ink-500">{worker.category_name_en}</p>
            {worker.tier && <TierBadge tier={worker.tier} label={t(tierLabelKey(worker.tier))} />}
            {!isOwnProfile && (
              <div className="mt-1">
                <ReportButton targetType="worker_profile" targetId={worker.user_id} />
              </div>
            )}
          </div>
        </div>

        {/* Reputation panel — per doc: "★★★★★ 4.9 · 215 Jobs Completed · 98% Response Rate" */}
        <div className="mt-4 flex items-center gap-4 rounded-lg bg-ink-50 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-amber-600">
            <Star className="h-4 w-4 fill-current" />
            {parseFloat(worker.rating_avg).toFixed(1)}
          </span>
          <span className="text-ink-500">{t('hire.jobsCompleted', { count: worker.completed_jobs ?? 0 })}</span>
          {worker.response_rate_pct !== null && (
            <span className="text-ink-500">{t('hire.responseRate', { rate: worker.response_rate_pct })}</span>
          )}
        </div>

        {worker.bio && <p className="mt-4 text-sm leading-relaxed text-ink-700">{worker.bio}</p>}

        {worker.sub_skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {worker.sub_skills.map((skill) => (
              <span key={skill} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-700">
                {skill}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3 text-sm">
          {worker.hourly_rate && <span className="font-medium text-ink-900">₹{parseFloat(worker.hourly_rate).toFixed(0)}/hr</span>}
          {worker.day_rate && <span className="font-medium text-ink-900">₹{parseFloat(worker.day_rate).toFixed(0)}/day</span>}
          {worker.experience_years !== null && <span className="text-ink-500">{worker.experience_years}+ yrs experience</span>}
        </div>

        {!isOwnProfile && (
          <div className="mt-6 space-y-2">
            {requestSent ? (
              <p className="rounded border border-trust-300 bg-trust-50 px-4 py-3 text-center text-sm text-trust-700">
                {t('hire.requestSent')}
              </p>
            ) : (
              <Button type="button" className="w-full" onClick={() => setShowRequestModal(true)}>
                {t('hire.requestService')}
              </Button>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleStartChat}
                disabled={isStartingChat}
                className="flex items-center justify-center gap-2 rounded border border-ink-100 py-2.5 text-sm font-medium text-ink-700 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                {t('chat.startChat')}
              </button>
              <a
                href={worker.phone ? `tel:${worker.phone}` : undefined}
                className="flex items-center justify-center gap-2 rounded border border-ink-100 py-2.5 text-sm font-medium text-ink-700"
              >
                <Phone className="h-4 w-4" />
                {t('hire.callWorker')}
              </a>
              <a
                href={waNumber ? `https://wa.me/${waNumber}` : undefined}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded border border-ink-100 py-2.5 text-sm font-medium text-ink-700"
              >
                <MessageCircle className="h-4 w-4" />
                {t('hire.whatsappWorker')}
              </a>
            </div>
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{t('hire.reviews')}</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-ink-500">{t('hire.noReviews')}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded border border-ink-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-900">{r.reviewer_name}</span>
                    <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {r.rating}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-ink-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showRequestModal && (
        <RequestServiceModal
          workerId={worker.user_id}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            setRequestSent(true);
          }}
        />
      )}
    </div>
  );
}
