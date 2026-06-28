import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Star, Wifi, MapPin as MapPinIcon, Languages, Users } from 'lucide-react';
import { learnApi } from '@/features/learn/api';
import { ReportButton } from '@/features/reports/components/ReportButton';
import { VerifiedBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

interface CourseDetail {
  id: string;
  trainer_id: string;
  subject: string;
  title: string;
  description: string | null;
  mode: 'online' | 'offline' | 'hybrid';
  language: string | null;
  price: string;
  capacity: number;
  rating_avg: string;
  rating_count: number;
  trainer_name: string;
  trainer_photo_url: string | null;
  trainer_qualifications: string | null;
  trainer_is_verified: boolean | null;
  enrolled_count: string;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
}

const MODE_LABEL_KEY: Record<string, string> = {
  online: 'learn.modeOnline',
  offline: 'learn.modeOffline',
  hybrid: 'learn.modeHybrid',
};

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (!id) return;
    learnApi
      .getCourse(id)
      .then((res) => {
        setCourse(res.data.course);
        setReviews(res.data.reviews);
      })
      .catch((err) => setError(err.response?.data?.detail || 'Course not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleEnroll() {
    if (!id) return;
    setError(null);
    setIsEnrolling(true);
    try {
      await learnApi.createEnrollment(id);
      setEnrolled(true);
    } catch (err: any) {
      if (err.response?.data?.title === 'course_full') {
        setError(t('learn.courseFullError'));
      } else if (err.response?.data?.title === 'already_enrolled') {
        setError(t('learn.alreadyEnrolledError'));
      } else {
        setError(err.response?.data?.detail || 'Failed to enroll.');
      }
    } finally {
      setIsEnrolling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !course) {
    return <p className="px-4 py-8 text-center text-sm text-sos-500">{error}</p>;
  }
  if (!course) return null;

  const isOwnCourse = user?.id === course.trainer_id;
  const enrolledCount = parseInt(course.enrolled_count, 10);
  const spotsLeft = course.capacity - enrolledCount;
  const isFull = spotsLeft <= 0;

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        <h1 className="font-display text-xl font-semibold text-ink-900">{course.title}</h1>
        <p className="mt-1 text-sm text-ink-500">{course.subject}</p>
        {!isOwnCourse && (
          <div className="mt-1">
            <ReportButton targetType="course" targetId={course.id} />
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-trust-50 text-sm font-display font-semibold text-trust-700">
            {course.trainer_photo_url ? (
              <img src={course.trainer_photo_url} alt={course.trainer_name} className="h-full w-full object-cover" />
            ) : (
              course.trainer_name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-ink-900">{course.trainer_name}</span>
              {course.trainer_is_verified && <VerifiedBadge label="✓" />}
            </div>
            {course.trainer_qualifications && <p className="text-xs text-ink-500">{course.trainer_qualifications}</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-500">
          {course.rating_count > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-amber-600">
              <Star className="h-4 w-4 fill-current" />
              {parseFloat(course.rating_avg).toFixed(1)} ({course.rating_count})
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {course.mode === 'online' ? <Wifi className="h-4 w-4" /> : <MapPinIcon className="h-4 w-4" />}
            {t(MODE_LABEL_KEY[course.mode])}
          </span>
          {course.language && (
            <span className="inline-flex items-center gap-1">
              <Languages className="h-4 w-4" />
              {course.language}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" />
            {isFull ? t('learn.courseFull') : t('learn.spotsLeft', { count: spotsLeft })}
          </span>
        </div>

        <p className="mt-4 font-display text-2xl font-semibold text-ink-900">
          {parseFloat(course.price) > 0 ? `₹${parseFloat(course.price).toFixed(0)}` : 'Free'}
        </p>

        {course.description && <p className="mt-4 text-sm leading-relaxed text-ink-700">{course.description}</p>}

        {!isOwnCourse && (
          <div className="mt-6">
            {enrolled ? (
              <p className="rounded border border-trust-300 bg-trust-50 px-4 py-3 text-center text-sm text-trust-700">
                {t('learn.enrollSent')}
              </p>
            ) : (
              <Button type="button" className="w-full" isLoading={isEnrolling} disabled={isFull} onClick={handleEnroll}>
                {isFull ? t('learn.courseFull') : t('learn.enrollButton')}
              </Button>
            )}
            {error && <p className="mt-2 text-sm text-sos-500">{error}</p>}
          </div>
        )}

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{t('learn.reviews')}</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-ink-500">{t('learn.noReviews')}</p>
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
    </div>
  );
}
