/**
 * Stripe Setup Verification Script
 * Run this to verify your Stripe configuration
 */

import { createClient } from '@supabase/supabase-js';

const REQUIRED_SUPABASE_SECRETS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'RESEND_API_KEY',
  'MAPBOX_ACCESS_TOKEN',
  'ALLOWED_ORIGINS'
];

const REQUIRED_FRONTEND_ENV = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_MAPBOX_TOKEN'
];

console.log('🔍 STRIPE SETUP VERIFICATION\n');
console.log('=' .repeat(60));

// Check Frontend Environment Variables
console.log('\n📱 FRONTEND ENVIRONMENT VARIABLES:');
console.log('-'.repeat(60));

REQUIRED_FRONTEND_ENV.forEach(key => {
  const value = import.meta.env[key];
  const status = value ? '✅' : '❌';
  const display = value 
    ? `${value.substring(0, 20)}...` 
    : 'MISSING';
  
  console.log(`${status} ${key}: ${display}`);
  
  // Check if using test keys
  if (key === 'VITE_STRIPE_PUBLISHABLE_KEY' && value) {
    if (value.startsWith('pk_test_')) {
      console.log('   ⚠️  WARNING: Using TEST key! Should be pk_live_ for production');
    } else if (value.startsWith('pk_live_')) {
      console.log('   ✅ Using PRODUCTION key');
    }
  }
});

// Instructions for Supabase Secrets
console.log('\n🔐 SUPABASE SECRETS (Manual Check Required):');
console.log('-'.repeat(60));
console.log('Please verify these in Supabase Dashboard → Settings → Edge Functions → Secrets:\n');

REQUIRED_SUPABASE_SECRETS.forEach(key => {
  console.log(`[ ] ${key}`);
  
  if (key === 'STRIPE_SECRET_KEY') {
    console.log('    ⚠️  Must start with sk_live_ (NOT sk_test_)');
  }
  if (key === 'ALLOWED_ORIGINS') {
    console.log('    💡 Should be: https://cravenusa.com,https://www.cravenusa.com,http://localhost:8080');
  }
});

// Payment Functions Check
console.log('\n💳 PAYMENT EDGE FUNCTIONS:');
console.log('-'.repeat(60));

const paymentFunctions = [
  'create-payment',
  'verify-payment',
  'process-refund',
  'stripe-webhook',
  'create-stripe-connect-account',
  'create-stripe-connect-link',
  'manual-driver-payout',
  'daily-driver-payouts',
  'add-payment-method'
];

console.log('These functions use STRIPE_SECRET_KEY:\n');
paymentFunctions.forEach(fn => {
  console.log(`  • ${fn}`);
});

// Next Steps
console.log('\n🎯 NEXT STEPS:');
console.log('=' .repeat(60));
console.log('1. Fix any ❌ missing environment variables above');
console.log('2. Go to Supabase Dashboard and verify all secrets are set');
console.log('3. Ensure STRIPE_SECRET_KEY starts with sk_live_ (production)');
console.log('4. Add ALLOWED_ORIGINS if missing');
console.log('5. Run the payment test script: npm run test:payments');
console.log('\n✅ Once all checks pass, you\'re ready to test payments!\n');

