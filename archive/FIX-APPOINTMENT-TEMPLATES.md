# 🔧 Fix Appointment Document Templates

## Problem
The appointment document generation is failing because the required templates don't exist in the database. The system is looking for these templates:
- `offer_letter` (for Appointment Letter)
- `board_resolution` (for Board Resolution)
- `employment_agreement` (for Employment Agreement)
- `stock_certificate` (for Certificate)

## ✅ Solution: Apply Migration

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your **craven-delivery** project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Migration
1. Open the file: `supabase/migrations/20250211000012_ensure_appointment_templates_exist.sql`
2. **Copy ALL the contents** (all 411 lines)
3. **Paste** into the Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)

### Step 3: Verify Success
You should see:
```
Success. No rows returned
```

Or check if templates exist by running this query:

```sql
SELECT template_key, name, is_active 
FROM public.document_templates 
WHERE template_key IN ('offer_letter', 'board_resolution', 'employment_agreement', 'stock_certificate');
```

You should see 4 rows returned, all with `is_active = true`.

## 🧪 Test Document Generation

After applying the migration:
1. Go to the Executive Appointments page
2. Click on an appointment
3. Click "Regenerate All Documents"
4. The documents should now generate successfully!

## 🐛 Troubleshooting

### Templates Still Not Found?

**Check if templates exist:**
```sql
SELECT template_key, name, is_active, html_content IS NOT NULL as has_content
FROM public.document_templates 
WHERE template_key IN ('offer_letter', 'board_resolution', 'employment_agreement', 'stock_certificate');
```

**If templates are missing:**
- Re-run the migration file
- Check for any error messages in the SQL Editor
- Ensure you're connected to the correct Supabase project

**If templates exist but are inactive:**
```sql
UPDATE public.document_templates 
SET is_active = true 
WHERE template_key IN ('offer_letter', 'board_resolution', 'employment_agreement', 'stock_certificate');
```

**If templates exist but have no content:**
- Re-run the migration (it uses `ON CONFLICT DO UPDATE` so it's safe to re-run)

## 📝 What This Migration Does

The migration creates/updates 4 document templates:
1. **offer_letter** - Executive Appointment Letter template
2. **board_resolution** - Board Resolution template  
3. **employment_agreement** - Executive Employment Agreement template
4. **stock_certificate** - Stock Certificate template

Each template includes:
- HTML content with placeholders (e.g., `{{full_name}}`, `{{title}}`)
- List of available placeholders
- Proper styling and formatting

The migration is **idempotent** - it's safe to run multiple times. It will update existing templates or create them if they don't exist.




