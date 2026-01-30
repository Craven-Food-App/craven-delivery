import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task_id } = await req.json();

    if (!task_id) {
      return new Response(
        JSON.stringify({ error: "task_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const runwayApiKey = Deno.env.get("RUNWAY_API_KEY");
    if (!runwayApiKey) {
      return new Response(
        JSON.stringify({ error: "RUNWAY_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check video generation status
    // Use api.dev.runwayml.com for the public API
    // Try multiple endpoint formats
    let response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${task_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${runwayApiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-09-13",
      },
    });

    // If that fails, try alternative endpoint
    if (!response.ok) {
      response = await fetch(`https://api.dev.runwayml.com/v1/gen3-alpha/tasks/${task_id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${runwayApiKey}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-09-13",
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        status: data.status,
        video_url: data.output || data.video_url || null,
        progress: data.progress || null,
        error: data.error || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error checking video status:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to check video status",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

