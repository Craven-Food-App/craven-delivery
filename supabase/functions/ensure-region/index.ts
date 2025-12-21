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
    if (!normalizedZip) {
      return new Response(
        JSON.stringify({ error: 'A valid zip_code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const city = (body.city || '').trim();
    const state = (body.state || '').trim();
    const regionNameFallback = `${city}${city && state ? ', ' : ''}${state}`.trim();
    const regionName = regionNameFallback || `Region ${normalizedZip}`;
    const activeQuota = body.active_quota ?? 50;
    const displayQuota = body.display_quota ?? activeQuota;

    // Check if a region already exists for this zip prefix
    const { data: existingRegion, error: existingError } = await supabaseClient
      .from('regions')
      .select('id, name')
      .eq('zip_prefix', normalizedZip)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

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

    // Create the region
    const { data: insertedRegion, error: insertError } = await supabaseClient
      .from('regions')
      .insert({
        name: regionName,
        zip_prefix: normalizedZip,
        status: 'limited',
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



