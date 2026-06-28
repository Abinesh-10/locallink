import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { learnApi } from '@/features/learn/api';
import { EnrollmentCard, EnrollmentRow } from '@/features/learn/components/EnrollmentCard';
import { CourseReviewModal } from '@/features/learn/components/CourseReviewModal';
import { Button } from '@/components/ui/Button';

export function MyEnrollmentsPage() {
  const { t } = useTranslation();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewCourseId, setReviewCourseId] = useState<string | null>(null);
  const [reviewedCourseIds, setReviewedCourseIds] = useState<Set<string>>(new Set());

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await learnApi.listMyEnrollments();
      setEnrollments(res.data.enrollments);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load enrollments.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(enrollmentId: string) {
    setActingId(enrollmentId);
    try {
      await learnApi.updateEnrollmentStatus(enrollmentId, 'cancelled');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel enrollment.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('learn.myEnrollmentsTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && enrollments.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('learn.noEnrollmentsMine')}</p>
        )}

        <div className="space-y-3">
          {enrollments.map((e) => (
            <EnrollmentCard
              key={e.id}
              enrollment={e}
              otherPartyLabel={e.trainer_name || ''}
              actions={
                e.status === 'pending' ? (
                  <Button type="button" variant="secondary" className="flex-1" isLoading={actingId === e.id} onClick={() => handleCancel(e.id)}>
                    {t('learn.cancel')}
                  </Button>
                ) : e.status === 'completed' && !reviewedCourseIds.has(e.course_id) ? (
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setReviewCourseId(e.course_id)}>
                    {t('learn.leaveReview')}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>

      {reviewCourseId && (
        <CourseReviewModal
          courseId={reviewCourseId}
          onClose={() => setReviewCourseId(null)}
          onSuccess={() => {
            setReviewedCourseIds((prev) => new Set(prev).add(reviewCourseId));
            setReviewCourseId(null);
          }}
        />
      )}
    </div>
  );
}
