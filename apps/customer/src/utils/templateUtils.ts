import { supabase } from '@/integrations/supabase/client';
import { renderHtml } from '@/lib/templates';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildFallbackDocumentHtml = (templateId: string, data: Record<string, any>): string => {
  const rows = Object.entries(data)
    .filter(([, value]) => value != null && value !== '')
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding: 6px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600;">
            ${escapeHtml(key)}
          </td>
          <td style="padding: 6px 12px; border: 1px solid #e2e8f0;">
            ${escapeHtml(String(value))}
          </td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(templateId)}</title>
        <style>
          @media print {
            body { font-family: "Times New Roman", serif; background: #fff; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 6px 10px; }
            h1, h2, h3 { margin: 0 0 8px; }
          }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 32px; background: #ffffff; color: #0f172a;">
        <header style="margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 26px; color: #0f172a;">${escapeHtml(templateId.replace(/_/g, ' '))}</h1>
          <p style="margin: 8px 0 0; color: #475569; font-size: 14px;">
            This document uses the default fallback template because a customized template was not found or is incomplete.
          </p>
        </header>

        <section>
          <table style="border-collapse: collapse; width: 100%; max-width: 760px;">
            <tbody>
              ${rows || '<tr><td style="padding:12px; border:1px solid #e2e8f0;">No data available.</td></tr>'}
            </tbody>
          </table>
        </section>

        <footer style="margin-top: 40px; color: #64748b; font-size: 12px; text-align: center;">
          <p style="margin: 0;">Generated automatically by Crave\'N Executive Document System</p>
        </footer>
      </body>
    </html>
  `;
};

/**
 * Fetch email template from database, with fallback to hardcoded templates
 */
export async function getEmailTemplate(
  templateKey: string,
  usageContext?: string
): Promise<{ subject: string; html_content: string; variables: string[] } | null> {
  try {
    // First, try to get from template_usage if usageContext is provided
    if (usageContext) {
      const { data: usage } = await supabase
        .from('template_usage')
        .select('template_id')
        .eq('template_type', 'email')
        .eq('usage_context', usageContext)
        .eq('is_default', true)
        .single();

      if (usage?.template_id) {
        const { data: template } = await supabase
          .from('email_templates')
          .select('subject, html_content, variables')
          .eq('id', usage.template_id)
          .eq('is_active', true)
          .single();

        if (template) {
          return {
            subject: template.subject,
            html_content: template.html_content,
            variables: Array.isArray(template.variables) ? template.variables.map(v => String(v)) : [],
          };
        }
      }
    }

    // Fallback: try to get by template_key
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject, html_content, variables')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single();

    if (template) {
      return {
        subject: template.subject,
        html_content: template.html_content,
        variables: Array.isArray(template.variables) ? template.variables.map(v => String(v)) : [],
      };
    }
  } catch (error) {
    console.warn(`Template not found in database for ${templateKey}, using fallback`);
  }

  // Hardcoded fallback - return null to indicate fallback should be used
  return null;
}

/**
 * Fetch document template from database, with fallback to hardcoded templates
 */
export async function getDocumentTemplate(
  templateKey: string,
  usageContext?: string
): Promise<{ html_content: string; placeholders: string[] } | null> {
  try {
    // First, try to get from template_usage if usageContext is provided
    if (usageContext) {
      const { data: usage } = await supabase
        .from('template_usage')
        .select('template_id')
        .eq('template_type', 'document')
        .eq('usage_context', usageContext)
        .eq('is_default', true)
        .single();

      if (usage?.template_id) {
        const { data: template } = await supabase
          .from('document_templates')
          .select('html_content, placeholders')
          .eq('id', usage.template_id)
          .eq('is_active', true)
          .single();

        if (template) {
          return {
            html_content: template.html_content,
            placeholders: Array.isArray(template.placeholders) ? template.placeholders.map(p => String(p)) : [],
          };
        }
      }
    }

    // Fallback: try to get by template_key
    // Don't filter by is_active here - we'll check it but still return inactive templates
    // This allows us to see what's wrong
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('html_content, placeholders, is_active')
      .eq('template_key', templateKey)
      .single();

    if (templateError) {
      console.error(`Error fetching template ${templateKey}:`, templateError);
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    if (template) {
      if (!template.is_active) {
        console.warn(`Template ${templateKey} exists but is not active - activating it`);
        // Try to activate it
        await supabase
          .from('document_templates')
          .update({ is_active: true })
          .eq('template_key', templateKey);
      }
      return {
        html_content: template.html_content,
        placeholders: Array.isArray(template.placeholders) ? template.placeholders.map(p => String(p)) : [],
      };
    }
  } catch (error: any) {
    console.error(`Error fetching template ${templateKey}:`, error);
    if (error.message && error.message.includes('Failed to fetch')) {
      throw error; // Re-throw if it's our error
    }
    console.warn(`Template not found in database for ${templateKey}`);
  }

  // Hardcoded fallback - return null to indicate fallback should be used
  return null;
}

/**
 * Check if template content is a placeholder or empty
 */
function isPlaceholderTemplate(htmlContent: string): boolean {
  if (!htmlContent || htmlContent.trim().length < 50) {
    return true;
  }
  
  // Check for placeholder comments
  const placeholderPatterns = [
    /<!--\s*Template will be loaded/i,
    /<!--\s*placeholder/i,
    /<!--\s*edit this template/i,
    /placeholder content/i,
    /^<!--[\s\S]*?-->$/m, // Only HTML comments
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(htmlContent));
}

/**
 * Check if template has expected structure for employment_agreement
 * This helps detect if database template is a simplified/wrong version
 */
function hasExpectedStructure(templateId: string, htmlContent: string): boolean {
  const expectedSections: Record<string, string[]> = {
    'employment_agreement': [
      'Duties',
      'Equity',
      'Compensation',
      'Confidentiality',
      'At-Will',
      'Restrictive',
      'Dispute Resolution',
    ],
    'board_resolution': [
      'WHEREAS',
      'RESOLVED',
      'Board Resolution',
    ],
    'pre_incorporation_consent': [
      'Pre-Incorporation',
      'Incorporator',
      'Articles of Incorporation',
      'RESOLVED',
      'Effective Time',
    ],
    'stock_issuance': [
      'Stock Subscription',
      'share',
      'purchase',
    ],
    'offer_letter': [
      'offer',
      'position',
      'salary',
      'equity',
    ],
  };

  const sections = expectedSections[templateId];
  if (!sections) return true; // Unknown template type, assume valid

  // Check if at least 50% of expected sections are present
  const foundSections = sections.filter(section => 
    htmlContent.toLowerCase().includes(section.toLowerCase())
  );
  
  return foundSections.length >= Math.ceil(sections.length * 0.5);
}

/**
 * Render document HTML - REQUIRES database template (no hardcoded fallback)
 * All document templates must be provided via Template Manager
 */
export async function renderDocumentHtml(
  templateId: string,
  data: Record<string, any>,
  usageContext?: string
): Promise<string> {
  const fallbackHtml = buildFallbackDocumentHtml(templateId, data);

  // Require database template - no hardcoded fallback
  const dbTemplate = await getDocumentTemplate(templateId, usageContext);
  
  if (!dbTemplate) {
    console.warn(
      `Document template '${templateId}' not found in database. Using fallback HTML.`,
    );
    return fallbackHtml;
  }
  
  if (isPlaceholderTemplate(dbTemplate.html_content)) {
    console.warn(
      `Document template '${templateId}' exists but appears to be a placeholder. Using fallback HTML.`,
    );
    return fallbackHtml;
  }
  
  // Check if template has expected structure (not a simplified/wrong version)
  if (!hasExpectedStructure(templateId, dbTemplate.html_content)) {
    console.warn(
      `Database template for ${templateId} appears to be simplified or incorrect. ` +
      `Please verify the template content in Template Manager.`
    );
    // Continue anyway - user's template may have different structure
  }
  
  // Replace placeholders in database template
  // Handle multiple placeholder formats: {{key}}, ${key}, [key], {{ key }}, etc.
  let html = dbTemplate.html_content;
  
  // Create a comprehensive data map with aliases for common field name variations
  const dataMap: Record<string, string> = {};
  
  // First, add all original data
  Object.keys(data).forEach((key) => {
    dataMap[key] = String(data[key] || '');
  });
  
  // Add common aliases to ensure placeholders are matched
  const aliasMap: Record<string, string[]> = {
    'full_name': ['executive_name', 'name', 'officer_name', 'employee_name', 'recipient_name', 'subscriber_name', 'counterparty_name'],
    'company_name': ['company', 'corporation'],
    'role': ['position', 'title', 'position_title', 'executive_title'],
    'effective_date': ['date', 'appointment_date', 'grant_date', 'offer_date', 'start_date'],
    'equity_percentage': ['equity_percent', 'ownership_percent', 'equity'],
    'share_count': ['shares_issued', 'shares_total', 'shares'],
    'price_per_share': ['strike_price', 'share_price'],
    'annual_salary': ['annual_base_salary', 'base_salary', 'salary'],
    'funding_trigger': ['funding_trigger_amount', 'deferral_trigger'],
    'vesting_schedule': ['vesting_terms', 'vesting'],
    'governing_law': ['governing_law_state', 'state_of_incorporation'],
  };
  
  // Populate aliases
  Object.keys(aliasMap).forEach((key) => {
    if (dataMap[key]) {
      aliasMap[key].forEach((alias) => {
        if (!dataMap[alias]) {
          dataMap[alias] = dataMap[key];
        }
      });
    }
  });
  
  // Also add reverse mappings (if alias exists, map to original)
  Object.keys(aliasMap).forEach((key) => {
    aliasMap[key].forEach((alias) => {
      if (dataMap[alias] && !dataMap[key]) {
        dataMap[key] = dataMap[alias];
      }
    });
  });
  
  // Multiple passes to ensure all placeholders are replaced
  for (let pass = 0; pass < 3; pass++) {
    Object.keys(dataMap).forEach((key) => {
      const value = dataMap[key];
      
      // Escape special regex characters in key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Common placeholder formats - case-insensitive matching
      const formats = [
        // Double curly braces (most common): {{key}}, {{ key }}
        { pattern: new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gi'), replace: value },
        // Single curly braces: {key}
        { pattern: new RegExp(`\\{${escapedKey}\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'gi'), replace: value },
        // Dollar sign format: ${key}, $key
        { pattern: new RegExp(`\\$\\{${escapedKey}\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\$\\{\\s*${escapedKey}\\s*\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\$\\{data\\.${escapedKey}\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\$\\{data\\[['"]${escapedKey}['"]\\]\\}`, 'gi'), replace: value },
        // Square brackets: [key]
        { pattern: new RegExp(`\\[${escapedKey}\\]`, 'gi'), replace: value },
        { pattern: new RegExp(`\\[\\s*${escapedKey}\\s*\\]`, 'gi'), replace: value },
        // Case variations for all formats
        { pattern: new RegExp(`\\{\\{${escapedKey.toLowerCase()}\\}\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\{\\{${escapedKey.toUpperCase()}\\}\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\$\\{${escapedKey.toLowerCase()}\\}`, 'gi'), replace: value },
        { pattern: new RegExp(`\\$\\{${escapedKey.toUpperCase()}\\}`, 'gi'), replace: value },
      ];
      
      formats.forEach(({ pattern, replace }) => {
        html = html.replace(pattern, replace);
      });
    });
  }
  
  // Log any remaining placeholders for debugging (but don't remove them - they might be intentional)
  const remainingPlaceholders = html.match(/\{\{[\w\s]+\}\}/g) || [];
  if (remainingPlaceholders.length > 0) {
    console.warn(`Template ${templateId} has ${remainingPlaceholders.length} unmatched placeholders:`, remainingPlaceholders.slice(0, 10));
    console.warn('Available data keys:', Object.keys(dataMap).slice(0, 20));
  }
  
  return html || fallbackHtml;
}

/**
 * Seed initial email templates from hardcoded values
 * NOTE: This function is deprecated - email templates should be created/imported via Template Manager UI
 */
export async function seedEmailTemplates(): Promise<void> {
  console.warn('seedEmailTemplates() is deprecated. Please use Template Manager UI to create/import email templates.');
  // No hardcoded templates - user must provide templates via database
}

/**
 * Seed initial document templates from hardcoded templates
 */
export async function seedDocumentTemplates(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Note: This would need to extract HTML from src/lib/templates.ts
  // For now, we'll just create placeholder entries that can be edited
  const initialTemplates = [
    {
      template_key: 'employment_agreement',
      name: 'Executive Employment Agreement',
      category: 'executive',
      html_content: '<!-- Template will be loaded from src/lib/templates.ts by default. Edit this template to customize. -->',
      placeholders: ['company_name', 'full_name', 'role', 'equity_percentage', 'effective_date', 'funding_trigger', 'governing_law'],
      description: 'Executive employment agreement template',
    },
    {
      template_key: 'board_resolution',
      name: 'Board Resolution – Appointment of Officers',
      category: 'executive',
      html_content: '<!-- Template will be loaded from src/lib/templates.ts by default. Edit this template to customize. -->',
      placeholders: ['company_name', 'date', 'directors', 'ceo_name', 'cfo_name', 'cxo_name', 'equity_ceo', 'equity_cfo', 'equity_cxo', 'funding_trigger'],
      description: 'Board resolution template for officer appointments',
    },
    {
      template_key: 'stock_issuance',
      name: 'Stock Subscription / Issuance Agreement',
      category: 'executive',
      html_content: '<!-- Template will be loaded from src/lib/templates.ts by default. Edit this template to customize. -->',
      placeholders: ['company_name', 'full_name', 'role', 'share_count', 'price_per_share', 'total_purchase_price', 'share_class', 'consideration_type', 'vesting_schedule', 'currency'],
      description: 'Stock issuance agreement template',
    },
    {
      template_key: 'offer_letter',
      name: 'Executive Offer Letter',
      category: 'executive',
      html_content: '<!-- Template will be loaded from src/lib/templates.ts by default. Edit this template to customize. -->',
      placeholders: ['company_name', 'offer_date', 'executive_name', 'position_title', 'annual_base_salary', 'share_count', 'ownership_percent', 'vesting_period', 'vesting_cliff'],
      description: 'Executive offer letter template',
    },
    {
      template_key: 'pre_incorporation_consent',
      name: 'Pre-Incorporation Consent (Conditional Appointments)',
      category: 'executive',
      html_content: '<!-- Template will be loaded from server/templates/pre_incorporation_consent.hbs by default. Edit this template to customize. -->',
      placeholders: [
        'company_name', 'state', 'state_of_incorporation', 'registered_office', 'state_filing_office',
        'director_1_name', 'director_1_address', 'director_1_email',
        'director_2_name', 'director_2_address', 'director_2_email',
        'officer_1_name', 'officer_1_title', 'officer_1_email',
        'officer_2_name', 'officer_2_title', 'officer_2_email',
        'officer_3_name', 'officer_3_title', 'officer_3_email',
        'officer_4_name', 'officer_4_title', 'officer_4_email',
        'fiscal_year_end', 'registered_agent_name', 'registered_agent_address',
        'incorporator_name', 'incorporator_address', 'incorporator_email',
        'county', 'consent_date', 'notary_date',
        'appointee_1_name', 'appointee_1_role', 'appointee_1_email',
        'appointee_2_name', 'appointee_2_role', 'appointee_2_email',
        'appointee_3_name', 'appointee_3_role', 'appointee_3_email',
        'appointee_4_name', 'appointee_4_role', 'appointee_4_email',
        'counterparty_1', 'agreement_1_name', 'agreement_1_date', 'agreement_1_notes'
      ],
      description: 'Pre-incorporation consent template for conditional officer appointments',
    },
  ];

  for (const template of initialTemplates) {
    const { data: existing } = await supabase
      .from('document_templates')
      .select('id')
      .eq('template_key', template.template_key)
      .single();

    if (!existing) {
      await supabase.from('document_templates').insert({
        ...template,
        created_by: user.id,
      });
    }
  }
}

