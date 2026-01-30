import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from "../_shared/cors.ts";

import { getCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantId, jobPostingId } = await req.json();

    if (!applicantId || !jobPostingId) {
      throw new Error('Missing required parameters: applicantId and jobPostingId');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch applicant
    const { data: applicant, error: applicantError } = await supabase
      .from('job_applicants')
      .select('*')
      .eq('id', applicantId)
      .single();

    if (applicantError || !applicant) {
      throw new Error(`Applicant not found: ${applicantError?.message}`);
    }

    // Fetch job posting
    const { data: jobPosting, error: jobError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobPostingId)
      .single();

    if (jobError || !jobPosting) {
      throw new Error(`Job posting not found: ${jobError?.message}`);
    }

    // Build AI prompt
    const prompt = `You are an expert recruiter analyzing a candidate for a job position. Analyze the candidate and provide a detailed assessment.

JOB POSTING:
Title: ${jobPosting.title}
Department: ${jobPosting.department}
Location: ${jobPosting.location}
Requirements: ${(jobPosting.requirements || []).join(', ')}
Description: ${jobPosting.description || 'N/A'}
Salary Range: ${jobPosting.salary_min ? `$${(jobPosting.salary_min / 1000).toFixed(0)}K` : 'Not specified'} - ${jobPosting.salary_max ? `$${(jobPosting.salary_max / 1000).toFixed(0)}K` : 'Not specified'}

CANDIDATE PROFILE:
Name: ${applicant.name}
Current Role: ${applicant.applicant_role || 'N/A'}
Current Company: ${applicant.current_company || 'N/A'}
Years of Experience: ${applicant.years_experience || 0}
Location: ${applicant.location || 'N/A'}
Skills: ${(applicant.skills || []).join(', ') || 'N/A'}
Education: ${applicant.education || 'N/A'}
Summary: ${applicant.summary || 'N/A'}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "overallFit": "excellent" | "good" | "moderate" | "poor",
  "score": <number 0-100>,
  "strengths": ["strength1", "strength2", ...],
  "concerns": ["concern1", "concern2", ...],
  "reasoning": "<detailed explanation of the fit assessment>",
  "recommendedOffer": {
    "salaryMin": <number in cents>,
    "salaryMax": <number in cents>,
    "salaryRecommended": <number in cents>,
    "title": "<suggested job title>",
    "benefits": ["benefit1", "benefit2", ...],
    "startDateSuggestion": "YYYY-MM-DD"
  }
}

Consider:
- Skills match against requirements (40% weight)
- Experience level appropriateness (25% weight)
- Education relevance (15% weight)
- Location/remote compatibility (10% weight)
- Current role similarity (10% weight)

For the offer recommendation, consider:
- Market rates for the role and location
- Candidate's experience level
- Company's salary range
- Competitive benefits package

Return ONLY valid JSON, no additional text.`;

    // Call OpenAI
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

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
            content: 'You are an expert recruiter. Analyze candidates objectively and provide detailed assessments. Always return valid JSON only, no additional text or markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const aiData = await openAIResponse.json();
    const analysisText = aiData.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI');
    }

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse AI response: ${parseError}`);
      }
    }

    // Validate analysis structure
    if (!analysis.score || typeof analysis.score !== 'number') {
      throw new Error('Invalid analysis format: missing or invalid score');
    }

    // Update applicant with analysis
    const { error: updateError } = await supabase
      .from('job_applicants')
      .update({
        fit_score: analysis.score,
        ai_analysis: analysis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicantId);

    if (updateError) {
      throw new Error(`Failed to update applicant: ${updateError.message}`);
    }

    // Save offer recommendation if provided
    if (analysis.recommendedOffer) {
      const { error: offerError } = await supabase
        .from('offer_recommendations')
        .insert({
          applicant_id: applicantId,
          salary_min: analysis.recommendedOffer.salaryMin,
          salary_max: analysis.recommendedOffer.salaryMax,
          salary_recommended: analysis.recommendedOffer.salaryRecommended,
          title: analysis.recommendedOffer.title,
          benefits: analysis.recommendedOffer.benefits || [],
          start_date_suggestion: analysis.recommendedOffer.startDateSuggestion,
          reasoning: analysis.reasoning,
        });

      if (offerError) {
        console.error('Error saving offer recommendation:', offerError);
        // Don't fail the whole request if offer save fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Analyze applicant error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

