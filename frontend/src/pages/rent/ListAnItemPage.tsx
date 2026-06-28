import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Pencil } from 'lucide-react';
import { rentApi } from '@/features/rent/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth';

interface RentalCategory {
  id: string;
  names: Record<string, string>;
}

interface MyListing {
  id: string;
  title: string;
  hourly_rate: string | null;
  daily_rate: string | null;
  weekly_rate: string | null;
  is_active: boolean;
}

export function ListAnItemPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery' | 'both'>('pickup');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadListings() {
    const res = await rentApi.getMyListings();
    setMyListings(res.data.listings);
  }

  useEffect(() => {
    rentApi.getRentalCategories().then((res) => setCategories(res.data.categories));
    loadListings();
  }, []);

  function resetForm() {
    setCategoryId('');
    setTitle('');
    setDescription('');
    setHourlyRate('');
    setDailyRate('');
    setWeeklyRate('');
    setDeposit('');
    setDeliveryOption('pickup');
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId || !title) {
      setError('Category and title are required.');
      return;
    }
    if (!hourlyRate && !dailyRate && !weeklyRate) {
      setError(t('rent.rateRequiredError'));
      return;
    }
    setIsLoading(true);
    try {
      const input = {
        categoryId,
        title,
        description: description || undefined,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
        weeklyRate: weeklyRate ? parseFloat(weeklyRate) : undefined,
        deposit: deposit ? parseFloat(deposit) : undefined,
        deliveryOption,
      };
      if (editingId) {
        await rentApi.updateListing(editingId, input);
      } else {
        await rentApi.createListing(input);
        await refreshUser();
      }
      setSuccess(true);
      resetForm();
      await loadListings();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save listing.');
    } finally {
      setIsLoading(false);
    }
  }

  function startEdit(listing: MyListing) {
    setEditingId(listing.id);
    setTitle(listing.title);
    setHourlyRate(listing.hourly_rate || '');
    setDailyRate(listing.daily_rate || '');
    setWeeklyRate(listing.weekly_rate || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(listingId: string) {
    if (!window.confirm(t('rent.deleteConfirm'))) return;
    await rentApi.deleteListing(listingId);
    await loadListings();
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('rent.listItemTitle')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('rent.listItemSubtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('rent.categoryLabel')}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.names?.en}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label={t('rent.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('rent.titlePlaceholder')}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('rent.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t('rent.descriptionPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <TextField label={t('rent.hourlyRateLabel')} type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
            <TextField label={t('rent.dailyRateLabel')} type="number" min={0} value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
            <TextField label={t('rent.weeklyRateLabel')} type="number" min={0} value={weeklyRate} onChange={(e) => setWeeklyRate(e.target.value)} />
          </div>

          <TextField label={t('rent.depositLabel')} type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('rent.deliveryOptionLabel')}</label>
            <select
              value={deliveryOption}
              onChange={(e) => setDeliveryOption(e.target.value as 'pickup' | 'delivery' | 'both')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="pickup">{t('rent.deliveryPickup')}</option>
              <option value="delivery">{t('rent.deliveryDelivery')}</option>
              <option value="both">{t('rent.deliveryBoth')}</option>
            </select>
          </div>

          {error && <p className="text-sm text-sos-500">{error}</p>}
          {success && <p className="text-sm text-trust-700">{t('rent.listingSaved')}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('rent.saveListing')}
          </Button>
        </form>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{t('rent.myListings')}</h2>
          {myListings.length === 0 ? (
            <p className="text-sm text-ink-500">{t('rent.noListings')}</p>
          ) : (
            <div className="space-y-2">
              {myListings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between rounded border border-ink-100 p-3">
                  <button type="button" onClick={() => navigate(`/rentals/${listing.id}`)} className="text-left text-sm font-medium text-ink-900">
                    {listing.title}
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(listing)} aria-label={t('rent.editListing')}>
                      <Pencil className="h-4 w-4 text-ink-500" />
                    </button>
                    <button type="button" onClick={() => handleDelete(listing.id)} aria-label={t('rent.deleteListing')}>
                      <Trash2 className="h-4 w-4 text-sos-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
