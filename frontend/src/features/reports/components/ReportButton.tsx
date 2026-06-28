import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { reportsApi } from '@/features/reports/api';

interface ReportButtonProps {
  targetType: 'user' | 'worker_profile' | 'rental_listing' | 'product_listing' | 'course' | 'community_request' | 'chat_message';
  targetId: string;
  compact?: boolean;
}

export function ReportButton({ targetType, targetId, compact = true }: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please describe the issue.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await reportsApi.create(targetType, targetId, reason.trim());
      setSubmitted(true);
      setTimeout(() => setShowModal(false), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={
          compact
            ? 'flex items-center gap-1 text-xs text-ink-400 hover:text-sos-500'
            : 'flex items-center gap-2 text-sm text-ink-500 hover:text-sos-500'
        }
      >
        <Flag className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        Report
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center"
          onClick={() => !isSubmitting && setShowModal(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-lg bg-white p-5 sm:rounded-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">Report this</h2>
              {!isSubmitting && (
                <button type="button" onClick={() => setShowModal(false)} aria-label="Cancel">
                  <X className="h-5 w-5 text-ink-500" />
                </button>
              )}
            </div>

            {submitted ? (
              <p className="rounded border border-trust-300 bg-trust-50 px-4 py-3 text-center text-sm text-trust-700">
                Thanks — our team will review this.
              </p>
            ) : (
              <>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">What's wrong?</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Describe the issue…"
                  className="w-full rounded border border-ink-100 px-3 py-2.5 text-ink-900"
                />
                {error && <p className="mt-2 text-sm text-sos-500">{error}</p>}
                <Button type="submit" className="mt-4 w-full" isLoading={isSubmitting}>
                  Submit report
                </Button>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
