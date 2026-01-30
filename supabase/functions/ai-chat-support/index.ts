import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

import { getCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  const origin = req.headers.get('origin') || req.headers.get('referer') || '*';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for OpenAI API key
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('OPENAI_API_KEY is not set in Supabase environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'AI service is not configured. Please contact support.',
          details: 'OPENAI_API_KEY missing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const { message, conversationId, userId } = await req.json();

    if (!message || !conversationId || !userId) {
      console.error('Missing required parameters:', { message: !!message, conversationId: !!conversationId, userId: !!userId });
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get conversation context
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context for AI
    const context = recentMessages?.reverse().map(msg => 
      `${msg.sender_type}: ${msg.content}`
    ).join('\n') || '';

    // Call OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Crave'n customer support AI assistant. You help with food delivery issues, order problems, payment questions, and general app support. Be helpful, friendly, and professional. If you can't solve an issue, suggest escalating to human support.

Context: This is a ${conversation.type} conversation. Priority: ${conversation.priority}.
Recent conversation: ${context}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`Failed to get AI response: ${openAIResponse.status} - ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    if (!openAIData.choices || !openAIData.choices[0] || !openAIData.choices[0].message) {
      console.error('Invalid OpenAI response structure:', openAIData);
      throw new Error('Invalid AI response structure');
    }
    const aiResponse = openAIData.choices[0].message.content;

    // Save AI response to database
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        content: aiResponse,
        message_type: 'text',
      });

    if (insertError) {
      console.error('Error inserting AI message:', insertError);
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('AI chat support error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});