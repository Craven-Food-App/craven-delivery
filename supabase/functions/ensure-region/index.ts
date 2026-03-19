import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from "../_shared/cors.ts";

interface EnsureRegionRequest {
  city?: string;
  state?: string;
  zip_code?: string;
  active_quota?: number;
  display_quota?: number;
}

interface EnsureRegionResponse {
  region_id: number | null;
  region_name: string | null;
  created: boolean;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment configuration');
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json()) as EnsureRegionRequest;

    const normalizedZip = (body.zip_code || '').replace(/[^0-9]/g, '').slice(0, 5);
    if (normalizedZip.length !== 5) {
      return new Response(
        JSON.stringify({ error: 'A valid 5-digit zip_code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const zipPrefix = normalizedZip.slice(0, 3);
    const city = (body.city || '').trim();
    const state = (body.state || '').trim();
    const regionNameFallback = `${city}${city && state ? ', ' : ''}${state}`.trim();
    const regionName = regionNameFallback || `Region ${zipPrefix}`;
    const activeQuota = body.active_quota ?? 50;
    const displayQuota = body.display_quota ?? activeQuota;

    // Check if a region already exists for this ZIP (supports legacy 5-digit rows + new 3-digit prefix rows)
    const { data: existingRegions, error: existingError } = await supabaseClient
      .from('regions')
      .select('id, name, zip_prefix')
      .in('zip_prefix', [zipPrefix, normalizedZip])
      .order('created_at', { ascending: true })
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    const existingRegion = existingRegions?.[0] ?? null;

    if (existingRegion) {
      const payload: EnsureRegionResponse = {
        region_id: existingRegion.id,
        region_name: existingRegion.name,
        created: false,
      };

      return new Response(
        JSON.stringify(payload),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create and immediately open the region for this ZIP prefix
    const { data: insertedRegion, error: insertError } = await supabaseClient
      .from('regions')
      .insert({
        name: regionName,
        zip_prefix: zipPrefix,
        status: 'active',
        active_quota: activeQuota,
        display_quota: displayQuota,
      })
      .select('id, name')
      .single();

    if (insertError) {
      throw insertError;
    }

    const payload: EnsureRegionResponse = {
      region_id: insertedRegion?.id ?? null,
      region_name: insertedRegion?.name ?? regionName,
      created: true,
    };

    return new Response(
      JSON.stringify(payload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('ensure-region error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});



