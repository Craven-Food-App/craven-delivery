# 🗄️ Database Setup Guide

## Why Chat/Promos/Ratings Don't Work Yet

All the new driver features (ratings, promotions, preferences, support chat) require **database tables** that don't exist in your Supabase project yet!

---

## ✅ Quick Fix (5 minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your **craven-delivery** project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Combined Migration
1. Click the **New Query** button (or press `Ctrl+Enter`)
2. Open the file `APPLY_ALL_NEW_FEATURES.sql` from your project root
3. **Copy ALL the contents** of that file
4. **Paste** into the SQL Editor
5. Click **Run** (or press `Ctrl+Enter`)

### Step 3: Verify Success
You should see:
```
✅ ALL NEW FEATURES INSTALLED SUCCESSFULLY!
📊 Tables created: 16
🔒 RLS policies enabled
🎯 Sample data inserted
🚀 Your app is ready to use!
```

### Step 4: Refresh Your App
1. Go back to your mobile app
2. Refresh the page (or close and reopen)
3. Try the **Help** button again - you should see **6 Quick Help buttons**!
4. Type a message - the **Send** button should work!

---

## 📋 What Gets Created

### Tables (16 total):
- `driver_rating_breakdown` - Detailed rating data
- `driver_performance_metrics` - Stats & trends
- `driver_achievements` - Achievement definitions
- `driver_achievement_unlocks` - What drivers earned
- `driver_rating_tiers` - Elite, Pro, Rising Star, New Driver
- `driver_rating_alerts` - Low rating warnings
- `driver_promotions` - Challenges & bonuses
- `driver_promotion_participation` - Driver progress
- `driver_surge_zones` - High demand areas
- `driver_referrals` - Referral tracking
- `driver_streaks` - Streak bonuses
- `driver_preferences` - All driver settings
- `driver_support_chats` - Chat sessions
- `driver_support_messages` - Messages
- `chat_quick_responses` - Quick help buttons
- `support_agents` - Support team data

### Sample Data Included:
- ✅ 4 Rating tiers (Elite, Pro, Rising Star, New Driver) with custom colors
- ✅ 10 Achievements (First Delivery, 100 Club, Perfect 5.0, etc.)
- ✅ 3 Sample promotions (Weekend Warrior, Peak Hour Pro, Daily Grind)
- ✅ 6 Quick Help categories (Order, Earnings, App, Navigation, Ratings, General)

---

## 🐛 Troubleshooting

### Error: "relation does not exist"
**Cause:** Migration hasn't been run yet
**Fix:** Follow steps above to run `APPLY_ALL_NEW_FEATURES.sql`

### Error: "permission denied"
**Cause:** You're not logged in as the project owner
**Fix:** Make sure you're signed into Supabase with the correct account

### Tables already exist
**Safe to re-run:** The script uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`, so it won't break existing data

### Still not working?
1. Check browser console (F12) for error messages
2. Verify you ran the ENTIRE SQL file (all 500+ lines)
3. Try refreshing your Supabase connection: Sign out and back in

---

## 🎉 What Works After Setup

✅ **Driver Ratings Page** - Full analytics, trends, achievements
✅ **Driver Promos Page** - Challenges, bonuses, streaks
✅ **Driver Preferences** - 50+ customizable settings
✅ **Support Chat** - 6 quick help buttons + real messaging
✅ **Admin Rating Management** - Track all drivers
✅ **Admin Promo Dashboard** - Create and manage promotions

---

## 📝 Need Help?

If you still see issues after running the migration:
1. Check if tables were created: Go to Supabase → Table Editor
2. Look for tables starting with `driver_`
3. Should see 16 new tables total

The app will now show a helpful error screen with instructions if tables are missing! 🎨

