# Twilio SMS Setup for Phone Verification

The `send-phone-verification` function now sends real SMS messages via Twilio.

## Setup Instructions

### 1. Get Twilio Credentials

1. Sign up for a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console Dashboard
3. Get a Twilio phone number (or use a trial number for testing)

### 2. Add Environment Variables to Supabase

In your Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these three secrets:

```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** 
- The phone number must include the country code (e.g., `+1234567890`)
- For trial accounts, you can only send SMS to verified phone numbers
- For production, upgrade your Twilio account

### 3. Deploy the Updated Function

Deploy the updated `send-phone-verification` function:

```bash
supabase functions deploy send-phone-verification
```

Or via Supabase Dashboard:
1. Go to **Edge Functions**
2. Find `send-phone-verification`
3. Update the code with the new version
4. Click **Deploy**

## How It Works

1. User enters phone number and email on feeder signup
2. Function generates a 5-digit code
3. Code is saved to `phone_verifications` table
4. SMS is sent via Twilio with the code
5. User enters code in the verification modal
6. `verify-phone-code` function validates the code

## Testing

- **With Twilio configured:** SMS will be sent to the phone number
- **Without Twilio:** Code will be logged and returned in the response (for development)

## Troubleshooting

- **SMS not sending:** Check Twilio credentials in Supabase secrets
- **"Unable to connect" error:** Verify the function is deployed and Twilio credentials are correct
- **Trial account:** You can only send to verified phone numbers. Upgrade for production use.



