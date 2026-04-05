import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_MERCHANT_TERMS_VERSION } from '@/constants/merchantTerms';

async function fetchClientIp(): Promise<string | null> {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const j = (await r.json()) as { ip?: string };
    return j.ip ?? null;
  } catch {
    return null;
  }
}

export function useMerchantTermsAcceptance(merchantId: string | null) {
  const [loading, setLoading] = useState(true);
  const [hasAcceptedCurrent, setHasAcceptedCurrent] = useState(false);

  const refresh = useCallback(async () => {
    if (!merchantId) {
      setHasAcceptedCurrent(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('merchant_agreements')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('terms_version', CURRENT_MERCHANT_TERMS_VERSION)
      .maybeSingle();

    if (error) {
      console.error('merchant_agreements check', error);
      setHasAcceptedCurrent(false);
    } else {
      setHasAcceptedCurrent(!!data);
    }
    setLoading(false);
  }, [merchantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const accept = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !merchantId) throw new Error('Not signed in or no merchant account');

    const ip = await fetchClientIp();

    const { error } = await supabase.from('merchant_agreements').insert({
      merchant_id: merchantId,
      user_id: user.id,
      terms_version: CURRENT_MERCHANT_TERMS_VERSION,
      ip_address: ip,
    });

    if (error) throw error;
    setHasAcceptedCurrent(true);
  }, [merchantId]);

  return {
    loading,
    hasAcceptedCurrent,
    accept,
    refresh,
    termsVersion: CURRENT_MERCHANT_TERMS_VERSION,
  };
}
