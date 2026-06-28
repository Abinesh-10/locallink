import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Wifi, MapPin as MapPinIcon } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/Badge';

export interface CourseSearchResult {
  id: string;
  subject: string;
  title: string;
  mode: 'online' | 'offline' | 'hybrid';
  language: string | null;
  price: string;
  capacity: number;
  rating_avg: string;
  rating_count: number;
  trainer_name: string;
  trainer_photo_url: string | null;
  trainer_is_verified: boolean | null;
  enrolled_count: string;
  distance_km: string | null;
}

const MODE_LABEL_KEY: Record<string, string> = {
  online: 'learn.modeOnline',
  offline: 'learn.modeOffline',
  hybrid: 'learn.modeHybrid',
};

export function CourseCard({ course }: { course: CourseSearchResult }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enrolledCount = parseInt(course.enrolled_count, 10);
  const spotsLeft = course.capacity - enrolledCount;

  return (
    <button
      type="button"
      onClick={() => navigate(`/courses/${course.id}`)}
      className="flex w-full items-center gap-3 rounded-lg border border-ink-100 bg-white p-3 text-left transition-shadow hover:shadow-sm"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-trust-50 text-lg font-display font-semibold text-trust-700">
        {course.trainer_photo_url ? (
          <img src={course.trainer_photo_url} alt={course.trainer_name} className="h-full w-full object-cover" />
        ) : (
          course.trainer_name.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-ink-900">{course.title}</h3>
          {course.trainer_is_verified && <VerifiedBadge label="✓" />}
        </div>
        <p className="truncate text-sm text-ink-500">
          {course.subject} · {course.trainer_name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
          {course.rating_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <Star className="h-3.5 w-3.5 fill-current" />
              {parseFloat(course.rating_avg).toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-0.5">
            {course.mode === 'online' ? <Wifi className="h-3 w-3" /> : <MapPinIcon className="h-3 w-3" />}
            {t(MODE_LABEL_KEY[course.mode])}
          </span>
          {course.distance_km && <span>{parseFloat(course.distance_km).toFixed(1)} km</span>}
          <span className={spotsLeft <= 0 ? 'text-sos-500' : ''}>
            {spotsLeft <= 0 ? t('learn.courseFull') : t('learn.spotsLeft', { count: spotsLeft })}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right text-sm font-medium text-ink-900">
        {parseFloat(course.price) > 0 ? `₹${parseFloat(course.price).toFixed(0)}` : 'Free'}
      </div>
    </button>
  );
}
