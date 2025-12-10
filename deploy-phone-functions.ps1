# Deploy Phone Verification Edge Functions
# Run this script after authenticating with: supabase login

Write-Host "Deploying phone verification edge functions..." -ForegroundColor Cyan

# Deploy send-phone-verification
Write-Host "`nDeploying send-phone-verification..." -ForegroundColor Yellow
supabase functions deploy send-phone-verification

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ send-phone-verification deployed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to deploy send-phone-verification" -ForegroundColor Red
    exit 1
}

# Deploy verify-phone-code
Write-Host "`nDeploying verify-phone-code..." -ForegroundColor Yellow
supabase functions deploy verify-phone-code

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ verify-phone-code deployed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to deploy verify-phone-code" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ All phone verification functions deployed successfully!" -ForegroundColor Green

