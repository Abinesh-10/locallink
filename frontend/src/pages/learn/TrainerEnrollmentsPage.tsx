import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { learnApi } from '@/features/learn/api';
import { EnrollmentCard, EnrollmentRow } from '@/features/learn/components/EnrollmentCard';
import { Button } from '@/components/ui/Button';

export function TrainerEnrollmentsPage() {
  const { t } = useTranslation();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await learnApi.listTrainerEnrollments();
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

  async function handleAction(enrollmentId: string, status: string) {
    setActingId(enrollmentId);
    try {
      await learnApi.updateEnrollmentStatus(enrollmentId, status);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update enrollment.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('learn.trainerEnrollmentsTitle')}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && enrollments.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('learn.noEnrollmentsTrainer')}</p>
        )}

        <div className="space-y-3">
          {enrollments.map((e) => (
            <EnrollmentCard
              key={e.id}
              enrollment={e}
              otherPartyLabel={e.student_name || ''}
              actions={
                e.status === 'pending' ? (
                  <>
                    <Button type="button" className="flex-1" isLoading={actingId === e.id} onClick={() => handleAction(e.id, 'confirmed')}>
                      {t('learn.confirm')}
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1" isLoading={actingId === e.id} onClick={() => handleAction(e.id, 'cancelled')}>
                      {t('learn.cancel')}
                    </Button>
                  </>
                ) : e.status === 'confirmed' ? (
                  <Button type="button" className="flex-1" isLoading={actingId === e.id} onClick={() => handleAction(e.id, 'completed')}>
                    {t('learn.markComplete')}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
