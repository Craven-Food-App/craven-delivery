#!/bin/bash

# Deploy create-test-order Edge Function
# This deploys the updated function that includes mileage pay and randomization

echo ""
echo "Deploying create-test-order Edge Function..."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or deploy manually via Supabase Dashboard:"
    echo "  1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions"
    echo "  2. Find 'create-test-order' function"
    echo "  3. Click 'Deploy New Version'"
    echo "  4. Copy contents from: supabase/functions/create-test-order/index.ts"
    echo "  5. Paste and deploy"
    exit 1
fi

echo "Deploying create-test-order..."
supabase functions deploy create-test-order

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "Changes included:"
    echo "  ✓ Randomized distance: 1-3 miles (\$0.67-\$2.00 mileage pay)"
    echo "  ✓ Randomized tips: 10-25% of subtotal"
    echo "  ✓ Base pay: \$5.00 for all test orders"
    echo "  ✓ Creates driver_earnings immediately"
    echo "  ✓ Marks orders as 'delivered' to trigger mileage accumulation"
    echo ""
    echo "Now test it:"
    echo "  1. Send a test order from the portal"
    echo "  2. Check Earnings page -> Distance Pay should show \$0.67-\$2.00"
    echo "  3. Check Gas Money -> should show accumulated mileage"
    echo "  4. Send multiple orders -> amounts should vary each time"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Try deploying manually via Supabase Dashboard:"
    echo "  https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions"
fi

