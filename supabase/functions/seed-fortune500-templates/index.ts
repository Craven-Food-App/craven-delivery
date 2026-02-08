import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from "../_shared/cors.ts";

// Template metadata without server dependencies
const templates = [
  {
    id: 'certificate_of_incorporation',
    title: 'Certificate of Incorporation',
    category: 'governance',
    placeholders: ['company_name', 'state', 'registered_office', 'incorporator_name', 'authorized_shares', 'par_value']
  },
  {
    id: 'bylaws_complete',
    title: 'Corporate Bylaws (Complete)',
    category: 'governance',
    placeholders: ['company_name', 'state_of_incorporation', 'principal_office_address', 'principal_office_city', 'principal_office_state', 'fiscal_year']
  },
  {
    id: 'pre_incorporation_consent',
    title: 'Pre-Incorporation Written Consent',
    category: 'governance',
    placeholders: ['company_name', 'state', 'incorporator_name', 'registered_agent', 'registered_office', 'board_members', 'ceo_name', 'cfo_name', 'secretary_name']
  },
  {
    id: 'bylaws_acknowledgment',
    title: 'Bylaws Acknowledgment & Consent',
    category: 'executive',
    placeholders: ['officer_name', 'title', 'company_name', 'current_date']
  },
  {
    id: 'fiduciary_duty_ethics',
    title: 'Fiduciary Duty & Ethics Acknowledgment',
    category: 'executive',
    placeholders: ['officer_name', 'title', 'company_name', 'current_date']
  },
  {
    id: 'conflict_of_interest_disclosure',
    title: 'Conflict of Interest Disclosure',
    category: 'executive',
    placeholders: ['officer_name', 'title', 'company_name', 'current_date']
  },
  {
    id: 'officer_indemnification',
    title: 'Officer Indemnification Agreement',
    category: 'executive',
    placeholders: ['company_name', 'officer_name', 'title', 'state', 'current_date']
  },
  {
    id: 'equity_incentive_plan',
    title: '2025 Equity Incentive Plan',
    category: 'equity',
    placeholders: ['company_name', 'state', 'equity_pool_shares', 'plan_effective_date', 'board_members']
  },
  {
    id: 'option_rsu_award',
    title: 'Option/RSU Award Agreement',
    category: 'equity',
    placeholders: ['company_name', 'officer_name', 'title', 'award_type', 'shares_granted', 'strike_price', 'grant_date', 'vesting_schedule', 'equity_plan_name']
  }
];

// Sample data for template rendering
const sampleData: Record<string, any> = {
  company_name: "Crave'n, Inc.",
  full_name: 'John Doe',
  role: 'Chief Executive Officer',
  officer_name: 'John Doe',
  title: 'Chief Executive Officer',
  current_date: 'January 1, 2024',
  state: 'Delaware',
  state_of_incorporation: 'Delaware',
  state_abbreviation: 'DE',
  adoption_date: 'January 1, 2024',
  registered_office: '123 Corporate Way, Wilmington, DE 19801',
  registered_office_address: '123 Corporate Way, Wilmington, DE 19801',
  principal_office_address: '456 Main Street',
  principal_office_city: 'San Francisco',
  principal_office_state: 'CA',
  registered_agent: 'Corporation Service Company',
  incorporator_name: 'Torrance Stroman',
  board_members: 'Torrance Stroman, Nathan Curry, Justin Sweet',
  authorized_shares: '100,000,000',
  par_value: '$0.0001',
  shareholders: 'Invero Business Trust (55,000,000 shares - 55%), Founder (18,000,000 shares - 18%), Equity Incentive Pool (14,000,000 shares - 14%)',
  fiscal_year: 'December 31',
  ceo_name: 'Torrance Stroman',
  cfo_name: 'Justin Sweet',
  cxo_name: 'John Doe',
  cto_name: 'Nathan Curry',
  secretary_name: 'Jane Smith',
  secretary_title: 'Corporate Secretary',
  additional_director_name: 'Board Member',
  signers: 'Torrance Stroman, Founder & CEO',
  equity_pool_shares: '14,000,000',
  trust_shares: '55,000,000',
  trust_percentage: '55%',
  founder_shares: '18,000,000',
  founder_percentage: '18%',
  plan_effective_date: 'January 1, 2025',
  plan_adoption_date: 'January 1, 2025',
  award_type: 'Stock Options',
  shares_granted: '100,000',
  strike_price: '$0.10',
  grant_date: 'January 1, 2025',
  vesting_schedule: '4 years with 1-year cliff, 25% vesting after first year, then monthly thereafter',
  equity_plan_name: '2025 Equity Incentive Plan',
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Fortune 500 template IDs to seed
    const fortune500Templates = [
      'certificate_of_incorporation',
      'bylaws_complete',
      'pre_incorporation_consent',
      'bylaws_acknowledgment',
      'fiduciary_duty_ethics',
      'conflict_of_interest_disclosure',
      'officer_indemnification',
      'equity_incentive_plan',
      'option_rsu_award',
    ];

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const templateId of fortune500Templates) {
      try {
        // Find template metadata
        const template = templates.find((t) => t.id === templateId);
        if (!template) {
          console.error(`Template ${templateId} not found in templates array`);
          results.errors++;
          continue;
        }

        // Check if template already exists
        const { data: existing } = await supabaseClient
          .from('document_templates')
          .select('id')
          .eq('template_key', templateId)
          .maybeSingle();

        // Placeholder HTML content - templates will be rendered on-demand
        const htmlContent = `<div class="template-placeholder"><h1>${template.title}</h1><p>Template will be rendered with actual data when generated.</p></div>`;

        if (existing) {
          // Update template metadata
          const { error: updateError } = await supabaseClient
            .from('document_templates')
            .update({
              name: template.title,
              placeholders: template.placeholders,
              is_active: true,
              category: template.category,
              description: `Fortune 500 executive appointment document - ${template.title}`,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`Error updating template ${templateId}:`, updateError);
            results.errors++;
          } else {
            console.log(`✓ Updated template: ${template.title}`);
            results.updated++;
          }
        } else {
          // Insert new template metadata
          const { error: insertError } = await supabaseClient.from('document_templates').insert({
            template_key: templateId,
            name: template.title,
            category: template.category,
            html_content: htmlContent,
            placeholders: template.placeholders,
            is_active: true,
            description: `Fortune 500 executive appointment document - ${template.title}`,
            created_by: user.id,
          });

          if (insertError) {
            console.error(`Error seeding template ${templateId}:`, insertError);
            results.errors++;
          } else {
            console.log(`✓ Seeded template: ${template.title}`);
            results.created++;
          }
        }
      } catch (error: any) {
        console.error(`Error processing template ${templateId}:`, error.message);
        results.errors++;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Error in seed-fortune500-templates:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
