# Investor Demo Portal - Quick Start Guide

## For Executives: Sending an Invite (2 minutes)

### Step 1: Access Management Portal
1. Login to Hub at `https://hq.cravenusa.com/hub`
2. Find **"Investor Demo Portal"** card (purple, eye icon)
3. Click to open management interface

### Step 2: Send Invite
1. Click **"Send Invite"** button (top right)
2. Fill in investor details:
   - **Email:** investor@example.com *(required)*
   - **Full Name:** John Smith
   - **Organization:** Acme Ventures
   - **Notes:** Series A lead, interested in logistics
3. Click **"Send Invite"**
4. ✅ Done! Investor receives email with magic link

### Step 3: Monitor Engagement
- Dashboard shows real-time access stats
- View counts per platform type (Customer/Merchant/Driver)
- Last accessed timestamp
- Copy magic link if needed (clipboard icon)

---

## For Investors: Accessing the Demo

### You'll Receive:
📧 **Email Subject:** "🚀 Your Exclusive Access to the Crave'N Platform Demo"

### Access Process:
1. Click **"Access Demo Portal"** button in email
2. Automatically validated (no login needed)
3. Choose platform view:
   - 🛍️ **Customer** - Browse restaurants, place orders, track delivery
   - 🏪 **Merchant** - Manage orders, view analytics, track revenue
   - 📱 **Driver** - Accept deliveries, navigate, track earnings
4. Interact with fully functional demos (all data is mock)
5. Return to portal to try other views

### Your Access:
- ⏰ **Valid for:** 90 days
- 🔄 **Can access:** Unlimited times
- 📊 **All data:** Demo/mock data only

---

## What Each Demo Shows

### 🛍️ Customer Demo
**Experience:** End-user ordering flow

**Features Demonstrated:**
- Restaurant discovery with filters
- Menu browsing with cart management
- Order placement and checkout
- Real-time order tracking
- Driver information and contact
- Delivery status updates

**Mock Data:** 6 restaurants, 10+ menu items, live order tracking

---

### 🏪 Merchant Demo
**Experience:** Restaurant dashboard

**Features Demonstrated:**
- Real-time order queue management
- Order status workflow (confirmed → preparing → ready → delivered)
- Revenue analytics and trends
- Top selling items tracking
- Daily/weekly performance metrics
- Average order value calculations

**Mock Data:** Active orders, weekly revenue $12.3K, 287 orders/week

---

### 📱 Driver Demo
**Experience:** Mobile delivery interface

**Features Demonstrated:**
- Available delivery queue
- Order acceptance workflow
- Pickup and dropoff navigation
- Customer contact capabilities
- Real-time earnings tracking
- Performance metrics (rating, deliveries, efficiency)

**Mock Data:** Active deliveries, $127.50 daily earnings, 4.9★ rating

---

## Quick Commands

### As Admin
```bash
# Deploy database migration
supabase db push

# Deploy edge function
supabase functions deploy send-investor-demo-invite

# Check email logs
# Go to: Supabase Dashboard → Edge Functions → Logs
```

### Direct URLs
- **Management:** `https://hq.cravenusa.com/hub/investor-demo`
- **Demo Portal:** `https://hq.cravenusa.com/investor-demo?token=<TOKEN>`
- **Customer View:** `https://hq.cravenusa.com/investor-demo/customer`
- **Merchant View:** `https://hq.cravenusa.com/investor-demo/merchant`
- **Driver View:** `https://hq.cravenusa.com/investor-demo/driver`

---

## Troubleshooting

### Investor didn't receive email
1. Check Resend logs in Supabase
2. Copy magic link manually from management UI
3. Send via Slack/WhatsApp/alternative channel

### Token expired
1. Re-send invite to same email
2. New token generated automatically
3. Old link stops working, new link sent

### Need to revoke access
1. Management UI → Find investor → Click ❌ icon
2. Immediate revocation (existing sessions terminated)

---

## Best Practices

### Before Investor Meeting
✅ Send invite 24-48 hours in advance  
✅ Verify email delivery in analytics  
✅ Have backup magic link copied  
✅ Test all three views yourself first  

### During Meeting
✅ Start with Customer view (most relatable)  
✅ Highlight key metrics in Merchant view  
✅ Show Driver mobile UX for completeness  
✅ Emphasize "all data is mock for demo purposes"  

### After Meeting
✅ Review engagement analytics  
✅ Document investor interest areas  
✅ Revoke access if no longer needed  
✅ Keep access active during due diligence  

---

## Pro Tips

### For Presentations
- Open all three views in separate tabs before meeting
- Use Driver view on mobile device for authentic feel
- Point out real-time features (order tracking, earnings)
- Highlight unit economics (fees, margins) in Merchant view

### For Follow-Up
- Share magic link with multiple stakeholders at same firm
- Analytics track individual access (useful for partner interest gauge)
- 90-day window supports extended due diligence periods

### For Scalability
- Can send unlimited invites
- No performance impact on production
- Each investor gets unique token for tracking
- Bulk revocation possible if needed

---

## Support

**Issues or Questions:**  
Contact: tstroman.ceo@cravenusa.com

**Documentation:**  
`INVESTOR_DEMO_PORTAL_IMPLEMENTATION.md` (full technical details)

**System Status:**  
All systems operational and production-ready ✅

---

*Last Updated: January 29, 2026*  
*Quick Reference v1.0*

