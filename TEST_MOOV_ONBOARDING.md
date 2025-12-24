# Test Moov Onboarding Integration

The Moov edge functions have been successfully deployed. Here's how to test:

## Testing Steps

1. **Navigate to Merchant Portal**
   - Go to: https://cravenusa.com/merchant-portal
   - Log in as a merchant with a restaurant account

2. **Go to Settings → Bank Account**
   - Click Settings tab
   - Select "Bank Account" subtab
   - Scroll to "Moov Account Setup" card

3. **Test Onboarding Invite Creation**
   - Click "Start Moov Onboarding" button
   - Should redirect to Moov's hosted onboarding form
   - No CORS errors should appear in console

4. **Verify Status Tracking**
   - After clicking the button, check the browser console
   - Should see successful response with onboarding link
   - Status should update to "pending" in database

5. **Test Return Flow** (Optional)
   - Complete or cancel the Moov onboarding
   - Should return to merchant portal
   - Status should auto-update after a few seconds

## Expected Behavior

✅ **Success Indicators:**
- No CORS errors in browser console
- Successful redirect to Moov onboarding form
- Status badge shows "Pending" after invite creation
- Database records `moov_onboarding_invite_code` and `moov_onboarding_status`

❌ **If Issues Occur:**
- Check browser console for errors
- Verify Moov API secrets are set in Supabase
- Check edge function logs in Supabase dashboard
- Verify fee plan code is correct

## Verification Checklist

- [ ] Functions deployed successfully
- [ ] No CORS errors when calling function
- [ ] Onboarding link created successfully
- [ ] Redirect to Moov works
- [ ] Status tracking works
- [ ] Database updates correctly

## Next Steps

Once confirmed working:
- Update fee plan code in `MoovOnboardingCard.tsx` if needed
- Test full onboarding flow end-to-end
- Monitor edge function logs for any issues

