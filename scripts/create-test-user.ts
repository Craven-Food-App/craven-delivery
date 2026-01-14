/**
 * Create a test user account for app testing
 * Usage: 
 *   SUPABASE_SERVICE_ROLE_KEY=xxx tsx scripts/create-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xaxbucnjlrfkccsfiddq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  console.error('Please set these environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    const email = 'tester@cravenusa.com';
    const password = 'Testing123!';

    console.log(`Creating test user account: ${email}...`);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log(`User already exists. Updating password...`);
      userId = existingUser.id;
      
      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true
      });

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User',
          user_type: 'driver',
          is_test_user: true
        }
      });

      if (authError) {
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create user - no user data returned');
      }

      userId = authData.user.id;
      console.log(`✓ Created auth user: ${userId}`);
    }

    // Create or update driver_profile
    const { data: existingProfile } = await supabase
      .from('driver_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: userId,
          status: 'online',
          vehicle_type: 'car',
          is_test_user: true,
          is_available: true
        });

      if (profileError) {
        throw new Error(`Failed to create driver profile: ${profileError.message}`);
      }
      console.log(`✓ Created driver profile`);
    } else {
      // Update existing profile
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({ is_test_user: true })
        .eq('user_id', userId);

      if (profileError) {
        throw new Error(`Failed to update driver profile: ${profileError.message}`);
      }
      console.log(`✓ Updated driver profile`);
    }

    // Create or update driver_settings with is_test_user flag
    const { data: existingSettings } = await supabase
      .from('driver_settings')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!existingSettings) {
      const { error: settingsError } = await supabase
        .from('driver_settings')
        .insert({
          user_id: userId,
          is_test_user: true,
          on_fire_game_enabled: false
        });

      if (settingsError) {
        throw new Error(`Failed to create driver settings: ${settingsError.message}`);
      }
      console.log(`✓ Created driver settings with is_test_user flag`);
    } else {
      const { error: settingsError } = await supabase
        .from('driver_settings')
        .update({ is_test_user: true })
        .eq('user_id', userId);

      if (settingsError) {
        throw new Error(`Failed to update driver settings: ${settingsError.message}`);
      }
      console.log(`✓ Updated driver settings with is_test_user flag`);
    }

    console.log('\n✓ Test user account created successfully!');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Note: This user will only receive test orders`);

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();

