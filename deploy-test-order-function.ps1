# Deploy create-test-order Edge Function
# This deploys the updated function that includes mileage pay and randomization

Write-Host "Deploying create-test-order Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is available
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Or deploy manually via Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions" -ForegroundColor White
    Write-Host "  2. Find 'create-test-order' function" -ForegroundColor White
    Write-Host "  3. Click 'Deploy New Version'" -ForegroundColor White
    Write-Host "  4. Copy contents from: supabase/functions/create-test-order/index.ts" -ForegroundColor White
    Write-Host "  5. Paste and deploy" -ForegroundColor White
    exit 1
}

Write-Host "Deploying create-test-order..." -ForegroundColor Yellow
supabase functions deploy create-test-order

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Edge Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes included:" -ForegroundColor Cyan
    Write-Host "  ✓ Randomized distance: 1-3 miles ($0.67-$2.00 mileage pay)" -ForegroundColor White
    Write-Host "  ✓ Randomized tips: 10-25% of subtotal" -ForegroundColor White
    Write-Host "  ✓ Base pay: $5.00 for all test orders" -ForegroundColor White
    Write-Host "  ✓ Creates driver_earnings immediately" -ForegroundColor White
    Write-Host "  ✓ Marks orders as 'delivered' to trigger mileage accumulation" -ForegroundColor White
    Write-Host ""
    Write-Host "Now test it:" -ForegroundColor Cyan
    Write-Host "  1. Send a test order from the portal" -ForegroundColor White
    Write-Host "  2. Check Earnings page -> Distance Pay should show $0.67-$2.00" -ForegroundColor White
    Write-Host "  3. Check Gas Money -> should show accumulated mileage" -ForegroundColor White
    Write-Host "  4. Send multiple orders -> amounts should vary each time" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try deploying manually via Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions" -ForegroundColor White
}

