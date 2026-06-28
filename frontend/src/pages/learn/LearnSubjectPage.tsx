import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { learnApi } from '@/features/learn/api';
import { CourseCard, CourseSearchResult } from '@/features/learn/components/CourseCard';
import { useAuth } from '@/lib/auth';

export function LearnSubjectPage() {
  const { subject } = useParams<{ subject: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courses, setCourses] = useState<CourseSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decodedSubject = subject ? decodeURIComponent(subject) : '';

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await learnApi.searchCourses({
          subject: decodedSubject,
          lat: user?.lat ?? undefined,
          lng: user?.lng ?? undefined,
          radius: (user?.search_radius_km as 5 | 10 | 15 | 25) ?? 10,
        });
        setCourses(res.data.courses);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load courses.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [decodedSubject, user?.lat, user?.lng, user?.search_radius_km]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/learn')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('learn.browseTitle')}
        </button>

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{decodedSubject}</h1>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
          </div>
        )}
        {error && <p className="py-4 text-center text-sm text-sos-500">{error}</p>}
        {!isLoading && !error && courses.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">{t('learn.noResults')}</p>
        )}

        <div className="space-y-2">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
