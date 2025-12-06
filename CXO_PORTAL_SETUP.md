# CXO Portal Setup Instructions

## Database Migration Required

The CXO Portal requires database tables to be created. **You must run the migration before the portal will work.**

### Migration File
`supabase/migrations/20250131000008_create_cxo_portal_schema.sql`

### How to Run the Migration

#### Option 1: Using Supabase CLI (Recommended)
```bash
# Make sure you're in the project root
cd /path/to/craven-delivery

# Run the migration
supabase db push
```

#### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20250131000008_create_cxo_portal_schema.sql`
4. Paste and execute the SQL

#### Option 3: Using psql
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20250131000008_create_cxo_portal_schema.sql
```

### Tables Created

The migration creates the following tables:
- `experience_metrics_snapshots` - Time-series metrics data
- `experience_tickets` - CXO-visible tickets
- `drivers` - Driver reference data
- `merchants` - Restaurant/merchant partner data
- `support_staff` - Support team registry
- `support_staff_metrics` - Staff performance metrics
- `experience_analytics` - CSAT, NPS, and other analytics
- `experience_initiatives` - Improvement programs
- `experience_incidents` - Incident tracking
- `cxo_reports` - Daily/weekly executive reports

### After Running Migration

Once the migration is complete:
1. The CXO Portal will automatically detect the tables
2. All pages will load with empty states (no data yet)
3. You can start populating data through the portal or via direct database inserts

### Access Control

The portal is accessible to:
- Users with position containing "Chief Experience Officer" or "CXO" in `employees` table
- Users with role "CXO" or "ADMIN" in `user_roles` table
- Users with role "ceo" or "cxo" in `exec_users` table (CEO has access to all executive portals)

### Troubleshooting

If you see errors about missing tables:
1. Verify the migration has been run: Check Supabase dashboard → Database → Tables
2. Check migration status: `supabase migration list`
3. Ensure you're connected to the correct database
4. Check browser console for specific error messages

