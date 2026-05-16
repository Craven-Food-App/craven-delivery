import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import FeederCleanPayCard from '@/components/mobile/FeederCleanPayCard';
import {
  getFeederCleanPaySummary,
  type FeederCleanPaySummary,
} from '@/lib/feederCleanPaySummary';

/**
 * Admin Testing Portal: shows the same Clean Pay itemization feeders see, using the
 * authenticated user’s RPC access (e.g. customer on test orders created as caller).
 */
export const TestingCleanPayOrderPreview: React.FC<{
  orderId: string | null;
  title?: string;
  description?: string;
}> = ({ orderId, title = 'Clean Pay (feeder earnings preview)', description }) => {
  const [summary, setSummary] = useState<FeederCleanPaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const s = await getFeederCleanPaySummary(orderId, null);
      setSummary(s);
      if (s?.error === 'forbidden') {
        setError('Forbidden — sign in as the test customer or use a user tied to this order.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when order id changes only
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {description ? (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 font-mono">Order: {orderId}</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {summary && !summary.error ? (
        <FeederCleanPayCard variant="full" orderEarnings={summary} showTimestamps showAdjustment showVerificationBadge />
      ) : summary?.error ? (
        <p className="text-sm text-muted-foreground">Summary error: {summary.error}</p>
      ) : !error && !loading ? (
        <p className="text-sm text-muted-foreground">No summary returned (migration/RPC may not be deployed yet).</p>
      ) : null}
    </div>
  );
};
