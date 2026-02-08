import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

interface W9Request {
  taxClassification: string;
  businessName?: string;
  signature: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { taxClassification, businessName, signature }: W9Request = await req.json();

    // Get user profile and application data
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const { data: application } = await supabaseClient
      .from('craver_applications')
      .select('ssn')
      .eq('user_id', user.id)
      .single();

    if (!profile || !application) {
      throw new Error('Profile or application not found');
    }

    // Generate W-9 document content
    const w9Content = generateW9Text(
      profile.full_name || 'Unknown',
      businessName,
      taxClassification,
      application.ssn,
      signature
    );

    // Upload to storage
    const fileName = `w9_${user.id}_${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('feeder-documents')
      .upload(`w9/${fileName}`, w9Content, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    return new Response(
      JSON.stringify({ 
        documentPath: uploadData.path,
        message: 'W-9 generated successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-w9 function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

function generateW9Text(
  name: string,
  businessName: string | undefined,
  taxClassification: string,
  ssn: string,
  signature: string
): string {
  const timestamp = new Date().toISOString();
  
  return `
===============================================
         IRS FORM W-9 (Rev. October 2018)
  Request for Taxpayer Identification Number
           and Certification
===============================================

Generated: ${timestamp}

1. Name (as shown on your income tax return):
   ${name}

2. Business name (if different from above):
   ${businessName || 'N/A'}

3. Tax Classification:
   ${taxClassification.toUpperCase()}

4. Taxpayer Identification Number (TIN):
   Social Security Number: ${maskSSN(ssn)}

CERTIFICATION:
Under penalties of perjury, I certify that:

1. The number shown on this form is my correct taxpayer 
   identification number (or I am waiting for a number to 
   be issued to me); and

2. I am not subject to backup withholding because: (a) I am 
   exempt from backup withholding, or (b) I have not been 
   notified by the Internal Revenue Service (IRS) that I am 
   subject to backup withholding as a result of a failure to 
   report all interest or dividends, or (c) the IRS has 
   notified me that I am no longer subject to backup 
   withholding; and

3. I am a U.S. citizen or other U.S. person; and

4. The FATCA code(s) entered on this form (if any) indicating 
   that I am exempt from FATCA reporting is correct.

Digital Signature: ${signature}
Date: ${new Date().toLocaleDateString()}

===============================================
        END OF W-9 FORM
===============================================

This document is electronically signed and stored securely.
For questions, contact Crave'N support.
`;
}

function maskSSN(ssn: string): string {
  // Mask all but last 4 digits
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `***-**-${cleaned.slice(-4)}`;
  }
  return '***-**-****';
}

serve(handler);
