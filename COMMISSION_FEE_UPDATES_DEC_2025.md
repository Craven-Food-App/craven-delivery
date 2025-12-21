# Commission & Fee Structure Updates - December 2025

**Date:** December 21, 2025  
**Status:** ✅ Completed  
**Updated By:** Invero AI Assistant

---

## 📋 Summary of Changes

All commission and fee settings have been confirmed and implemented across the platform:

### **Confirmed Settings**

| Setting | Value | Previous | Status |
|---------|-------|----------|--------|
| **Service Fee** | 10% | 10% | ✅ No change (confirmed) |
| **Base Delivery Fee** | $2.99 | $2.99 | ✅ No change (confirmed) |
| **Per-Mile Fee** | $0.50/mile | $0.50/mile | ✅ No change (confirmed) |
| **Peak Multipliers** | 1.3x - 1.6x | 1.0x - 3.0x | ✅ Updated range |
| **Driver Payout** | 70% | 70% | ✅ No change (confirmed) |
| **Stripe Fee** | 2.9% + $0.30 | Not tracked | ✅ Added tracking |

---

## 🔧 Technical Changes Made

### 1. **Database Schema Updates**

**New Migration:** `supabase/migrations/20251221000001_add_stripe_fee_tracking.sql`

Added Stripe fee tracking to the `commission_settings` table:
- `stripe_fee_percent` (NUMERIC, default 2.9)
- `stripe_fee_fixed_cents` (INTEGER, default 30)

### 2. **Admin UI Updates**

**Updated Files:**
- `src/components/admin/commission/components/GlobalSettings.tsx`
- `src/components/admin/CommissionSettingsManager.tsx`

**Changes:**
- Added Stripe fee configuration fields
- Updated peak multiplier range to 1.3x - 1.6x
- Enhanced revenue preview to show gross vs net revenue
- Added Stripe fee deduction in calculations
- Improved UI with separate sections for payment processing fees

### 3. **Documentation Updates**

**Updated Files:**
- `CFO_FINANCIAL_SYSTEM_REPORT_DEC_2025.md`

**Changes:**
- Added confirmed fee structure table in Executive Summary
- Updated all fee references with confirmed values
- Added Stripe fee tracking documentation
- Updated unit economics with net revenue calculations
- Added checkmarks (✅) to confirmed settings

---

## 💰 Revenue Impact

### **Example Order Calculation**

**Order Details:**
- Subtotal: $25.00
- Distance: 3 miles
- Restaurant Tier: Silver (15% commission)

**Customer Pays:**
- Subtotal: $25.00
- Service Fee (10%): $2.50
- Delivery Fee: $4.49
- **Total: $32.99**

**Revenue Split:**
- Restaurant Gets: $21.25 (after 15% commission)
- Platform Gross Revenue: $10.74
  - Commission: $3.75
  - Service Fee: $2.50
  - Delivery Fee: $4.49
- Stripe Processing Fee: -$1.27 (2.9% + $0.30)
- **Platform Net Revenue: $9.47**

**Driver Earnings:**
- Base Pay (70% of delivery): $3.14
- Customer Tip: $5.00
- **Total Driver Earnings: $8.14**

**Platform Profit:**
- Net Revenue: $9.47
- Driver Payout: -$3.14 (base pay only, tip goes 100% to driver)
- **Gross Profit: $6.33 per order**

---

## 🎯 Key Features

### **Stripe Fee Tracking**

The system now tracks Stripe processing fees for accurate financial reporting:

1. **Configurable Rates:** Admin can adjust Stripe fee percentage and fixed fee
2. **Real-Time Calculations:** Revenue preview shows gross and net revenue
3. **Financial Reporting:** Net revenue calculations account for Stripe fees
4. **Audit Trail:** All fee changes tracked in commission_settings_history

### **Peak Hour Multiplier Range**

Updated to industry-standard range:
- **Minimum:** 1.3x (lunch rush)
- **Maximum:** 1.6x (late night)
- **Default:** 1.5x (dinner rush)

This provides more predictable pricing for customers while maintaining revenue optimization.

---

## 📊 Admin Portal Features

### **Global Settings Page**

Admins can now configure:
1. Restaurant Commission (5% - 25%)
2. Customer Service Fee (5% - 20%)
3. Base Delivery Fee ($0 - $10)
4. Per-Mile Fee ($0 - $2)
5. Peak Hour Multiplier (1.3x - 1.6x)
6. **NEW:** Stripe Fee Percentage (0% - 10%)
7. **NEW:** Stripe Fixed Fee ($0 - $1)

### **Revenue Preview**

Enhanced preview shows:
- Customer payment breakdown
- Restaurant payout
- Platform gross revenue (before Stripe)
- Stripe processing fee
- **Platform net revenue (after Stripe)**
- Gross and net take rates

---

## 🚀 Next Steps

### **Immediate Actions Required**

1. **Run Database Migration**
   ```bash
   # Migration will be applied automatically on next deployment
   # Or run manually via Supabase Dashboard
   ```

2. **Verify Settings in Admin Portal**
   - Navigate to Admin Portal → Commission Settings
   - Confirm all values match the confirmed structure
   - Save settings to create initial record with Stripe fees

3. **Test Revenue Calculations**
   - Place a test order
   - Verify all fees calculate correctly
   - Check that Stripe fees are tracked

### **Optional Enhancements**

1. **Financial Reports**
   - Add Stripe fee column to revenue reports
   - Show gross vs net revenue in dashboards
   - Add net margin calculations

2. **Analytics**
   - Track Stripe fees over time
   - Compare gross vs net take rates
   - Identify optimization opportunities

3. **Forecasting**
   - Update financial projections with net revenue
   - Adjust break-even calculations
   - Update investor reports

---

## 📝 Migration Instructions

### **For Development Environment**

The migration will run automatically on next deployment. No action needed.

### **For Production Environment**

1. The migration is safe and non-breaking
2. Adds new columns with default values
3. Updates existing active settings
4. No data loss or downtime

### **Rollback Plan**

If needed, rollback with:
```sql
ALTER TABLE public.commission_settings 
DROP COLUMN IF EXISTS stripe_fee_percent,
DROP COLUMN IF EXISTS stripe_fee_fixed_cents;
```

---

## ✅ Verification Checklist

- [x] Database migration created
- [x] Admin UI updated with Stripe fee fields
- [x] Peak multiplier range updated (1.3x - 1.6x)
- [x] Revenue calculations include Stripe fees
- [x] Documentation updated
- [x] CFO report updated with confirmed values
- [ ] Database migration applied to production
- [ ] Admin settings verified in production
- [ ] Test order placed and verified

---

## 📞 Support

For questions or issues:
1. Check the CFO Financial System Report
2. Review the Commission System documentation
3. Contact the development team

---

**Report Prepared By:** Invero AI Assistant  
**Date:** December 21, 2025  
**Version:** 1.0  
**Status:** Implementation Complete

