// Simple script to send waitlist email
// Run with: node scripts/send-waitlist-email.js hr@cravenusa.com

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xaxbucnjlrfkccsfiddq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const email = process.argv[2] || 'hr@cravenusa.com';

async function sendWaitlistEmail() {
  try {
    // First, query the database to get user info
    const queryResponse = await fetch(`${SUPABASE_URL}/rest/v1/feeder_applications?email=eq.${email}&select=*,regions(name)&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!queryResponse.ok) {
      // Try craver_applications
      const queryResponse2 = await fetch(`${SUPABASE_URL}/rest/v1/craver_applications?email=eq.${email}&select=*,regions(name)&order=created_at.desc&limit=1`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (!queryResponse2.ok) {
        console.error('Failed to query applications:', await queryResponse2.text());
        return;
      }

      const applications = await queryResponse2.json();
      if (!applications || applications.length === 0) {
        console.error(`No application found for ${email}`);
        return;
      }

      const app = applications[0];
      await sendEmailForApplication(app);
    } else {
      const applications = await queryResponse.json();
      if (!applications || applications.length === 0) {
        console.error(`No application found for ${email}`);
        return;
      }

      const app = applications[0];
      await sendEmailForApplication(app);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function sendEmailForApplication(app) {
  const firstName = app.legal_first_name || app.first_name || '';
  const middleName = app.legal_middle_name || app.middle_name || '';
  const lastName = app.legal_last_name || app.last_name || '';
  const driverName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim() || 'Driver';
  
  const regionName = app.regions?.name || `${app.city || ''}, ${app.state || ''}`.trim();
  const waitlistPosition = app.waitlist_position || 0;

  const emailPayload = {
    driverName,
    driverEmail: app.email,
    city: app.city || '',
    state: app.state || '',
    waitlistPosition,
    location: regionName,
    emailType: 'waitlist'
  };

  console.log('Sending email with payload:', emailPayload);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-driver-waitlist-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(emailPayload),
  });

  const responseText = await response.text();
  console.log('Response status:', response.status);
  console.log('Response:', responseText);

  if (response.ok) {
    console.log('✅ Email sent successfully!');
  } else {
    console.error('❌ Failed to send email');
  }
}

sendWaitlistEmail();

