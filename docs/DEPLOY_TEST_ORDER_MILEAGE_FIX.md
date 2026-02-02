# Deploy Test Order Mileage Pay Fix

## Problem
Test orders are not showing mileage pay or distance pay in earnings. Gas Money remains at $0.00.

## Root Cause
The updated `create-test-order` Edge Function code is in git but **hasn't been deployed to Supabase**. Edge Functions require explicit deployment.

## Solution: Deploy the Updated Function

### Option 1: PowerShell Script (Windows)
```powershell
.\deploy-test-order-function.ps1
```

### Option 2: Bash Script (Mac/Linux)
```bash
chmod +x deploy-test-order-function.sh
./deploy-test-order-function.sh
```

### Option 3: Manual CLI Deployment
```bash
supabase functions deploy create-test-order
```

### Option 4: Manual Dashboard Deployment

1. Go to: https://supabase.com/dashboard/project/xaxbucnjlrfkccsfiddq/functions
2. Find **create-test-order** in the functions list
3. Click **"Deploy New Version"** or **"Edit"**
4. Copy the entire contents of: `supabase/functions/create-test-order/index.ts`
5. Paste into the function editor
6. Click **Deploy**

## What This Deployment Includes

### Randomization (Every Order is Unique)
- **Distance**: 1-3 miles → Mileage Pay: $0.67-$2.00
- **Tips**: 10-25% of subtotal (varies each time)
- **Order Items**: 2-4 random menu items with varying quantities

### Immediate Driver Compensation
- **Base Pay**: $5.00 (fixed for all test orders)
- **Mileage Pay**: $0.67-$2.00 (varies by random distance)
- **Total Driver Pay**: $5.00 + mileage + tip
- **Creates**: `driver_earnings` record immediately

### Automatic Mileage Accumulation
- Order created with `order_status = "delivered"`
- Database trigger `trigger_accumulate_mileage_pay_on_insert` fires automatically
- Adds mileage to `driver_gas_money.balance`
- Logs transaction in `gas_money_transactions`

## Expected Results After Deployment

### Earnings Page
- **Your Earnings**: Updates with new test orders
- **Base Pay**: $5.00 per test order
- **Distance Pay**: $0.67-$2.00 (varies each order)
- **Tips**: 10-25% of subtotal
- **Total Earned**: Accumulates correctly

### Gas Money Card
- **Balance**: Shows accumulated mileage from all test orders
- **Increases**: With each new test order
- **Transferable**: To Feeder card at any time

### Earnings per Mile
- **Calculation**: Total earnings / total miles driven
- **Updates**: After each delivery

## Verification Steps

1. **Deploy** the function using one of the options above
2. **Send** a test order from the portal
3. **Check** Earnings page:
   - Distance Pay should show $0.67-$2.00
   - Gas Money should match Distance Pay
   - Your Earnings should increase
4. **Send** multiple test orders:
   - Amounts should vary each time
   - Gas Money should accumulate
   - Each order should have different tips and mileage

## Troubleshooting

### If deployment fails:
- Check you're logged in: `supabase login`
- Check project is linked: `supabase link --project-ref xaxbucnjlrfkccsfiddq`
- Use manual dashboard deployment instead

### If mileage still doesn't show:
1. Check browser console for errors
2. Verify database triggers are applied (run `docs/apply-gas-money-migrations.sql`)
3. Check Supabase logs in dashboard for function errors
4. Verify the function shows the updated timestamp in Supabase dashboard

## Database Triggers (Already Applied)

These triggers are already in your database (from previous migrations):
- `trigger_accumulate_mileage_pay` - Handles UPDATE to "delivered"
- `trigger_accumulate_mileage_pay_on_insert` - Handles INSERT with "delivered"

You don't need to re-apply these. Just deploy the Edge Function.

## Support

If issues persist after deployment:
1. Check function logs in Supabase Dashboard → Edge Functions → create-test-order → Logs
2. Check browser console for errors when viewing Earnings page
3. Verify function deployment timestamp matches current time

