# Restaurant Onboarding Admin Portal - Database Requirements

## Overview
This document outlines all database tables and fields required for the Restaurant Onboarding Admin Portal to function correctly.

---

## ✅ Existing Tables (Already in use)

### 1. `restaurants` table
**Purpose:** Core restaurant data

**Required Fields:**
- `id` (UUID, Primary Key)
- `name` (text)
- `email` (text)
- `phone` (text)
- `address` (text)
- `city` (text)
- `state` (text)
- `zip_code` (text)
- `cuisine_type` (text, nullable)
- `logo_url` (text, nullable)
- `onboarding_status` (text, nullable)
- `created_at` (timestamp)
- `banking_complete` (boolean, nullable)
- `readiness_score` (integer, nullable)
- `business_license_url` (text, nullable)
- `insurance_certificate_url` (text, nullable)
- `health_permit_url` (text, nullable)
- `owner_id_url` (text, nullable)
- `business_verified_at` (timestamp, nullable)
- `verification_notes` (jsonb, nullable)
- `restaurant_type` (text, nullable)
- `expected_monthly_orders` (integer, nullable)
- `description` (text, nullable)
- `owner_id` (UUID, Foreign Key to profiles)

---

### 2. `restaurant_onboarding` table
**Purpose:** Track onboarding progress and admin assignments

**Required Fields:**
- `id` (UUID, Primary Key)
- `restaurant_id` (UUID, Foreign Key to restaurants)
- `menu_preparation_status` (text: 'not_started' | 'in_progress' | 'ready')
- `business_info_verified` (boolean)
- `go_live_ready` (boolean)
- `admin_notes` (text, nullable)
- `business_verified_at` (timestamp, nullable)
- `menu_ready_at` (timestamp, nullable)
- `tablet_shipped` (boolean, nullable)
- `tablet_shipped_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- **`assigned_admin_id` (UUID, Foreign Key to profiles)** - FOR TEAM ASSIGNMENT
- **`onboarding_status` (text)** - FOR STATUS TRACKING

**Indexes:**
- `restaurant_id` (Foreign Key index)
- `assigned_admin_id` (Foreign Key index)
- `created_at` (For date range queries)
- `updated_at` (For tracking changes)

---

### 3. `profiles` table
**Purpose:** Admin user management

**Required Fields:**
- `id` (UUID, Primary Key)
- `email` (text)
- `full_name` (text, nullable)
- `role` (text) - Should include 'admin' role
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Indexes:**
- `role` (For filtering admins)
- `email` (For lookups)

---

## 🆕 New Tables Required

### 4. `restaurant_onboarding_activity_log` table
**Purpose:** Track all admin actions for audit trail

**Required Fields:**
```sql
CREATE TABLE restaurant_onboarding_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_restaurant ON restaurant_onboarding_activity_log(restaurant_id);
CREATE INDEX idx_activity_log_admin ON restaurant_onboarding_activity_log(admin_id);
CREATE INDEX idx_activity_log_created ON restaurant_onboarding_activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action_type ON restaurant_onboarding_activity_log(action_type);
```

**Action Types:**
- `approved` - Restaurant approved
- `rejected` - Restaurant rejected
- `updated` - General update
- `email_sent` - Email communication
- `document_verified` - Document verification
- `assigned` - Team assignment
- `note_added` - Admin note added
- `status_changed` - Status change
- `exported` - Data exported
- `imported` - Data imported

---

## 📊 Row Level Security (RLS)

### Required RLS Policies

**For `restaurant_onboarding` table:**
```sql
-- Allow admins to read all onboarding data
CREATE POLICY "Admins can read onboarding data"
  ON restaurant_onboarding FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update onboarding data
CREATE POLICY "Admins can update onboarding data"
  ON restaurant_onboarding FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**For `restaurant_onboarding_activity_log` table:**
```sql
-- Allow admins to insert activity logs
CREATE POLICY "Admins can insert activity logs"
  ON restaurant_onboarding_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to read activity logs
CREATE POLICY "Admins can read activity logs"
  ON restaurant_onboarding_activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**For `profiles` table:**
```sql
-- Allow admins to read other admin profiles
CREATE POLICY "Admins can read admin profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

---

## 🔧 Migration Scripts

### Script 1: Add Team Assignment Field
```sql
-- Add assigned_admin_id to restaurant_onboarding table
ALTER TABLE restaurant_onboarding 
ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_onboarding_assigned_admin 
ON restaurant_onboarding(assigned_admin_id);
```

### Script 2: Create Activity Log Table
```sql
-- Create activity log table
CREATE TABLE IF NOT EXISTS restaurant_onboarding_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_restaurant 
ON restaurant_onboarding_activity_log(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_admin 
ON restaurant_onboarding_activity_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_created 
ON restaurant_onboarding_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_action_type 
ON restaurant_onboarding_activity_log(action_type);

-- Enable RLS
ALTER TABLE restaurant_onboarding_activity_log ENABLE ROW LEVEL SECURITY;
```

---

## 📋 Feature-to-Database Mapping

| Feature | Required Tables | Optional Tables |
|---------|----------------|-----------------|
| **Analytics Dashboard** | `restaurants`, `restaurant_onboarding` | `restaurant_onboarding_activity_log` |
| **Bulk Actions** | `restaurants`, `restaurant_onboarding` | - |
| **Kanban Board** | `restaurants`, `restaurant_onboarding` | - |
| **CSV Export** | `restaurants`, `restaurant_onboarding` | - |
| **Activity Log** | - | `restaurant_onboarding_activity_log`, `profiles` |
| **Email Templates** | `restaurants` | `restaurant_onboarding_activity_log` |
| **Team Assignment** | `restaurant_onboarding`, `profiles` | - |
| **SLA Tracking** | `restaurants`, `restaurant_onboarding` | - |

---

## ⚠️ Important Notes

1. **Activity Log is Optional**: The system will work without the activity log table, but audit tracking will not be available.

2. **Team Assignment**: Requires `assigned_admin_id` field in `restaurant_onboarding` table. If missing, assignment feature will show empty results.

3. **Admin Role**: The `profiles` table must have a `role` field set to 'admin' for admin users to access these features.

4. **Timestamps**: All timestamp fields should be `TIMESTAMP WITH TIME ZONE` for proper timezone handling.

5. **Cascading Deletes**: Activity logs use `ON DELETE CASCADE` to automatically clean up when a restaurant is deleted.

---

## 🚀 Quick Setup Checklist

- [ ] Verify `restaurants` table has all required fields
- [ ] Verify `restaurant_onboarding` table exists with all fields
- [ ] Add `assigned_admin_id` column to `restaurant_onboarding`
- [ ] Create `restaurant_onboarding_activity_log` table
- [ ] Set up RLS policies for admins
- [ ] Create necessary indexes
- [ ] Verify `profiles` table has `role` field
- [ ] Ensure at least one user has `role = 'admin'`

---

## 📞 Support

If any database tables or fields are missing, the system will:
1. Show error toasts with clear messages
2. Log errors to the console
3. Display empty states gracefully
4. Continue functioning with available data

No mock data is used - all data comes directly from Supabase!

