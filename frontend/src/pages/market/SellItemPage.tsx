import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Pencil, Check } from 'lucide-react';
import { marketApi } from '@/features/market/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/lib/auth';

interface ProductCategory {
  id: string;
  names: Record<string, string>;
}

interface MyListing {
  id: string;
  title: string;
  price: string;
  status: 'available' | 'reserved' | 'sold';
}

export function SellItemPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used' | 'refurbished'>('used');
  const [qty, setQty] = useState('1');
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'local_delivery' | 'both'>('pickup');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadListings() {
    const res = await marketApi.getMyListings();
    setMyListings(res.data.listings);
  }

  useEffect(() => {
    marketApi.getProductCategories().then((res) => setCategories(res.data.categories));
    loadListings();
  }, []);

  function resetForm() {
    setCategoryId('');
    setTitle('');
    setDescription('');
    setPrice('');
    setCondition('used');
    setQty('1');
    setDeliveryOption('pickup');
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title || !price) {
      setError('Title and price are required.');
      return;
    }
    setIsLoading(true);
    try {
      const input = {
        categoryId: categoryId || undefined,
        title,
        description: description || undefined,
        price: parseFloat(price),
        condition,
        qty: qty ? parseInt(qty, 10) : undefined,
        deliveryOption,
      };
      if (editingId) {
        await marketApi.updateListing(editingId, input);
      } else {
        await marketApi.createListing(input);
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
    setPrice(listing.price);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(listingId: string) {
    if (!window.confirm(t('market.deleteConfirm'))) return;
    await marketApi.deleteListing(listingId);
    await loadListings();
  }

  async function handleMarkSold(listingId: string) {
    if (!window.confirm(t('market.markSoldConfirm'))) return;
    await marketApi.markAsSold(listingId);
    await loadListings();
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('market.sellItemTitle')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('market.sellItemSubtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('market.categoryLabel')}</label>
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
            label={t('market.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('market.titlePlaceholder')}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('market.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t('market.descriptionPlaceholder')}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label={t('market.priceLabel')} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            <TextField label={t('market.qtyLabel')} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('market.conditionLabel')}</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as typeof condition)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="new">{t('market.conditionNew')}</option>
              <option value="like_new">{t('market.conditionLikeNew')}</option>
              <option value="used">{t('market.conditionUsed')}</option>
              <option value="refurbished">{t('market.conditionRefurbished')}</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">{t('market.deliveryOptionLabel')}</label>
            <select
              value={deliveryOption}
              onChange={(e) => setDeliveryOption(e.target.value as typeof deliveryOption)}
              className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
            >
              <option value="pickup">{t('market.deliveryPickup')}</option>
              <option value="local_delivery">{t('market.deliveryLocalDelivery')}</option>
              <option value="both">{t('market.deliveryBoth')}</option>
            </select>
          </div>

          {error && <p className="text-sm text-sos-500">{error}</p>}
          {success && <p className="text-sm text-trust-700">{t('market.listingSaved')}</p>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t('market.saveListing')}
          </Button>
        </form>

        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{t('market.myListings')}</h2>
          {myListings.length === 0 ? (
            <p className="text-sm text-ink-500">{t('market.noListings')}</p>
          ) : (
            <div className="space-y-2">
              {myListings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between rounded border border-ink-100 p-3">
                  <button type="button" onClick={() => navigate(`/products/${listing.id}`)} className="text-left text-sm font-medium text-ink-900">
                    {listing.title}
                    {listing.status === 'sold' && <span className="ml-2 text-xs text-ink-300">(sold)</span>}
                  </button>
                  <div className="flex gap-2">
                    {listing.status !== 'sold' && (
                      <button type="button" onClick={() => handleMarkSold(listing.id)} aria-label={t('market.markSold')}>
                        <Check className="h-4 w-4 text-trust-500" />
                      </button>
                    )}
                    <button type="button" onClick={() => startEdit(listing)} aria-label={t('market.editListing')}>
                      <Pencil className="h-4 w-4 text-ink-500" />
                    </button>
                    <button type="button" onClick={() => handleDelete(listing.id)} aria-label={t('market.deleteListing')}>
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
