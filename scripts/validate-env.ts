#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 * Validates that all required environment variables are set
 * Run with: npm run validate:env
 */

import * as fs from 'fs';
import * as path from 'path';

interface EnvVar {
  name: string;
  required: boolean;
  environment: 'frontend' | 'backend' | 'both';
  description: string;
  validatePattern?: RegExp;
  validateMessage?: string;
}

const ENV_VARS: EnvVar[] = [
  // Supabase (Frontend)
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    environment: 'frontend',
    description: 'Supabase project URL',
    validatePattern: /^https:\/\/.+\.supabase\.co$/,
    validateMessage: 'Must be a valid Supabase URL (https://*.supabase.co)',
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    environment: 'frontend',
    description: 'Supabase anonymous key',
    validatePattern: /^eyJ/,
    validateMessage: 'Must be a valid JWT (starts with eyJ)',
  },

  // Supabase (Backend)
  {
    name: 'SUPABASE_URL',
    required: true,
    environment: 'backend',
    description: 'Supabase project URL (backend)',
    validatePattern: /^https:\/\/.+\.supabase\.co$/,
    validateMessage: 'Must be a valid Supabase URL',
  },
  {
    name: 'SUPABASE_ANON_KEY',
    required: true,
    environment: 'backend',
    description: 'Supabase anonymous key (backend)',
    validatePattern: /^eyJ/,
    validateMessage: 'Must be a valid JWT',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    environment: 'backend',
    description: 'Supabase service role key (admin access)',
    validatePattern: /^eyJ/,
    validateMessage: 'Must be a valid JWT',
  },

  // Stripe (Frontend)
  {
    name: 'VITE_STRIPE_PUBLISHABLE_KEY',
    required: true,
    environment: 'frontend',
    description: 'Stripe publishable key',
    validatePattern: /^pk_(test|live)_/,
    validateMessage: 'Must be a valid Stripe publishable key (pk_test_* or pk_live_*)',
  },

  // Stripe (Backend)
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    environment: 'backend',
    description: 'Stripe secret key',
    validatePattern: /^sk_(test|live)_/,
    validateMessage: 'Must be a valid Stripe secret key (sk_test_* or sk_live_*)',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    environment: 'backend',
    description: 'Stripe webhook signing secret',
    validatePattern: /^whsec_/,
    validateMessage: 'Must be a valid Stripe webhook secret (whsec_*)',
  },

  // Mapbox
  {
    name: 'VITE_MAPBOX_TOKEN',
    required: true,
    environment: 'frontend',
    description: 'Mapbox access token',
    validatePattern: /^pk\./,
    validateMessage: 'Must be a valid Mapbox token (pk.*)',
  },

  // Email (SMTP)
  {
    name: 'SMTP_HOST',
    required: false,
    environment: 'backend',
    description: 'SMTP server host',
  },
  {
    name: 'SMTP_PORT',
    required: false,
    environment: 'backend',
    description: 'SMTP server port',
    validatePattern: /^\d+$/,
    validateMessage: 'Must be a valid port number',
  },
  {
    name: 'SMTP_USER',
    required: false,
    environment: 'backend',
    description: 'SMTP authentication username',
  },
  {
    name: 'SMTP_PASS',
    required: false,
    environment: 'backend',
    description: 'SMTP authentication password',
  },

  // CORS & Security
  {
    name: 'ALLOWED_ORIGINS',
    required: true,
    environment: 'backend',
    description: 'Comma-separated list of allowed CORS origins',
  },
  {
    name: 'ORIGIN',
    required: true,
    environment: 'backend',
    description: 'Primary origin for CORS',
  },

  // Server
  {
    name: 'PORT',
    required: false,
    environment: 'backend',
    description: 'Backend server port (defaults to 3001)',
    validatePattern: /^\d+$/,
    validateMessage: 'Must be a valid port number',
  },
  {
    name: 'NODE_ENV',
    required: false,
    environment: 'backend',
    description: 'Node environment (development, production, test)',
    validatePattern: /^(development|production|test)$/,
    validateMessage: 'Must be development, production, or test',
  },
];

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    info: [],
  };

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    result.errors.push('❌ .env file not found! Copy .env.example to .env and configure.');
    result.success = false;
    return result;
  }

  result.info.push('✅ .env file found');

  // Load environment variables (already loaded by dotenv in actual app)
  // We'll just read process.env here

  // Validate each required variable
  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    // Check if required variable is missing
    if (envVar.required && (!value || value.trim() === '')) {
      result.errors.push(
        `❌ REQUIRED: ${envVar.name} (${envVar.environment}) - ${envVar.description}`
      );
      result.success = false;
      continue;
    }

    // Check if optional variable is missing (just a warning)
    if (!envVar.required && (!value || value.trim() === '')) {
      result.warnings.push(
        `⚠️  OPTIONAL: ${envVar.name} (${envVar.environment}) - ${envVar.description} (not set)`
      );
      continue;
    }

    // Validate pattern if provided
    if (value && envVar.validatePattern && !envVar.validatePattern.test(value)) {
      result.errors.push(
        `❌ INVALID: ${envVar.name} - ${envVar.validateMessage || 'Invalid format'}`
      );
      result.success = false;
      continue;
    }

    // Variable is valid
    result.info.push(`✅ ${envVar.name} (${envVar.environment})`);
  }

  // Additional validation: Check if Stripe keys match environment
  const stripePublishable = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (stripePublishable && stripeSecret) {
    const isPublishableTest = stripePublishable.startsWith('pk_test_');
    const isSecretTest = stripeSecret.startsWith('sk_test_');

    if (isPublishableTest !== isSecretTest) {
      result.errors.push(
        '❌ MISMATCH: Stripe publishable and secret keys must both be test or both be live'
      );
      result.success = false;
    }

    if (nodeEnv === 'production') {
      if (isPublishableTest) {
        result.errors.push(
          '❌ PRODUCTION ERROR: Using TEST Stripe keys in production! Switch to LIVE keys.'
        );
        result.success = false;
      } else {
        result.info.push('✅ Using LIVE Stripe keys in production');
      }
    } else {
      if (isPublishableTest) {
        result.info.push('✅ Using TEST Stripe keys in development');
      } else {
        result.warnings.push(
          '⚠️  Using LIVE Stripe keys in development! Consider using TEST keys.'
        );
      }
    }
  }

  return result;
}

function printResults(result: ValidationResult) {
  console.log('\n=================================');
  console.log('  ENVIRONMENT VARIABLE VALIDATION');
  console.log('=================================\n');

  if (result.errors.length > 0) {
    console.log('🚨 ERRORS:\n');
    result.errors.forEach((error) => console.log(`  ${error}`));
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    result.warnings.forEach((warning) => console.log(`  ${warning}`));
    console.log('');
  }

  if (result.info.length > 0 && result.errors.length === 0) {
    console.log('✅ VALID VARIABLES:\n');
    result.info.forEach((info) => console.log(`  ${info}`));
    console.log('');
  }

  console.log('=================================');
  if (result.success) {
    console.log('✅ VALIDATION PASSED');
  } else {
    console.log('❌ VALIDATION FAILED');
    console.log('');
    console.log('Please fix the errors above before deploying.');
    console.log('Refer to .env.example for configuration guidance.');
  }
  console.log('=================================\n');
}

// Main execution
async function main() {
  // Load .env file if it exists
  try {
    const dotenv = await import('dotenv');
    const path = await import('path');
    dotenv.default.config({ path: path.join(process.cwd(), '.env') });
  } catch (e) {
    console.error('Error loading dotenv:', e);
  }

  const result = validateEnvironment();
  printResults(result);

  // Exit with error code if validation failed
  process.exit(result.success ? 0 : 1);
}

main();

