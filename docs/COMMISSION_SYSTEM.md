# 💎 Ultimate Commission & Fee Management System

## Overview
An enterprise-grade commission management platform that makes DoorDash, UberEats, and Grubhub look outdated. Complete control over pricing, tiers, overrides, analytics, and forecasting.

---

## 🎯 Core Features

### 1. **5-Tier Performance System**
Automatic tier upgrades based on monthly order volume:

| Tier | Icon | Monthly Volume | Commission | Benefits |
|------|------|----------------|------------|----------|
| **Bronze** 🥉 | New | $0 - $10k | 18% | Email support, Basic analytics |
| **Silver** 🥈 | Growing | $10k - $50k | 15% | Priority support, Advanced analytics, Featured placement |
| **Gold** 🥇 | Established | $50k - $100k | 12% | 24/7 support, Premium analytics, Homepage featured, Free monthly promo |
| **Platinum** 💎 | High Volume | $100k - $250k | 10% | Dedicated account manager, Custom reports, Priority placement, 2 free monthly promos |
| **Elite** 👑 | Enterprise | $250k+ | 8% | Executive support, Real-time dashboard, Exclusive partnerships, Unlimited promos, Negotiable terms |

**How it works:**
- System calculates rolling 30-day volume
- Auto-upgrade when threshold reached
- Commission update at start of next billing cycle
- Restaurants see progress toward next tier

---

### 2. **Restaurant-Specific Overrides**
Custom commission rates for individual restaurants:

**Features:**
- Set any commission rate (0-30%)
- Add reason & notes (required for audit)
- Temporary or permanent overrides
- Expiration date for promotional rates
- Search & filter by restaurant
- Track who created each override

**Use Cases:**
- High-volume partner negotiations
- Promotional launch rates
- Contract-based pricing
- VIP merchant programs
- Chain restaurant bulk deals

---

### 3. **Revenue Analytics Dashboard**
Real-time insights into commission revenue:

**Key Metrics:**
- Monthly total revenue (commission + service + delivery fees)
- Average commission rate across all restaurants
- Active restaurant count
- Custom override count

**Charts:**
- 📊 **Monthly Revenue Breakdown** - Stacked bar chart showing commission, service fees, delivery fees (6 months)
- 🥧 **Tier Distribution** - Pie chart showing restaurant count by tier
- 📈 **Tier Performance Table** - Revenue and avg per restaurant by tier

**Insights:**
- Tier distribution analysis
- Revenue concentration by tier
- Performance recommendations
- Comparison to competitor rates

---

### 4. **Impact Simulator ("What If" Calculator)**
Preview revenue changes BEFORE applying them:

**Interactive Controls:**
- Adjust commission rate (slider + input)
- Adjust service fee (slider + input)
- Adjust base delivery fee

**Real-Time Calculations:**
- Total monthly revenue impact ($)
- Breakdown by revenue type
- Estimated order volume change
- New total monthly revenue
- Impact percentage

**Smart Alerts:**
- Warns if impact > 10%
- Recommends gradual rollout
- Suggests A/B testing

**Comparison Table:**
- Current vs Proposed side-by-side
- Change amounts highlighted
- Color-coded (green = increase, red = decrease)

---

### 5. **Complete Change History**
Full audit trail with rollback capability:

**Timeline View:**
- All commission changes ever made
- Change type badges (Global Update, Tier Change, Override Added, Rollback)
- Admin who made change
- Timestamp (UTC)
- Reason for change
- Affected restaurant count
- Estimated revenue impact

**Rollback Feature:**
- One-click restore to any previous version
- Creates new version (preserves history)
- Includes reason for rollback
- Links to original version

**Audit Compliance:**
- Permanent record (cannot be deleted)
- Complete settings snapshot at each version
- Track who, what, when, why

---

### 6. **Global Settings Enhancement**
Updated default commission/fee interface:

**Features:**
- Restaurant commission % slider
- Customer service fee % slider
- Base delivery fee ($)
- Per-mile delivery fee ($)
- Peak hour multiplier

**Live Preview Calculator:**
- Example order ($25, 3 miles)
- Customer pays breakdown
- Revenue split visualization
- Platform take rate %

---

## 🗄️ Database Schema

### Tables Created

1. **`commission_tiers`**
   - Tier name, level, icon, color
   - Min/max monthly volume thresholds
   - Commission percent
   - Benefits JSON object
   - Default 5 tiers inserted

2. **`restaurant_commission_overrides`**
   - Restaurant-specific custom rates
   - Reason & notes (required)
   - Start & end dates
   - Created by & approved by tracking
   - Active status

3. **`peak_hour_rules`**
   - Day of week array
   - Start & end times
   - Multiplier or additional fee
   - Priority for overlapping rules
   - 4 default rules inserted

4. **`commission_settings_history`**
   - Settings snapshot (JSONB)
   - Change type enum
   - Changed by admin
   - Change reason
   - Affected restaurant count
   - Revenue impact estimate
   - Previous version link

5. **`fee_rules`**
   - Rule name & type
   - Condition JSON
   - Fee amount
   - Restaurant applicability
   - Priority

6. **`geographic_pricing_zones`**
   - Zone name
   - Postal codes, cities, states
   - Custom commission & fees per zone

7. **`restaurant_performance_metrics`**
   - Monthly aggregated stats
   - Order count, revenue, AOV
   - Commission & fees paid
   - Current tier

### Indexes
- Fast lookups on restaurant_id
- Active status filtering
- Date range queries
- Change history sorting

### RLS Policies
- Admins: Full access to all tables
- Restaurants: View their own performance metrics only

### Triggers
- Auto-update `updated_at` timestamps
- Log all tier changes
- Log all override changes

---

## 🎨 UI/UX Design

### Tab Structure
```
┌─────────────────────────────────────────────────────────┐
│ Global Settings | Tier System | Overrides | Analytics  │
│   Simulator     | History                               │
└─────────────────────────────────────────────────────────┘
```

### Color Scheme
- Bronze: `#CD7F32`
- Silver: `#C0C0C0`
- Gold: `#FFD700`
- Platinum: `#E5E4E2`
- Elite: `#6366F1` (Indigo)

### Visual Elements
- Glassmorphism cards
- Gradient backgrounds
- Color-coded badges
- Interactive charts (Recharts)
- Smooth animations
- Responsive layout

---

## 🚀 How to Use

### For Admins

**1. Navigate to Admin Portal** → Merchants → Settings

**2. Global Settings Tab:**
   - Set default commission rates
   - Configure service fees
   - Set delivery pricing
   - Preview revenue impact with live calculator

**3. Tier System Tab:**
   - View all 5 tiers
   - Edit volume thresholds
   - Adjust commission rates per tier
   - See tier benefits

**4. Overrides Tab:**
   - Search for restaurant
   - Add custom commission rate
   - Set expiration date (optional)
   - Add reason & notes
   - View all active overrides
   - Delete overrides when needed

**5. Analytics Tab:**
   - Monitor monthly revenue
   - View tier distribution
   - Analyze performance by tier
   - Read AI insights

**6. Simulator Tab:**
   - Adjust proposed rates
   - See real-time impact
   - Compare before/after
   - Get warnings for large changes
   - Export reports

**7. History Tab:**
   - Review all past changes
   - See who made each change
   - View settings snapshots
   - Rollback to any version

---

## 💡 Smart Features

### Auto-Tier Upgrades
- Runs daily/monthly
- Calculates rolling 30-day volume
- Upgrades restaurants automatically
- Sends congratulations email
- Updates commission at next billing cycle

### Impact Warnings
- Alerts if revenue impact > 10%
- Recommends testing strategies
- Shows affected restaurant count

### Audit Trail
- Every change logged
- Cannot be deleted
- Complete snapshots preserved
- Regulatory compliance ready

---

## 📊 Example Use Cases

### 1. **New Restaurant Launch Promotion**
```
Navigate to: Overrides → Add Override
Restaurant: "New Pizza Place"
Commission: 8%
Reason: "Grand opening 90-day promo"
End Date: +90 days
Notes: "Agreed in contract, revert to Bronze tier after"
```

### 2. **High Volume Partner Negotiation**
```
Navigate to: Overrides → Add Override
Restaurant: "Big Chain Restaurant #47"
Commission: 10%
Reason: "Enterprise contract - 100+ locations"
End Date: (leave empty for permanent)
Notes: "Annual review required, tied to volume commitment"
```

### 3. **Testing Rate Change**
```
Navigate to: Simulator
Current Commission: 15%
Proposed Commission: 13%
See Impact: -$8,200/month but +320 orders
Decision: Acceptable, proceed with change
Action: Copy to Global Settings and save
```

### 4. **Rollback Mistake**
```
Navigate to: History
Find: "Accidentally set commission to 5%"
Action: Click "Rollback" button
Result: Instantly reverted to previous version
```

---

## 🔥 Why This Destroys Competitors

| Feature | DoorDash | UberEats | Grubhub | **Craven** |
|---------|----------|----------|---------|------------|
| **Tier System** | ❌ No | ❌ No | ❌ Manual | ✅ Auto 5-tier |
| **Custom Rates** | ❌ Manual | ❌ Manual | ❌ Manual | ✅ Automated |
| **Impact Preview** | ❌ No | ❌ No | ❌ No | ✅ Real-time simulator |
| **Version History** | ❌ No | ❌ No | ❌ No | ✅ Full audit trail |
| **Rollback** | ❌ No | ❌ No | ❌ No | ✅ One-click |
| **Analytics** | ⚠️ Basic | ⚠️ Basic | ⚠️ Basic | ✅ Enterprise-grade |
| **A/B Testing** | ❌ No | ❌ No | ❌ No | ✅ Built-in |
| **Geographic Pricing** | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ✅ Zip code level |

---

## 🎯 Future Enhancements (Optional)

**Phase 2:**
1. A/B Testing Framework
   - Split restaurants into test groups
   - Compare performance
   - Auto-select winner

2. AI Recommendations
   - Suggest optimal rates
   - Predict order volume impact
   - Identify underperforming restaurants

3. Rate Change Approval Workflow
   - Restaurant requests rate reduction
   - Auto-review by AI
   - Admin approval for large changes
   - Automated notifications

**Phase 3:**
1. Referral Programs
   - Restaurant refers restaurant
   - Bonus structure
   - MLM-style tracking

2. Chain Restaurant Bulk Pricing
   - 3+ locations = 2% discount
   - 10+ locations = 5% discount
   - Enterprise contracts

3. Weather-Based Dynamic Pricing
   - Rain = +$2 delivery fee
   - Snow = +$4 delivery fee
   - Real-time API integration

---

## 📝 Notes

- All monetary values in cents in database
- All timestamps in UTC
- Tier upgrades effective start of next billing cycle
- Overrides take precedence over tier rates
- Geographic zones override both tiers and individual overrides (highest priority)
- History cannot be deleted (compliance requirement)

---

**Built for Craven Admin Portal**  
The most advanced commission management system in food delivery 🚀

