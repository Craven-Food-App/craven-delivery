#!/bin/bash

# Deploy Edge Functions for invite/checkout flow
# Run this script after logging in: supabase login

echo "Deploying verify-invite-access..."
supabase functions deploy verify-invite-access --no-verify-jwt

echo "Deploying create-invite-checkout..."
supabase functions deploy create-invite-checkout --no-verify-jwt

echo ""
echo "✅ Edge Functions deployed!"
echo ""
echo "⚠️  Make sure these secrets are set in Supabase:"
echo "   STRIPE_SECRET_KEY"
echo "   FRONTEND_URL"
echo ""
echo "Set them with:"
echo "   supabase secrets set STRIPE_SECRET_KEY=your_key"
echo "   supabase secrets set FRONTEND_URL=https://your-domain.com"

