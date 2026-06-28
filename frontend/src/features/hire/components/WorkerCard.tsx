import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { VerifiedBadge, TierBadge } from '@/components/ui/Badge';

export interface WorkerSearchResult {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  category_name_en: string | null;
  rating_avg: string;
  rating_count: number;
  is_verified: boolean;
  hourly_rate: string | null;
  day_rate: string | null;
  distance_km: string | null;
  trust_score: string | null;
  tier: string | null;
  completed_jobs: number | null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WorkerCard({ worker }: { worker: WorkerSearchResult }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/workers/${worker.user_id}`)}
      className="flex w-full items-center gap-3 rounded-lg border border-ink-100 bg-white p-3 text-left transition-shadow hover:shadow-sm"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-lg font-display font-semibold text-brand-700">
        {worker.photo_url ? (
          <img src={worker.photo_url} alt={worker.full_name} className="h-full w-full object-cover" />
        ) : (
          worker.full_name.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-ink-900">{worker.full_name}</h3>
          {worker.is_verified && <VerifiedBadge label="✓" />}
        </div>
        <p className="truncate text-sm text-ink-500">{worker.category_name_en}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span className="inline-flex items-center gap-0.5 text-amber-600">
            <Star className="h-3.5 w-3.5 fill-current" />
            {parseFloat(worker.rating_avg).toFixed(1)} ({worker.rating_count})
          </span>
          {worker.distance_km && <span>{parseFloat(worker.distance_km).toFixed(1)} km</span>}
          {worker.tier && <TierBadge tier={worker.tier} label={t(`hire.tier${capitalize(worker.tier)}`)} />}
        </div>
      </div>

      {worker.hourly_rate && (
        <div className="shrink-0 text-right text-sm font-medium text-ink-900">₹{parseFloat(worker.hourly_rate).toFixed(0)}/hr</div>
      )}
    </button>
  );
}
