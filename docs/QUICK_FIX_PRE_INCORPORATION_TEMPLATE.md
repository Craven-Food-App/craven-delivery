# Quick Fix: Pre-Incorporation Document Not Generating

## Problem
The pre-incorporation consent document template exists in the file system but the database entry only has a placeholder comment.

## Solution (2 minutes)

### Step 1: Copy Template Content
1. Open `server/templates/pre_incorporation_consent.hbs` in your editor
2. Select all (Ctrl+A) and copy (Ctrl+C) the entire HTML content

### Step 2: Update Template in Database via UI
1. Go to your app → **Board Portal** → **Templates** tab
2. Find **"Pre-Incorporation Consent (Conditional Appointments)"** in the Document Templates list
3. Click the **Edit** button (pencil icon)
4. In the **HTML Content** textarea, select all and delete the placeholder comment
5. Paste the HTML content you copied from the file
6. Click **Save**

### Step 3: Verify
1. Go to **Board Portal** → **Officer Management** → **Officer Documents** tab
2. Make sure the toggle shows **"Pre-Incorporation"** mode (not "Incorporated")
3. Click **Send Docs** for an executive
4. The document should now generate successfully!

## Alternative: Use SQL Editor

If you prefer SQL, run this in Supabase Dashboard → SQL Editor:

```sql
-- First, get the template content from the file and replace the content below
UPDATE public.document_templates
SET 
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Pre-Incorporation Consent (Conditional Appointments)</title>
  <!-- ... paste the full HTML from server/templates/pre_incorporation_consent.hbs here ... -->
</body>
</html>',
  updated_at = now()
WHERE template_key = 'pre_incorporation_consent';
```

**Note:** Make sure to escape single quotes in the HTML (replace `'` with `''`).

## Why This Happened
The template was seeded with a placeholder comment. The system requires the full HTML content in the database to generate documents.


