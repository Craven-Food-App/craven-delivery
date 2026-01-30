# 🗄️ Setup Admin Operations Tables

## ⚠️ IMPORTANT: Run This First!

The admin portal Operations tabs (Refunds, Disputes, Support Tickets, Audit Logs) require database tables that don't exist yet. Follow these steps to create them:

---

## 📋 **Step 1: Open Supabase SQL Editor**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **craven-delivery** project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

---

## 📝 **Step 2: Copy and Run the Migration**

### **Option A: Run from Migration File**
1. Open the file: `supabase/migrations/20250119000000_create_admin_operations_tables.sql`
2. Copy the ENTIRE contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### **Option B: Quick Copy (Use This)**

Copy and paste this into Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. REFUND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'processed')) DEFAULT 'pending',
  type TEXT CHECK (type IN ('full', 'partial')) DEFAULT 'full',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refund_requests_order_id ON refund_requests(order_id);
CREATE INDEX idx_refund_requests_customer_id ON refund_requests(customer_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);

-- 2. DISPUTES TABLE
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  dispute_type TEXT NOT NULL,
  reported_by TEXT CHECK (reported_by IN ('customer', 'driver', 'restaurant')) NOT NULL,
  reporter_id UUID NOT NULL,
  status TEXT CHECK (status IN ('open', 'investigating', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  description TEXT NOT NULL,
  resolution TEXT,
  evidence JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_priority ON disputes(priority);

-- 3. DISPUTE MESSAGES TABLE
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('admin', 'customer', 'driver', 'restaurant')) NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('order_issue', 'account', 'payment', 'technical', 'general')) NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')) DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- 5. TICKET MESSAGES TABLE
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('customer', 'admin')) NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- 7. ADD COLUMNS TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_until TIMESTAMP WITH TIME ZONE;

-- 8. ENABLE RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. CREATE POLICIES (Allow authenticated users - adjust as needed)
CREATE POLICY "Admins access refund_requests" ON refund_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins access disputes" ON disputes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins access dispute_messages" ON dispute_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins access support_tickets" ON support_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins access ticket_messages" ON ticket_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins view audit_logs" ON admin_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert audit_logs" ON admin_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
```

---

## ✅ **Step 3: Verify Tables Were Created**

After running the SQL, verify the tables exist:

1. In Supabase, click **Table Editor** in the left sidebar
2. You should see these new tables:
   - `refund_requests`
   - `disputes`
   - `dispute_messages`
   - `support_tickets`
   - `ticket_messages`
   - `admin_audit_logs`

---

## 🧪 **Step 4: Test the Admin Portal**

1. Go to your admin portal: `/admin`
2. Navigate to **Operations** section
3. Click each tab to verify they load without errors:
   - ✅ **Refunds** - Should show empty state
   - ✅ **Disputes** - Should show empty state
   - ✅ **Support Tickets** - Should show empty state
   - ✅ **Audit Logs** - Should show empty state

---

## 🎯 **What Each Table Does**

| Table | Purpose |
|-------|---------|
| `refund_requests` | Stores customer refund requests with approval workflow |
| `disputes` | Tracks disputes between customers, drivers, and restaurants |
| `dispute_messages` | Communication during dispute resolution |
| `support_tickets` | Customer support ticket system |
| `ticket_messages` | Messages in support tickets |
| `admin_audit_logs` | Logs all admin actions for compliance |

---

## 🔒 **Security Notes**

- All tables have Row Level Security (RLS) enabled
- Current policies allow all authenticated users access
- **TODO:** Update policies to restrict access to admin users only
- Add role-based access control in production

---

## 🐛 **Troubleshooting**

### **Error: relation "orders" does not exist**
- Make sure your `orders` table exists first
- Update the foreign key references if your table has a different name

### **Error: relation "profiles" does not exist**
- Make sure your `profiles` table exists first
- Update the foreign key references if your table has a different name

### **Tables created but still getting errors**
- Refresh your browser (Ctrl+Shift+R)
- Check browser console for specific errors
- Verify you're logged in as an admin user

---

## 📊 **Optional: Add Sample Data**

To test with sample data, run this in SQL Editor:

```sql
-- Sample refund (requires existing order)
INSERT INTO refund_requests (order_id, customer_id, amount_cents, reason, type)
SELECT 
  o.id,
  o.customer_id,
  o.total_cents,
  'Test refund request for damaged item',
  'full'
FROM orders o
LIMIT 1;

-- Sample support ticket (requires existing profile)
INSERT INTO support_tickets (
  ticket_number,
  customer_id, 
  subject, 
  description, 
  category, 
  priority
)
VALUES (
  'TKT-TEST-001',
  (SELECT id FROM profiles LIMIT 1),
  'Test Support Ticket',
  'This is a test support ticket for demonstration',
  'technical',
  'medium'
);
```

---

## ✅ **Success!**

Once the tables are created, your admin portal Operations section will be fully functional! 

You can now:
- ✅ Process refunds
- ✅ Resolve disputes
- ✅ Manage support tickets
- ✅ View audit logs
- ✅ Manage customer accounts

---

## 🚀 **Next Steps**

1. Train admin staff on new features
2. Set up proper admin role permissions
3. Configure notification emails for new tickets/disputes
4. Set up backup schedules for audit logs
5. Create admin user guides
