import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendWaitlistEmail(email: string) {
  try {
    console.log(`Looking up application for ${email}...`);
    
    // Query for the application - try both feeder_applications and craver_applications
    let application = null;
    
    // Try feeder_applications first
    const { data: feederApp, error: feederError } = await supabase
      .from('feeder_applications')
      .select('*, regions(name)')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!feederError && feederApp) {
      application = feederApp;
      console.log('Found in feeder_applications');
    } else {
      // Try craver_applications
      const { data: craverApp, error: craverError } = await supabase
        .from('craver_applications')
        .select('*, regions(name)')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!craverError && craverApp) {
        application = craverApp;
        console.log('Found in craver_applications');
      }
    }
    
    if (!application) {
      console.error(`No application found for ${email}`);
      return;
    }
    
    console.log('Application found:', {
      id: application.id,
      email: application.email,
      city: application.city,
      state: application.state,
      waitlist_position: application.waitlist_position,
      status: application.status
    });
    
    // Get waitlist position if not set
    let waitlistPosition = application.waitlist_position;
    if (!waitlistPosition && application.status === 'waitlist') {
      // Try to get position from RPC function
      try {
        const { data: positionData, error: positionError } = await supabase.rpc('get_driver_queue_position', {
          driver_uuid: application.id
        });
        if (!positionError && positionData && positionData[0]) {
          waitlistPosition = positionData[0].queue_position;
        }
      } catch (e) {
        console.warn('Could not fetch waitlist position from RPC:', e);
      }
    }
    
    // Build driver name
    const firstName = application.legal_first_name || application.first_name || '';
    const middleName = application.legal_middle_name || application.middle_name || '';
    const lastName = application.legal_last_name || application.last_name || '';
    const driverName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim();
    
    // Get region name
    const regionName = application.regions?.name || `${application.city || ''}, ${application.state || ''}`.trim();
    
    // Prepare email payload
    const emailPayload = {
      driverName: driverName || 'Driver',
      driverEmail: application.email,
      city: application.city || '',
      state: application.state || '',
      waitlistPosition: waitlistPosition || 0,
      location: regionName,
      emailType: 'waitlist' as const
    };
    
    console.log('Sending waitlist email with payload:', emailPayload);
    
    // Call the edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-driver-waitlist-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(emailPayload),
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', responseText);
    
    if (!response.ok) {
      console.error('Failed to send email:', responseText);
      return;
    }
    
    const result = JSON.parse(responseText);
    console.log('Email sent successfully!', result);
    
  } catch (error: any) {
    console.error('Error sending waitlist email:', error);
  }
}

// Get email from command line argument
const email = process.argv[2] || 'hr@cravenusa.com';

console.log(`Sending waitlist email to ${email}...`);
sendWaitlistEmail(email).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

