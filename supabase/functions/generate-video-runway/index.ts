import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

interface VideoGenerationRequest {
  prompt: string;
  duration?: number;
  aspect_ratio?: string;
  style?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, duration = 5, aspect_ratio = "16:9", style = "cinematic" }: VideoGenerationRequest = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Prompt is required" }),
        {
          status: 200, // Return 200 so frontend can read error
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const runwayApiKey = Deno.env.get("RUNWAY_API_KEY");
    if (!runwayApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RUNWAY_API_KEY not configured. Please set it in Supabase Edge Function secrets." }),
        {
          status: 200, // Return 200 so frontend can read error
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating video with prompt: ${prompt.substring(0, 100)}...`);

    // Runway API endpoint for text-to-video generation
    // Based on Runway API documentation, we'll try multiple endpoint formats
    const requestBody: any = {
      prompt: prompt,
    };

    // Add optional parameters if provided
    if (duration) requestBody.duration = duration;
    if (aspect_ratio) requestBody.aspect_ratio = aspect_ratio;
    if (style && style !== 'cinematic') {
      requestBody.style = style;
    }

    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    // Try the Gen-3 Alpha endpoint first (most common)
    // Use api.dev.runwayml.com for the public API
    let response = await fetch("https://api.dev.runwayml.com/v1/gen3-alpha/text-to-video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runwayApiKey}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-09-13",
      },
      body: JSON.stringify(requestBody),
    });

    let responseText = await response.text();
    let responseData: any = null;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // Response is not JSON
    }

    if (!response.ok) {
      console.error("Runway API error (Gen-3 Alpha):", response.status, responseText);
      
      // Try alternative endpoint: Gen-2 or standard text-to-video
      // Use api.dev.runwayml.com for the public API
      const altResponse = await fetch("https://api.dev.runwayml.com/v1/gen2/text-to-video", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${runwayApiKey}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-09-13",
        },
        body: JSON.stringify({
          prompt: prompt,
          duration: duration,
          aspect_ratio: aspect_ratio,
        }),
      });

      const altResponseText = await altResponse.text();
      let altResponseData: any = null;
      
      try {
        altResponseData = JSON.parse(altResponseText);
      } catch {
        // Response is not JSON
      }

      if (!altResponse.ok) {
        console.error("Runway API error (Gen-2):", altResponse.status, altResponseText);
        
        // Return detailed error message (always return 200 so frontend can read the error)
        const errorMessage = altResponseData?.error?.message || 
                            altResponseData?.message || 
                            responseData?.error?.message ||
                            responseData?.message ||
                            `Runway API returned ${altResponse.status}: ${altResponseText.substring(0, 200)}`;
        
        return new Response(
          JSON.stringify({
            success: false,
            error: errorMessage,
            details: {
              primary_endpoint_status: response.status,
              primary_endpoint_error: responseText.substring(0, 500),
              alternative_endpoint_status: altResponse.status,
              alternative_endpoint_error: altResponseText.substring(0, 500),
              request_body: requestBody,
            }
          }),
          {
            status: 200, // Always return 200 so frontend can read error message
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Success with Gen-2
      return new Response(
        JSON.stringify({
          success: true,
          task_id: altResponseData.id || altResponseData.task_id,
          status: altResponseData.status || "processing",
          prompt: prompt,
          message: "Video generation started. Use the task_id to check status.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Success with Gen-3 Alpha
    const data = responseData || {};
    
    return new Response(
      JSON.stringify({
        success: true,
        task_id: data.task_id || data.id,
        status: data.status || "processing",
        prompt: prompt,
        video_url: data.video_url || null,
        message: data.status === "completed" 
          ? "Video generated successfully!" 
          : "Video generation started. Use the task_id to check status.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating video:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Failed to generate video",
        details: error.toString()
      }),
      {
        status: 200, // Return 200 so frontend can read error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

