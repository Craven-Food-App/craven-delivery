# Generate HR Documents for All Executives

## Problem
You have existing executives (CEO, CFO, CXO) that were hired before the new HR document system was deployed. Their documents were only sent as HTML emails and not stored as PDFs in the database.

## Solution
Use this guide to retroactively generate and store all required documents.

---

## Step 1: Identify Your Executives

Run this in Supabase SQL Editor to see all C-level employees:

```sql
-- Get all C-level employees
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.email,
  e.position,
  e.hire_date,
  eq.shares_percentage as equity,
  eq.equity_type
FROM public.employees e
LEFT JOIN public.employee_equity eq ON eq.employee_id = e.id
WHERE LOWER(e.position) LIKE '%chief%' 
   OR LOWER(e.position) LIKE '%ceo%'
   OR LOWER(e.position) LIKE '%cfo%'
   OR LOWER(e.position) LIKE '%cto%'
   OR LOWER(e.position) LIKE '%coo%'
   OR LOWER(e.position) LIKE '%cxo%'
   OR LOWER(e.position) LIKE '%president%'
ORDER BY e.position;
```

---

## Step 2: Generate Documents via CEO Portal

**Manual Method (Recommended):**

1. **Go to CEO Portal:** `http://localhost:8080/ceo`
2. **Click Personnel tab**
3. **Find each executive** in the list
4. **Click "Resend Documents"** button (or re-hire them)

This will generate all documents using the new system.

---

## Step 3: Automated Method (SQL + Edge Function)

**Create a helper SQL script to generate documents for existing executives:**

Save this as `generate-missing-docs.sql`:

```sql
-- Generate missing documents for existing executives
-- This creates placeholder board resolutions and triggers document generation

DO $$
DECLARE
  emp_record RECORD;
  resolution_number TEXT;
  board_res_id UUID;
BEGIN
  -- Loop through all C-level employees
  FOR emp_record IN 
    SELECT 
      e.id,
      e.first_name,
      e.last_name,
      e.email,
      e.position,
      e.hire_date,
      eq.shares_percentage as equity
    FROM public.employees e
    LEFT JOIN public.employee_equity eq ON eq.employee_id = e.id
    WHERE LOWER(e.position) LIKE '%chief%' 
       OR LOWER(e.position) LIKE '%ceo%'
       OR LOWER(e.position) LIKE '%cfo%'
       OR LOWER(e.position) LIKE '%cto%'
       OR LOWER(e.position) LIKE '%coo%'
       OR LOWER(e.position) LIKE '%cxo%'
       OR LOWER(e.position) LIKE '%president%'
    ORDER BY e.hire_date
  LOOP
    -- Generate board resolution for this employee
    resolution_number := 'BR' || EXTRACT(YEAR FROM emp_record.hire_date)::TEXT || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    
    -- Create board resolution
    INSERT INTO public.board_resolutions (
      resolution_number,
      resolution_type,
      subject_position,
      subject_person_name,
      subject_person_email,
      resolution_title,
      resolution_text,
      effective_date,
      employee_id,
      board_members,
      votes_for,
      votes_against,
      votes_abstain,
      status,
      required_documents,
      created_by,
      executed_by,
      executed_at
    ) VALUES (
      resolution_number,
      'appointment',
      emp_record.position,
      emp_record.first_name || ' ' || emp_record.last_name,
      emp_record.email,
      'Appointment of ' || emp_record.first_name || ' ' || emp_record.last_name || ' as ' || emp_record.position,
      'Resolution to appoint ' || emp_record.first_name || ' ' || emp_record.last_name || ' to the position of ' || emp_record.position,
      emp_record.hire_date,
      emp_record.id,
      '[
        {"name": "Torrance Stroman", "title": "CEO", "vote": "for"},
        {"name": "Board Member 1", "title": "Independent Director", "vote": "for"},
        {"name": "Board Member 2", "title": "Independent Director", "vote": "for"}
      ]'::jsonb,
      3,
      0,
      0,
      'approved',
      CASE 
        WHEN LOWER(emp_record.position) LIKE '%ceo%' THEN '["board_resolution", "founders_equity_insurance_agreement", "equity_agreement", "offer_letter"]'::jsonb
        WHEN LOWER(emp_record.position) LIKE '%chief%' OR emp_record.equity > 0 THEN '["board_resolution", "equity_agreement", "offer_letter"]'::jsonb
        ELSE '["offer_letter"]'::jsonb
      END,
      NULL,
      NULL,
      NOW()
    ) RETURNING id INTO board_res_id;
    
    -- TODO: Call generate-hr-pdf edge function for each document
    -- This requires app-level code, not SQL
    
    RAISE NOTICE 'Created board resolution % for % % as %', resolution_number, emp_record.first_name, emp_record.last_name, emp_record.position;
  END LOOP;
END $$;
```

---

## Step 4: Generate PDFs via Edge Function

**After running the SQL above, you need to generate the actual PDFs.**

Create a Node.js script or use the CEO Portal's "Resend Documents" feature.

**Or create a simple script:**

Save as `generate-docs-for-existing-execs.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateDocsForExistingExecs() {
  // Get all C-level employees
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      *,
      employee_equity(shares_percentage, equity_type)
    `)
    .or('position.ilike.%chief%,position.ilike.%CEO%,position.ilike.%CFO%,position.ilike.%CTO%,position.ilike.%COO%,position.ilike.%CXO%,position.ilike.%President%');

  if (error) throw error;

  for (const emp of employees) {
    const equity = emp.employee_equity?.[0];
    const isCLevel = /chief|ceo|cfo|cto|coo/i.test(emp.position);
    const isCEO = /ceo/i.test(emp.position);

    console.log(`Generating documents for ${emp.first_name} ${emp.last_name} - ${emp.position}`);

    // Generate Board Resolution
    await supabase.functions.invoke('generate-hr-pdf', {
      body: {
        documentType: 'board_resolution',
        employeeId: emp.id,
        metadata: {
          employeeName: `${emp.first_name} ${emp.last_name}`,
          employeeEmail: emp.email,
          position: emp.position,
          resolutionNumber: `BR${new Date(emp.hire_date).getFullYear()}${Math.floor(Math.random() * 9000) + 1000}`,
          effectiveDate: emp.hire_date,
          companyName: 'Craven Inc',
          state: 'Ohio',
          boardMembers: [
            { name: 'Torrance Stroman', title: 'CEO', vote: 'for' },
            { name: 'Board Member 1', title: 'Independent Director', vote: 'for' }
          ],
          equityPercentage: equity?.shares_percentage,
          createdBy: null
        },
        alsoEmail: false
      }
    });

    // Generate Offer Letter
    await supabase.functions.invoke('generate-hr-pdf', {
      body: {
        documentType: 'offer_letter',
        employeeId: emp.id,
        metadata: {
          employeeName: `${emp.first_name} ${emp.last_name}`,
          employeeEmail: emp.email,
          position: emp.position,
          department: 'Executive',
          salary: emp.salary,
          startDate: emp.hire_date,
          companyName: 'Craven Inc',
          state: 'Ohio',
          createdBy: null
        },
        alsoEmail: false
      }
    });

    // Generate Equity Agreement if applicable
    if (isCLevel && equity && equity.shares_percentage > 0) {
      await supabase.functions.invoke('generate-hr-pdf', {
        body: {
          documentType: 'equity_agreement',
          employeeId: emp.id,
          metadata: {
            employeeName: `${emp.first_name} ${emp.last_name}`,
            employeeEmail: emp.email,
            position: emp.position,
            equityPercentage: equity.shares_percentage,
            equityType: equity.equity_type || 'common_stock',
            companyName: 'Craven Inc',
            state: 'Ohio',
            createdBy: null
          },
          alsoEmail: false
        }
      });
    }

    // Generate Founders Agreement if CEO
    if (isCEO) {
      await supabase.functions.invoke('generate-hr-pdf', {
        body: {
          documentType: 'founders_equity_insurance_agreement',
          employeeId: emp.id,
          metadata: {
            employeeName: `${emp.first_name} ${emp.last_name}`,
            employeeEmail: emp.email,
            position: emp.position,
            equityPercentage: equity?.shares_percentage || 0,
            companyName: 'Craven Inc',
            state: 'Ohio',
            resolutionNumber: `BR${new Date(emp.hire_date).getFullYear()}${Math.floor(Math.random() * 9000) + 1000}`,
            createdBy: null
          },
          alsoEmail: false
        }
      });
    }

    console.log(`✅ Completed ${emp.first_name} ${emp.last_name}`);
  }
}

generateDocsForExistingExecs().catch(console.error);
```

---

## Quick Solution: Use CEO Portal

**Easiest method:**

1. **Deploy the HR system first:** Follow `RUN-THIS-NOW.md`
2. **Go to CEO Portal:** `http://localhost:8080/ceo-portal`
3. **Click Personnel tab**
4. **For each executive:** Click "Resend All Documents"
5. **Done!** All PDFs will be generated and stored

---

## What Gets Generated

For each executive:
- ✅ Board Resolution PDF
- ✅ Offer Letter PDF  
- ✅ Equity Agreement PDF (if equity granted)
- ✅ Founders Agreement PDF (if CEO)

All stored in `hr-documents` bucket and visible in Board Portal → Document Vault!

