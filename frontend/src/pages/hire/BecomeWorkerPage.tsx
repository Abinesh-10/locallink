import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hireApi } from '@/features/hire/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth';

interface ServiceCategory {
  id: string;
  name_en: string;
}

export function BecomeWorkerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subSkills, setSubSkills] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dayRate, setDayRate] = useState('');
  const [bio, setBio] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    hireApi.getServiceCategories().then((res) => setCategories(res.data.categories));
  }, []);

  // Pre-fill if the user already has a worker profile (editing flow).
  useEffect(() => {
    hireApi
      .getMyWorkerProfile()
      .then((res) => {
        const p = res.data.profile;
        setCategoryId(p.category_id || '');
        setSubSkills((p.sub_skills || []).join(', '));
        setExperienceYears(p.experience_years?.toString() || '');
        setHourlyRate(p.hourly_rate?.toString() || '');
        setDayRate(p.day_rate?.toString() || '');
        setBio(p.bio || '');
        setIsAvailable(p.is_available);
      })
      .catch(() => null) // no profile yet — fine, this is the create flow
      .finally(() => setIsLoadingProfile(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) {
      setError(t('hire.categoryLabel') + ' is required.');
      return;
    }
    setIsLoading(true);
    try {
      const input = {
        categoryId,
        subSkills: subSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        dayRate: dayRate ? parseFloat(dayRate) : undefined,
        bio: bio || undefined,
        isAvailable,
      };
      await hireApi.createWorkerProfile(input);
      await refreshUser(); // picks up the newly-assigned 'worker' role
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('hire.becomeWorkerTitle')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('hire.becomeWorkerSubtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('hire.categoryLabel')}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label={t('hire.subSkillsLabel')}
            value={subSkills}
            onChange={(e) => setSubSkills(e.target.value)}
            placeholder="Wiring, switchboard repair, fan installation"
          />

          <TextField
            label={t('hire.experienceLabel')}
            type="number"
            min={0}
            max={70}
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t('hire.hourlyRateLabel')}
              type="number"
              min={0}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
            <TextField
              label={t('hire.dayRateLabel')}
              type="number"
              min={0}
              value={dayRate}
              onChange={(e) => setDayRate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('hire.bioLabel')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t('hire.bioPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
            {t('hire.availableToggle')}
          </label>

          {error && <p className="text-sm text-sos-500">{error}</p>}
          {success && <p className="text-sm text-trust-700">{t('hire.profileSaved')}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('hire.saveProfile')}
          </Button>
        </form>
      </div>
    </div>
  );
}
