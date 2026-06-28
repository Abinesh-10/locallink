import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
] as const;

export function LanguageSettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [current, setCurrent] = useState(user?.preferred_language || 'en');
  const [isSaving, setIsSaving] = useState<string | null>(null);

  async function handleSelect(code: string) {
    setIsSaving(code);
    try {
      await apiClient.patch('/users/me/language', { language: code });
      i18n.changeLanguage(code);
      setCurrent(code);
      await refreshUser();
    } finally {
      setIsSaving(null);
    }
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="font-display text-xl font-semibold text-ink-900">{t('settings.languageTitle')}</h1>
        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              disabled={isSaving === lang.code}
              className={`flex w-full items-center justify-between rounded border px-4 py-3 text-left text-sm font-medium transition-colors ${
                current === lang.code ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-100 text-ink-700'
              }`}
            >
              {lang.label}
              {current === lang.code && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
        {/* Per doc: TA/HI/TE/ML are key-scaffolded but content is placeholder
            (English text) until Phase 8 — selecting them changes the
            active i18n locale, but visible strings won't differ yet. */}
        <p className="text-xs text-ink-300">
          Tamil, Hindi, Telugu, and Malayalam translations are coming in a later update — interface text will
          appear in English for now.
        </p>
      </div>
    </div>
  );
}
