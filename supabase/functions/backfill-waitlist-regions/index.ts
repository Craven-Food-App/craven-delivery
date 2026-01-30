import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

type AppStatus = 'pending' | 'waitlist' | 'approved';

interface BackfillSummary {
  total_applications: number;
  attempted: number;
  assigned: number;
  created_regions: number;
  errors: number;
  error_details: Array<{ application_id: string; message: string }>;
  skipped: number;
}

const TARGET_STATUSES: AppStatus[] = ['pending', 'waitlist', 'approved'];

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

    const { data: applications, error: appsError } = await supabaseClient
      .from('craver_applications')
      .select('id, city, state, zip_code, region_id')
      .in('status', TARGET_STATUSES);

    if (appsError) {
      throw appsError;
    }

    const summary: BackfillSummary = {
      total_applications: applications?.length ?? 0,
      attempted: 0,
      assigned: 0,
      created_regions: 0,
      errors: 0,
      error_details: [],
      skipped: 0,
    };

    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify(summary),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    for (const app of applications) {
      const normalizedZip = (app.zip_code || '').replace(/[^0-9]/g, '').slice(0, 5);

      if (!normalizedZip) {
        summary.skipped += 1;
        continue;
      }

      summary.attempted += 1;

      try {
        const city = (app.city || '').trim();
        const state = (app.state || '').trim();
        const regionNameFallback = `${city}${city && state ? ', ' : ''}${state}`.trim();
        const regionName = regionNameFallback || `Region ${normalizedZip}`;

        const { data: existingRegion, error: lookupError } = await supabaseClient
          .from('regions')
          .select('id, name')
          .eq('zip_prefix', normalizedZip)
          .maybeSingle();

        if (lookupError) {
          throw lookupError;
        }

        let regionId = existingRegion?.id ?? null;

        if (!regionId) {
          const { data: insertedRegion, error: insertError } = await supabaseClient
            .from('regions')
            .insert({
              name: regionName,
              zip_prefix: normalizedZip,
              status: 'limited',
              active_quota: 50,
              display_quota: 50,
            })
            .select('id')
            .single();

          if (insertError) {
            // Handle race condition where region was created concurrently
            if (insertError.code === '23505') {
              const { data: retryRegion, error: retryError } = await supabaseClient
                .from('regions')
                .select('id')
                .eq('zip_prefix', normalizedZip)
                .maybeSingle();

              if (retryError) {
                throw retryError;
              }

              regionId = retryRegion?.id ?? null;
            } else {
              throw insertError;
            }
          } else {
            regionId = insertedRegion?.id ?? null;
            summary.created_regions += 1;
          }
        }

        if (!regionId) {
          summary.skipped += 1;
          continue;
        }

        if (app.region_id !== regionId) {
          const { error: updateError } = await supabaseClient
            .from('craver_applications')
            .update({ region_id: regionId })
            .eq('id', app.id);

          if (updateError) {
            throw updateError;
          }

          summary.assigned += 1;
        }
      } catch (error) {
        summary.errors += 1;
        const message = error instanceof Error ? error.message : 'Unknown error';
        summary.error_details.push({ application_id: app.id, message });
      }
    }

    return new Response(
      JSON.stringify(summary, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('backfill-waitlist-regions error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

