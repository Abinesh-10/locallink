import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { learnApi } from '@/features/learn/api';
import { CourseCard, CourseSearchResult } from '@/features/learn/components/CourseCard';
import { useAuth } from '@/lib/auth';

const MODES = ['online', 'offline', 'hybrid'] as const;

export function LearnBrowsePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subjectInput, setSubjectInput] = useState('');
  const [activeSubject, setActiveSubject] = useState('');
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await learnApi.searchCourses({
          subject: activeSubject || undefined,
          mode: (activeMode as 'online' | 'offline' | 'hybrid') || undefined,
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
  }, [activeSubject, activeMode, user?.lat, user?.lng, user?.search_radius_km]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveSubject(subjectInput.trim());
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-4">
          <h1 className="font-display text-xl font-semibold text-ink-900">{t('learn.browseTitle')}</h1>
          <p className="text-sm text-ink-500">{t('learn.browseSubtitle')}</p>
        </header>

        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder={t('learn.searchPlaceholder')}
              className="w-full rounded border border-ink-100 py-2.5 pl-9 pr-3 text-ink-900"
            />
          </div>
        </form>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveMode(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              activeMode === null ? 'bg-trust-500 text-white' : 'bg-ink-100 text-ink-700'
            }`}
          >
            All
          </button>
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveMode(mode)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                activeMode === mode ? 'bg-trust-500 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              {t(`learn.mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
            </button>
          ))}
        </div>

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

        <button
          type="button"
          onClick={() => navigate('/become-a-trainer')}
          className="mt-6 w-full rounded border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500"
        >
          {t('learn.becomeTrainerTitle')}
        </button>
      </div>
    </div>
  );
}
