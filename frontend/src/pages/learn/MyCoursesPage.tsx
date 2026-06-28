import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { learnApi } from '@/features/learn/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface MyCourse {
  id: string;
  subject: string;
  title: string;
  mode: 'online' | 'offline' | 'hybrid';
  price: string;
  capacity: number;
  is_active: boolean;
}

export function MyCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [language, setLanguage] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [error, setError] = useState<string | null>(null);
  // Tracked separately from `error` (rather than comparing error against a
  // translated string, which would break the moment the translation text
  // changes) so the "go create a trainer profile" link only shows for this
  // specific failure mode.
  const [needsTrainerProfile, setNeedsTrainerProfile] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function loadCourses() {
    const res = await learnApi.getMyCourses();
    setCourses(res.data.courses);
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsTrainerProfile(false);
    if (!subject || !title || !capacity) {
      setError('Subject, title, and capacity are required.');
      return;
    }
    setIsLoading(true);
    try {
      await learnApi.createCourse({
        subject,
        title,
        description: description || undefined,
        mode,
        language: language || undefined,
        price: price ? parseFloat(price) : undefined,
        capacity: parseInt(capacity, 10),
      });
      setSubject('');
      setTitle('');
      setDescription('');
      setLanguage('');
      setPrice('');
      setCapacity('10');
      setSuccess(true);
      await loadCourses();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      if (err.response?.data?.title === 'trainer_profile_required') {
        setError(t('learn.trainerProfileRequiredError'));
        setNeedsTrainerProfile(true);
      } else {
        setError(err.response?.data?.detail || 'Failed to save course.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('learn.newCourseTitle')}</h1>

        <Link to="/my-courses/enrollments" className="mt-2 flex items-center justify-between rounded border border-ink-100 bg-white px-4 py-3 text-sm font-medium text-ink-900">
          {t('learn.trainerEnrollmentsTitle')}
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </Link>

        {needsTrainerProfile && (
          <button
            type="button"
            onClick={() => navigate('/become-a-trainer')}
            className="mt-2 text-sm font-medium text-trust-500 underline"
          >
            {t('learn.becomeTrainerTitle')} →
          </button>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            label={t('learn.courseSubjectLabel')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('learn.courseSubjectPlaceholder')}
          />
          <TextField
            label={t('learn.courseTitleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('learn.courseTitlePlaceholder')}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('learn.courseDescriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t('learn.courseDescriptionPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('learn.modeLabel')}</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="online">{t('learn.modeOnline')}</option>
              <option value="offline">{t('learn.modeOffline')}</option>
              <option value="hybrid">{t('learn.modeHybrid')}</option>
            </select>
          </div>
          <TextField label={t('learn.languageLabel')} value={language} onChange={(e) => setLanguage(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label={t('learn.priceLabel')} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            <TextField
              label={t('learn.capacityLabel')}
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-sos-500">{error}</p>}
          {success && <p className="text-sm text-trust-700">{t('learn.courseSaved')}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('learn.saveCourse')}
          </Button>
        </form>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{t('learn.myCourses')}</h2>
          {courses.length === 0 ? (
            <p className="text-sm text-ink-500">{t('learn.noCourses')}</p>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="block w-full rounded border border-ink-100 p-3 text-left"
                >
                  <p className="text-sm font-medium text-ink-900">{course.title}</p>
                  <p className="text-xs text-ink-500">{course.subject}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
