import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { learnApi } from '@/features/learn/api';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

export function BecomeTrainerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [subjects, setSubjects] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    learnApi
      .getMyTrainerProfile()
      .then((res) => {
        const p = res.data.profile;
        setSubjects((p.subjects || []).join(', '));
        setQualifications(p.qualifications || '');
        setBio(p.bio || '');
      })
      .catch(() => null)
      .finally(() => setIsLoadingProfile(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await learnApi.createTrainerProfile({
        subjects: subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        qualifications: qualifications || undefined,
        bio: bio || undefined,
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-trust-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('learn.becomeTrainerTitle')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('learn.becomeTrainerSubtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('learn.subjectsLabel')}</label>
            <input
              type="text"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="Carnatic Vocals, Python Programming"
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('learn.qualificationsLabel')}</label>
            <textarea
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t('learn.qualificationsPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('learn.bioLabel')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t('learn.bioPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>

          {error && <p className="text-sm text-sos-500">{error}</p>}
          {success && <p className="text-sm text-trust-700">{t('learn.profileSaved')}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('learn.saveProfile')}
          </Button>
        </form>
      </div>
    </div>
  );
}
