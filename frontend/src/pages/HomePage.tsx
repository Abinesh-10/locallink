import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Hammer, PackageSearch, ShoppingBag, HeartHandshake, GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const CARDS = [
  { key: 'cardHire', icon: Hammer, to: '/hire', color: 'bg-brand-50 text-brand-700', enabled: true },
  { key: 'cardRent', icon: PackageSearch, to: '/rent', color: 'bg-trust-50 text-trust-700', enabled: true },
  { key: 'cardMarket', icon: ShoppingBag, to: '/marketplace', color: 'bg-brand-50 text-brand-700', enabled: true },
  { key: 'cardCommunity', icon: HeartHandshake, to: '/community', color: 'bg-sos-500/10 text-sos-600', enabled: true },
  { key: 'cardLearn', icon: GraduationCap, to: '/learn', color: 'bg-trust-50 text-trust-700', enabled: true },
] as const;

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <header className="mb-6">
          <p className="text-sm text-ink-500">
            {user?.full_name ? `Hi, ${user.full_name.split(' ')[0]}` : t('common.appName')}
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{t('home.tagline')}</h1>
          {user?.address && <p className="mt-1 text-sm text-ink-500">📍 {user.address}</p>}
        </header>

        <div className="grid grid-cols-2 gap-3">
          {CARDS.map(({ key, icon: Icon, color, to, enabled }, idx) => (
            <button
              key={key}
              type="button"
              onClick={() => enabled && navigate(to)}
              className={`flex flex-col items-start gap-3 rounded-lg p-4 text-left transition-transform active:scale-[0.98] ${color} ${
                idx === CARDS.length - 1 ? 'col-span-2' : ''
              } ${!enabled ? 'opacity-60' : ''}`}
              // All 5 modules (Phases 2-6: Hire, Rent, Buy & Sell, Community
              // Help, Learn) are built and navigate. The enabled/disabled
              // flag is kept on each card definition even though every
              // card is now true, since it documents intent cheaply and
              // costs nothing to leave in place.
              disabled={!enabled}
            >
              <Icon className="h-6 w-6" />
              <span className="font-medium">{t(`home.${key}`)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
