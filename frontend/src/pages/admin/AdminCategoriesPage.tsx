import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/features/admin/api';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

type CategoryType = 'service' | 'rental' | 'product';

interface AdminCategoryRow {
  id: string;
  slug: string;
  name_en?: string;
  names?: Record<string, string>;
  is_disabled: boolean | null;
}

const TYPE_TABS: { value: CategoryType; labelKey: string }[] = [
  { value: 'service', labelKey: 'admin.categoryTypeService' },
  { value: 'rental', labelKey: 'admin.categoryTypeRental' },
  { value: 'product', labelKey: 'admin.categoryTypeProduct' },
];

function displayName(row: AdminCategoryRow): string {
  return row.name_en || row.names?.en || row.slug;
}

export function AdminCategoriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<CategoryType>('service');
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await adminApi.listCategories(activeType);
      setCategories(res.data.categories);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!slug || !nameEn) {
      setError('Slug and English name are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await adminApi.createCategory(activeType, slug, { en: nameEn });
      setSlug('');
      setNameEn('');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create category.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleDisabled(row: AdminCategoryRow) {
    setActingId(row.id);
    try {
      await adminApi.overrideCategory(activeType, row.id, !row.is_disabled);
      await load();
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(row: AdminCategoryRow) {
    if (!window.confirm(t('admin.deleteCategoryConfirm'))) return;
    setActingId(row.id);
    try {
      await adminApi.deleteCategory(activeType, row.id);
      await load();
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/admin')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('admin.dashboardTitle')}
        </button>

        <h1 className="mb-4 font-display text-xl font-semibold text-ink-900">{t('admin.categories')}</h1>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveType(tab.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                activeType === tab.value ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} className="mb-6 space-y-3 rounded-lg border border-ink-100 bg-white p-4">
          <TextField label={t('admin.categorySlug')} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. plumbing" />
          <TextField label={t('admin.categoryNameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Plumbing" />
          {error && <p className="text-sm text-sos-500">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {t('admin.addCategory')}
          </Button>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-ink-100 bg-white p-3">
                <div>
                  <p className={`text-sm font-medium ${c.is_disabled ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
                    {displayName(c)}
                  </p>
                  <p className="text-xs text-ink-400">{c.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleDisabled(c)}
                    disabled={actingId === c.id}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      c.is_disabled ? 'bg-trust-500 text-white' : 'bg-ink-100 text-ink-700'
                    }`}
                  >
                    {c.is_disabled ? t('admin.enableCategory') : t('admin.disableCategory')}
                  </button>
                  <button type="button" onClick={() => handleDelete(c)} disabled={actingId === c.id} aria-label={t('admin.deleteCategory')}>
                    <Trash2 className="h-4 w-4 text-sos-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
