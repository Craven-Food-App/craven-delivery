// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return [
    "https://44d88461-c1ea-4d22-93fe-ebc1a7d81db9.lovableproject.com",
    "https://cravenusa.com",
    "https://www.cravenusa.com",
    "https://feeder.cravenusa.com",
    "http://localhost:8080",
    "http://localhost:5173",
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json();

    switch (action) {
      case 'recalculate_priorities':
        await recalculateQueuePriorities(supabase);
        break;
      
      case 'check_region_capacity':
        await checkRegionCapacity(supabase);
        break;
      
      case 'notify_upcoming_activations':
        await notifyUpcomingActivations(supabase);
        break;
      
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({ success: true, message: `Action ${action} completed` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue management error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Recalculate priority scores for all drivers in the queue
 */
async function recalculateQueuePriorities(supabase) {
  console.log('Recalculating queue priorities...');

  // Get all waitlist drivers with their completed tasks
  const { data: drivers, error: driversError } = await supabase
    .from('craver_applications')
    .select(`
      id,
      points,
      priority_score,
      created_at,
      regions!inner(id, name)
    `)
    .eq('status', 'waitlist');

  if (driversError) throw driversError;

  for (const driver of drivers) {
    // Calculate new priority score based on:
    // 1. Points from completed tasks
    // 2. Time on waitlist (earlier = higher priority)
    // 3. Referral bonuses
    
    const daysOnWaitlist = Math.floor(
      (new Date() - new Date(driver.created_at)) / (1000 * 60 * 60 * 24)
    );
    
    // Base priority from points
    let newPriorityScore = driver.points || 0;
    
    // Bonus for time on waitlist (diminishing returns)
    const timeBonus = Math.min(daysOnWaitlist * 2, 50);
    newPriorityScore += timeBonus;
    
    // Check for referral bonuses
    const { data: referrals } = await supabase
      .from('driver_referrals')
      .select('points_awarded')
      .eq('referrer_id', driver.id)
      .eq('status', 'completed');
    
    if (referrals) {
      const referralBonus = referrals.reduce((sum, ref) => sum + (ref.points_awarded || 0), 0);
      newPriorityScore += referralBonus;
    }

    // Update priority score
    const { error: updateError } = await supabase
      .from('craver_applications')
      .update({ priority_score: newPriorityScore })
      .eq('id', driver.id);

    if (updateError) {
      console.error(`Failed to update priority for driver ${driver.id}:`, updateError);
    }
  }

  // Update activation queue with new priorities
  const { error: queueError } = await supabase
    .from('activation_queue')
    .update({ priority_score: supabase.from('craver_applications').select('priority_score') })
    .eq('driver_id', supabase.from('craver_applications').select('id'));

  if (queueError) {
    console.error('Failed to update activation queue:', queueError);
  }

  console.log(`Updated priorities for ${drivers.length} drivers`);
}

/**
 * Check region capacity and auto-open regions if needed
 */
async function checkRegionCapacity(supabase) {
  console.log('Checking region capacity...');

  // Get all regions with their current active driver counts
  const { data: regions, error: regionsError } = await supabase
    .from('regions')
    .select(`
      id,
      name,
      status,
      active_quota,
      craver_applications!inner(status)
    `);

  if (regionsError) throw regionsError;

  for (const region of regions) {
    const activeDrivers = region.craver_applications.filter(app => app.status === 'approved').length;
    const waitlistCount = region.craver_applications.filter(app => app.status === 'waitlist').length;
    
    // If region is at less than 80% capacity and has waitlist drivers, consider opening more slots
    const capacityPercentage = (activeDrivers / region.active_quota) * 100;
    
    if (capacityPercentage < 80 && waitlistCount > 0 && region.status === 'limited') {
      console.log(`Region ${region.name} is at ${capacityPercentage.toFixed(1)}% capacity with ${waitlistCount} waitlist drivers`);
      
      // Auto-activate top priority drivers (up to 10% of quota)
      const slotsToOpen = Math.min(
        Math.floor(region.active_quota * 0.1),
        waitlistCount
      );
      
      if (slotsToOpen > 0) {
        await activateTopDrivers(supabase, region.id, slotsToOpen);
      }
    }
  }
}

/**
 * Notify drivers in top 10% of queue about upcoming activation
 */
async function notifyUpcomingActivations(supabase) {
  console.log('Notifying upcoming activations...');

  // Get top 10% of drivers by priority score for each region
  const { data: regions, error: regionsError } = await supabase
    .from('regions')
    .select('id, name, active_quota');

  if (regionsError) throw regionsError;

  for (const region of regions) {
    // Get current active count
    const { data: activeCount } = await supabase
      .from('craver_applications')
      .select('id', { count: 'exact' })
      .eq('region_id', region.id)
      .eq('status', 'approved');

    const currentActive = activeCount?.length || 0;
    const availableSlots = region.active_quota - currentActive;
    
    if (availableSlots > 0) {
      // Get top priority drivers
      const { data: topDrivers, error: driversError } = await supabase
        .from('craver_applications')
        .select('id, first_name, last_name, email, priority_score')
        .eq('region_id', region.id)
        .eq('status', 'waitlist')
        .order('priority_score', { ascending: false })
        .limit(Math.min(availableSlots * 2, 20)); // Notify 2x the available slots

      if (driversError) throw driversError;

      // Send notification emails
      for (const driver of topDrivers) {
        await sendUpcomingActivationEmail(supabase, driver, region);
      }
    }
  }
}

/**
 * Activate top priority drivers for a region
 */
async function activateTopDrivers(supabase, regionId, count) {
  console.log(`Activating top ${count} drivers for region ${regionId}`);

  // Get top priority drivers
  const { data: topDrivers, error: driversError } = await supabase
    .from('craver_applications')
    .select('id, first_name, last_name, email')
    .eq('region_id', regionId)
    .eq('status', 'waitlist')
    .order('priority_score', { ascending: false })
    .limit(count);

  if (driversError) throw driversError;

  // Activate drivers
  const driverIds = topDrivers.map(d => d.id);
  
  const { error: updateError } = await supabase
    .from('craver_applications')
    .update({ 
      status: 'approved',
      background_check: true,
      background_check_initiated_at: new Date().toISOString()
    })
    .in('id', driverIds);

  if (updateError) throw updateError;

  // Send activation emails
  for (const driver of topDrivers) {
    await sendActivationEmail(supabase, driver);
  }

  console.log(`Activated ${topDrivers.length} drivers`);
}

/**
 * Send upcoming activation notification email
 */
async function sendUpcomingActivationEmail(supabase, driver, region) {
  try {
    const { error } = await supabase.functions.invoke('send-driver-waitlist-email', {
      body: {
        driverName: `${driver.first_name} ${driver.last_name}`,
        driverEmail: driver.email,
        city: region.name,
        messageType: 'upcoming_activation',
        priorityScore: driver.priority_score
      }
    });

    if (error) throw error;
    console.log(`Sent upcoming activation email to ${driver.email}`);
  } catch (error) {
    console.error(`Failed to send email to ${driver.email}:`, error);
  }
}

/**
 * Send activation email
 */
async function sendActivationEmail(supabase, driver) {
  try {
    // Generate a random password
    const generatePassword = () => {
      const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const lowercase = 'abcdefghijkmnpqrstuvwxyz';
      const numbers = '23456789';
      const specialChars = '!@#$%&*';
      
      const getRandomChar = (chars) => chars[Math.floor(Math.random() * chars.length)];
      const getRandomString = (length, chars) => {
        return Array.from({ length }, () => getRandomChar(chars)).join('');
      };
      
      const part1 = getRandomString(4, uppercase + lowercase);
      const num1 = getRandomString(3, numbers);
      const special = getRandomChar(specialChars);
      const part2 = getRandomString(3, uppercase + lowercase);
      const num2 = getRandomString(2, numbers);
      
      return `${part1}${num1}${special}${part2}${num2}`;
    };
    
    let presetPassword = generatePassword();
    
    // Check if user has an auth account and manage password
    try {
      const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
      
      let userExists = false;
      let userId = null;
      
      if (!authListError && authUsers) {
        const existingUser = authUsers.users.find(u => u.email === driver.email);
        if (existingUser) {
          userExists = true;
          userId = existingUser.id;
        }
      }
      
      if (userExists && userId) {
        // Update existing user's password
        const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(
          userId,
          { password: presetPassword }
        );
        
        if (updatePasswordError) {
          console.error('Error updating user password:', updatePasswordError);
        } else {
          console.log('Password updated for existing user:', driver.email);
        }
        
        // Mark user as needing password reset
        await supabase
          .from('user_profiles')
          .update({ needs_password_reset: true })
          .eq('user_id', userId);
      } else {
        // Create new auth account
        const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
          email: driver.email,
          password: presetPassword,
          email_confirm: true,
          user_metadata: {
            first_name: driver.first_name,
            last_name: driver.last_name,
            user_type: 'driver'
          }
        });
        
        if (signUpError) {
          console.error('Error creating auth account:', signUpError);
        } else if (newUser.user) {
          console.log('Auth account created for:', driver.email);
          userId = newUser.user.id;
          
          // Ensure user profile exists and mark for password reset
          await supabase
            .from('user_profiles')
            .upsert({
              user_id: newUser.user.id,
              email: driver.email,
              role: 'driver',
              needs_password_reset: true
            }, { onConflict: 'user_id' });
        }
      }
    } catch (passwordError) {
      console.error('Error managing user password:', passwordError);
      // Continue anyway, we'll still send the email
    }
    
    const { error } = await supabase.functions.invoke('send-driver-waitlist-email', {
      body: {
        driverName: `${driver.first_name} ${driver.last_name}`,
        driverEmail: driver.email,
        messageType: 'activation',
        emailType: 'activation',
        presetPassword: presetPassword,
        activationLink: `${Deno.env.get('SITE_URL')}/driver/activate`
      }
    });

    if (error) throw error;
    console.log(`Sent activation email to ${driver.email}`);
  } catch (error) {
    console.error(`Failed to send activation email to ${driver.email}:`, error);
  }
}

