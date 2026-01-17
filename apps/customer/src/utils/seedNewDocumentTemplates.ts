import { supabase } from '@/integrations/supabase/client';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Seed the new document templates (Incorporator Statement and Board Organizational Consent)
 * into the document_templates table
 */
export async function seedNewDocumentTemplates() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Template 1: Incorporator Statement
    const incorporatorStatementHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Action by Sole Incorporator of {{company.legalName}}</title>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; }
    h1, h2 { text-align: center; }
    .signature-block { margin-top: 60px; }
    ul { list-style-type: none; padding-left: 0; }
    li { margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>ACTION BY SOLE INCORPORATOR</h1>
  <h2>OF {{company.legalName}}</h2>
  <p>Date: {{date}}</p>
  <p>The undersigned, being the sole incorporator of <strong>{{company.legalName}}</strong> (the "Corporation"), a corporation organized and existing under the laws of the State of {{company.state}}, hereby takes the following actions and adopts the following resolutions pursuant to the powers granted to the incorporator under applicable law:</p>
  
  <h3>1. Appointment of Initial Board of Directors</h3>
  <p>RESOLVED, that the following persons are hereby appointed to serve as the initial members of the Board of Directors of the Corporation, to hold office in accordance with the bylaws of the Corporation until their successors are duly elected and qualified:</p>
  <ul>
    {{#each boardMembers}}
      <li>{{name}} – {{address}}</li>
    {{/each}}
  </ul>
  
  <h3>2. Adoption of Bylaws</h3>
  <p>RESOLVED, that the form of bylaws presented to the incorporator and attached hereto as <strong>Exhibit A</strong> are hereby adopted as and for the bylaws of the Corporation.</p>
  
  <h3>3. Resignation of Incorporator</h3>
  <p>RESOLVED, that the undersigned hereby resigns as incorporator of the Corporation, effective immediately upon the appointment of the above-named directors.</p>
  
  <div class="signature-block">
    <p>IN WITNESS WHEREOF, the undersigned has executed this Action by Sole Incorporator on the date first above written.</p>
    <p><strong>__________________________________</strong><br>
    {{incorporator.fullName}}<br>
    Incorporator</p>
  </div>
</body>
</html>`;

    // Template 2: Board Organizational Consent
    const boardOrganizationalConsentHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Organizational Resolutions of the Board of Directors of {{company.legalName}}</title>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; }
    h1, h2 { text-align: center; }
    .signature-block { margin-top: 60px; }
    ul { list-style-type: none; padding-left: 0; }
    li { margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>UNANIMOUS WRITTEN CONSENT</h1>
  <h2>OF THE BOARD OF DIRECTORS OF {{company.legalName}}</h2>
  <p>Date: {{date}}</p>
  <p>The undersigned, being all of the members of the Board of Directors of <strong>{{company.legalName}}</strong> (the "Corporation"), hereby adopt the following resolutions pursuant to the authority granted by the Bylaws and the laws of the State of {{company.state}}.</p>
  
  <h3>1. Adoption of Bylaws</h3>
  <p>RESOLVED, that the Bylaws attached hereto as <strong>Exhibit A</strong> are hereby approved and adopted as the Bylaws of the Corporation.</p>
  
  <h3>2. Appointment of Officers</h3>
  <p>RESOLVED, that the following individuals are hereby appointed to serve as the officers of the Corporation to hold office in accordance with the Bylaws:</p>
  <ul>
    {{#each officers}}
      <li>{{title}}: {{name}}</li>
    {{/each}}
  </ul>
  
  <h3>3. Fiscal Year</h3>
  <p>RESOLVED, that the fiscal year of the Corporation shall end on {{company.fiscalYearEnd}}.</p>
  
  <h3>4. Banking Resolutions</h3>
  <p>RESOLVED, that the officers are hereby authorized to open and maintain such bank accounts in the name of the Corporation at such financial institutions as they may determine, and any two officers, or such officer(s) as may be designated from time to time, are authorized signatories thereon.</p>
  
  <h3>5. Stock Authorization and Issuance</h3>
  <p>RESOLVED, that the Corporation is authorized to issue up to 10,000,000 shares of common stock with a par value of $0.0001 per share, and that the officers are authorized to execute and deliver stock issuance and equity agreements consistent with the approved terms for founders and executives.</p>
  
  <h3>6. Ratification of Pre-Incorporation Actions</h3>
  <p>RESOLVED, that all actions taken on behalf of the Corporation by the incorporator, founders, or officers prior to the incorporation are hereby ratified, confirmed, and approved in all respects.</p>
  
  <div class="signature-block">
    <p>IN WITNESS WHEREOF, the undersigned have executed this Unanimous Written Consent as of the date first above written.</p>
    <ul>
      {{#each directors}}
        <li>__________________________________<br>
        {{name}}, Director</li>
      {{/each}}
    </ul>
  </div>
</body>
</html>`;

    const templates = [
      {
        template_key: 'incorporator_statement',
        name: 'Incorporator Statement',
        category: 'executive',
        html_content: incorporatorStatementHtml,
        placeholders: ['company', 'incorporator', 'boardMembers', 'date'],
        description: 'Action by Sole Incorporator - appoints initial board and adopts bylaws',
        usage_context: 'incorporator_statement',
      },
      {
        template_key: 'board_organizational_consent',
        name: 'Board Organizational Consent',
        category: 'executive',
        html_content: boardOrganizationalConsentHtml,
        placeholders: ['company', 'directors', 'officers', 'date'],
        description: 'Unanimous Written Consent of Board of Directors - organizational resolutions',
        usage_context: 'board_consent_appointment',
      },
    ];

    const results = [];

    for (const template of templates) {
      // Check if template already exists
      const { data: existing } = await supabase
        .from('document_templates')
        .select('id')
        .eq('template_key', template.template_key)
        .single();

      if (existing) {
        // Update existing template
        const { error } = await supabase
          .from('document_templates')
          .update({
            name: template.name,
            category: template.category,
            html_content: template.html_content,
            placeholders: template.placeholders,
            description: template.description,
            is_active: true,
          })
          .eq('template_key', template.template_key);

        if (error) {
          console.error(`Error updating template ${template.template_key}:`, error);
          results.push({ template_key: template.template_key, status: 'error', error: error.message });
        } else {
          results.push({ template_key: template.template_key, status: 'updated' });
        }
      } else {
        // Insert new template
        const { error } = await supabase
          .from('document_templates')
          .insert({
            template_key: template.template_key,
            name: template.name,
            category: template.category,
            html_content: template.html_content,
            placeholders: template.placeholders,
            description: template.description,
            is_active: true,
            created_by: user.id,
          });

        if (error) {
          console.error(`Error inserting template ${template.template_key}:`, error);
          results.push({ template_key: template.template_key, status: 'error', error: error.message });
        } else {
          results.push({ template_key: template.template_key, status: 'created' });
        }
      }

      // Link template to usage context
      const { data: templateData } = await supabase
        .from('document_templates')
        .select('id')
        .eq('template_key', template.template_key)
        .single();

      if (templateData) {
        // Check if usage already exists
        const { data: existingUsage } = await supabase
          .from('template_usage')
          .select('id')
          .eq('template_type', 'document')
          .eq('usage_context', template.usage_context)
          .eq('template_id', templateData.id)
          .single();

        if (!existingUsage) {
          // Set as default for this context
          await supabase
            .from('template_usage')
            .update({ is_default: false })
            .eq('template_type', 'document')
            .eq('usage_context', template.usage_context)
            .eq('is_default', true);

          await supabase
            .from('template_usage')
            .insert({
              template_type: 'document',
              template_id: templateData.id,
              usage_context: template.usage_context,
              is_default: true,
            });
        }
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error seeding templates:', error);
    throw error;
  }
}

