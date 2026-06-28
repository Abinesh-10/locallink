import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { communityApi } from '@/features/community/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

type RequestType = 'blood' | 'volunteer' | 'emergency' | 'medical' | 'other';
type Urgency = 'low' | 'normal' | 'urgent' | 'critical';

export function NewRequestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const presetType = (searchParams.get('preset') as RequestType | null) || null;

  const [type, setType] = useState<RequestType>(presetType || 'other');
  const [urgency, setUrgency] = useState<Urgency>(presetType === 'medical' ? 'critical' : 'normal');
  const [bloodGroup, setBloodGroup] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactVisible, setContactVisible] = useState(true);
  const [expiresIn, setExpiresIn] = useState<'1' | '7' | '30' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title) {
      setError('Title is required.');
      return;
    }
    if (type === 'blood' && !bloodGroup) {
      setError(t('community.bloodGroupLabel') + ' is required.');
      return;
    }
    setIsLoading(true);
    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn, 10) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      await communityApi.createRequest({
        type,
        urgency,
        bloodGroup: type === 'blood' ? bloodGroup : undefined,
        title,
        description: description || undefined,
        lat: user?.lat ?? undefined,
        lng: user?.lng ?? undefined,
        contactVisible,
        expiresAt,
      });
      navigate('/community');
    } catch (err: any) {
      if (err.response?.data?.title === 'verification_required') {
        setError(t('community.verificationRequiredCritical'));
      } else {
        setError(err.response?.data?.detail || 'Failed to post request.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('community.newRequestTitle')}</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('community.requestTypeLabel')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RequestType)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="blood">{t('community.typeBlood')}</option>
              <option value="volunteer">{t('community.typeVolunteer')}</option>
              <option value="emergency">{t('community.typeEmergency')}</option>
              <option value="medical">{t('community.typeMedical')}</option>
              <option value="other">{t('community.typeOther')}</option>
            </select>
          </div>

          {type === 'blood' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('community.bloodGroupLabel')}</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
              >
                <option value="">—</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('community.urgencyLabel')}</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="low">{t('community.urgencyLow')}</option>
              <option value="normal">{t('community.urgencyNormal')}</option>
              <option value="urgent">{t('community.urgencyUrgent')}</option>
              <option value="critical">{t('community.urgencyCritical')}</option>
            </select>
          </div>

          <TextField
            label={t('community.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('community.titlePlaceholder')}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('community.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t('community.descriptionPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('community.expiresLabel')}</label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value as typeof expiresIn)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="">—</option>
              <option value="1">{t('community.expires1Day')}</option>
              <option value="7">{t('community.expires7Days')}</option>
              <option value="30">{t('community.expires30Days')}</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={contactVisible} onChange={(e) => setContactVisible(e.target.checked)} />
            {t('community.contactVisibleLabel')}
          </label>

          {error && <p className="text-sm text-sos-500">{error}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('community.postRequest')}
          </Button>
        </form>
      </div>
    </div>
  );
}
