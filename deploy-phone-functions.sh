#!/bin/bash
# Deploy Phone Verification Edge Functions
# Run this script after authenticating with: supabase login

echo "Deploying phone verification edge functions..."

# Deploy send-phone-verification
echo ""
echo "Deploying send-phone-verification..."
supabase functions deploy send-phone-verification

if [ $? -eq 0 ]; then
    echo "✓ send-phone-verification deployed successfully"
else
    echo "✗ Failed to deploy send-phone-verification"
    exit 1
fi

# Deploy verify-phone-code
echo ""
echo "Deploying verify-phone-code..."
supabase functions deploy verify-phone-code

if [ $? -eq 0 ]; then
    echo "✓ verify-phone-code deployed successfully"
else
    echo "✗ Failed to deploy verify-phone-code"
    exit 1
fi

echo ""
echo "✓ All phone verification functions deployed successfully!"

