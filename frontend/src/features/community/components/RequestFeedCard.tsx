import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Droplet, HeartHandshake, Siren, Stethoscope, HelpCircle, MessageCircle } from 'lucide-react';

export interface CommunityRequestRow {
  id: string;
  type: 'blood' | 'volunteer' | 'emergency' | 'medical' | 'other';
  urgency: 'low' | 'normal' | 'urgent' | 'critical';
  blood_group: string | null;
  title: string;
  description: string | null;
  is_sos: boolean;
  status: 'open' | 'closed';
  requester_name: string;
  requester_photo_url: string | null;
  response_count: string;
  distance_km: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Droplet> = {
  blood: Droplet,
  volunteer: HeartHandshake,
  emergency: Siren,
  medical: Stethoscope,
  other: HelpCircle,
};

const TYPE_LABEL_KEY: Record<string, string> = {
  blood: 'community.typeBlood',
  volunteer: 'community.typeVolunteer',
  emergency: 'community.typeEmergency',
  medical: 'community.typeMedical',
  other: 'community.typeOther',
};

const URGENCY_STYLES: Record<string, string> = {
  low: 'bg-ink-100 text-ink-700',
  normal: 'bg-trust-50 text-trust-700',
  urgent: 'bg-amber-100 text-amber-700',
  critical: 'bg-sos-500/10 text-sos-600',
};

export function RequestFeedCard({ request }: { request: CommunityRequestRow }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Icon = TYPE_ICONS[request.type] || HelpCircle;
  const responseCount = parseInt(request.response_count, 10);

  return (
    <button
      type="button"
      onClick={() => navigate(`/community/${request.id}`)}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-shadow hover:shadow-sm ${
        request.is_sos ? 'border-sos-500 bg-sos-500/5' : 'border-ink-100 bg-white'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          request.is_sos ? 'bg-sos-500 text-white' : 'bg-ink-100 text-ink-700'
        }`}
      >
        <Icon className={`h-5 w-5 ${request.is_sos ? 'animate-pulse' : ''}`} />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-ink-900">{request.title}</h3>
          {request.blood_group && (
            <span className="shrink-0 rounded-full bg-sos-500/10 px-2 py-0.5 text-xs font-medium text-sos-600">
              {request.blood_group}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-ink-500">
          {t(TYPE_LABEL_KEY[request.type])} · {request.requester_name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${URGENCY_STYLES[request.urgency]}`}>
            {t(`community.urgency${request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}`)}
          </span>
          {request.distance_km && <span className="text-ink-500">{parseFloat(request.distance_km).toFixed(1)} km</span>}
          {responseCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-trust-700">
              <MessageCircle className="h-3 w-3" />
              {request.is_sos ? t('community.helpersOnTheWay', { count: responseCount }) : responseCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
