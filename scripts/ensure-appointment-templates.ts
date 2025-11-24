#!/usr/bin/env node
/**
 * Script to ensure appointment document templates exist in the database
 * This can be run manually if migrations haven't been applied
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function ensureTemplates() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking for appointment templates...\n');

  // Check which templates exist
  const requiredTemplates = ['offer_letter', 'board_resolution', 'employment_agreement', 'stock_certificate'];
  
  for (const templateKey of requiredTemplates) {
    const { data, error } = await supabase
      .from('document_templates')
      .select('template_key, name, is_active')
      .eq('template_key', templateKey)
      .single();

    if (error || !data) {
      console.log(`❌ Missing template: ${templateKey}`);
    } else {
      console.log(`✅ Found template: ${templateKey} (${data.name}) - Active: ${data.is_active}`);
    }
  }

  console.log('\n📝 To fix missing templates, run the migration:');
  console.log('   supabase/migrations/20250211000012_ensure_appointment_templates_exist.sql');
  console.log('\n   Or apply it via Supabase Dashboard → SQL Editor');
}

ensureTemplates().catch(console.error);




