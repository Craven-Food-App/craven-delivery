// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, orderIds, diamondOnlySeconds } = await req.json();

    switch (type) {
      case 'flash_drop':
        // Generate flash drop orders
        if (!orderIds || orderIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'orderIds required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const diamondUntil = new Date(Date.now() + (diamondOnlySeconds || 90) * 1000).toISOString();

        const { data: flashOrders, error: flashError } = await supabase
          .from('orders')
          .update({
            exclusive_type: 'flash_drop',
            diamond_only_until: diamondUntil,
            order_status: 'pending',
          })
          .in('id', orderIds)
          .select();

        if (flashError) throw flashError;

        // Broadcast via realtime
        await supabase.channel('exclusive_orders').send({
          type: 'broadcast',
          event: 'flash_drop_created',
          payload: { orders: flashOrders },
        });

        return new Response(
          JSON.stringify({ success: true, orders: flashOrders }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'vault':
        // Generate vault orders (Diamond-only, no time limit)
        if (!orderIds || orderIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'orderIds required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: vaultOrders, error: vaultError } = await supabase
          .from('orders')
          .update({
            exclusive_type: 'vault',
            diamond_only_until: null, // Vault orders are always Diamond-only
            order_status: 'pending',
          })
          .in('id', orderIds)
          .select();

        if (vaultError) throw vaultError;

        await supabase.channel('exclusive_orders').send({
          type: 'broadcast',
          event: 'vault_order_created',
          payload: { orders: vaultOrders },
        });

        return new Response(
          JSON.stringify({ success: true, orders: vaultOrders }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'mystery':
        // Generate mystery orders
        if (!orderIds || orderIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'orderIds required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const mysteryUntil = new Date(Date.now() + (diamondOnlySeconds || 120) * 1000).toISOString();

        const { data: mysteryOrders, error: mysteryError } = await supabase
          .from('orders')
          .update({
            exclusive_type: 'mystery',
            payout_hidden: true,
            diamond_only_until: mysteryUntil,
            order_status: 'pending',
          })
          .in('id', orderIds)
          .select();

        if (mysteryError) throw mysteryError;

        await supabase.channel('exclusive_orders').send({
          type: 'broadcast',
          event: 'mystery_order_created',
          payload: { orders: mysteryOrders },
        });

        return new Response(
          JSON.stringify({ success: true, orders: mysteryOrders }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'batch':
        // Generate surprise batch
        if (!orderIds || orderIds.length < 2) {
          return new Response(
            JSON.stringify({ error: 'At least 2 orderIds required for batch' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const batchUntil = new Date(Date.now() + (diamondOnlySeconds || 120) * 1000).toISOString();

        // Create batch record
        const { data: batch, error: batchError } = await supabase
          .from('order_batches')
          .insert({
            order_ids: orderIds,
            batch_type: 'surprise',
            diamond_only_until: batchUntil,
          })
          .select()
          .single();

        if (batchError) throw batchError;

        // Update orders
        const { data: batchOrders, error: batchOrdersError } = await supabase
          .from('orders')
          .update({
            exclusive_type: 'batch',
            batch_id: batch.id,
            diamond_only_until: batchUntil,
            order_status: 'pending',
          })
          .in('id', orderIds)
          .select();

        if (batchOrdersError) throw batchOrdersError;

        await supabase.channel('exclusive_orders').send({
          type: 'broadcast',
          event: 'surprise_batch_created',
          payload: { batch, orders: batchOrders },
        });

        return new Response(
          JSON.stringify({ success: true, batch, orders: batchOrders }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

