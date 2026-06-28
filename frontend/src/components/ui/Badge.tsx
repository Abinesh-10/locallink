import { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

const TIER_STYLES: Record<string, string> = {
  bronze: 'bg-[#CD7F32]/10 text-[#8B5A2B]',
  silver: 'bg-ink-100 text-ink-700',
  gold: 'bg-[#D4AF37]/15 text-[#9A7B1E]',
  platinum: 'bg-trust-50 text-trust-700',
};

export function VerifiedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-trust-50 px-2.5 py-1 text-xs font-medium text-trust-700">
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function TierBadge({ tier, label }: { tier: string; label: string }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.bronze;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{label}</span>;
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">{children}</span>;
}
