import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';

export interface EnrollmentRow {
  id: string;
  course_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  course_title: string;
  course_mode?: string;
  course_price?: string;
  trainer_name?: string;
  student_name?: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-trust-50 text-trust-700',
  cancelled: 'bg-ink-100 text-ink-500',
  completed: 'bg-ink-100 text-ink-700',
};

export function EnrollmentCard({
  enrollment,
  otherPartyLabel,
  actions,
}: {
  enrollment: EnrollmentRow;
  otherPartyLabel: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink-900">{enrollment.course_title}</p>
          <p className="text-sm text-ink-500">{otherPartyLabel}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[enrollment.status]}`}>
          {t(`learn.status${enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}`)}
        </span>
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}
