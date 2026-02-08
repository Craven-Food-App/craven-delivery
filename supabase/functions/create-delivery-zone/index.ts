import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // SECURITY: Get secure CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, city, state, zip_code, geojson } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment variables are not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: { persistSession: false },
      }
    )

    // Convert GeoJSON to PostGIS geometry using the function
    const { data: geomResult, error: geomError } = await supabase
      .rpc('st_geomfromgeojson_text', { geojson: JSON.stringify(geojson) });

    if (geomError) {
      return new Response(JSON.stringify({ error: geomError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data, error } = await supabase
      .from('delivery_zones')
      .insert({
        name,
        city,
        state,
        zip_code,
        geom: geomResult,
        active: true
      })
      .select('id, name, city, state, zip_code, active')
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message || 'Failed to create zone' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ zone: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
