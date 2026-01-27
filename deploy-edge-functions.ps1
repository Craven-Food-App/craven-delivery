# Deploy Edge Functions for invite/checkout flow
# Run this script after logging in: supabase login

Write-Host "Deploying verify-invite-access..." -ForegroundColor Cyan
supabase functions deploy verify-invite-access --no-verify-jwt

Write-Host "Deploying create-invite-checkout..." -ForegroundColor Cyan
supabase functions deploy create-invite-checkout --no-verify-jwt

Write-Host ""
Write-Host "✅ Edge Functions deployed!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Make sure these secrets are set in Supabase:" -ForegroundColor Yellow
Write-Host "   STRIPE_SECRET_KEY"
Write-Host "   FRONTEND_URL"
Write-Host ""
Write-Host "Set them with:"
Write-Host "   supabase secrets set STRIPE_SECRET_KEY=your_key"
Write-Host "   supabase secrets set FRONTEND_URL=https://your-domain.com"

