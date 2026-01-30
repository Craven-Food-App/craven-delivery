# SOP Documents Portal Setup Guide

## Overview

The Company Portal now includes a **Standard Operating Procedures (SOP)** section where executives can view and download PDF versions of all company SOPs.

## System Architecture

### Components

1. **Database Table:** `sop_documents` - Stores SOP metadata
2. **Storage Bucket:** `sop-documents` - Stores PDF files
3. **Company Portal Page:** `/company/sop` - Executive-facing interface
4. **Conversion Utility:** `markdownToPdf.ts` - Converts MD to PDF
5. **Sync Script:** `scripts/sync-sop-to-portal.ts` - Syncs MD files to portal

---

## Setup Instructions

### Step 1: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create Bucket"
3. Settings:
   - **Name:** `sop-documents`
   - **Public:** `false` (executives only)
   - **File Size Limit:** `10MB`
   - **Allowed MIME Types:** `application/pdf`

### Step 2: Run Database Migration

Run the migration in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20251218000004_create_sop_documents_system.sql
```

This creates:
- `sop_documents` table
- RLS policies for executive access
- Initial Investor Compliance SOP record

### Step 3: Upload Initial SOP PDF

**Option A: Using the Portal (Recommended)**

1. Navigate to Company Portal → SOP Documents
2. Find "Investor Compliance & Intake Process"
3. Click "Upload PDF"
4. Select the PDF file (or generate from MD first)

**Option B: Using Sync Script**

```bash
# Set environment variables
export VITE_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run sync script
tsx scripts/sync-sop-to-portal.ts INVESTOR_COMPLIANCE_SOP.md
```

### Step 4: Verify Access

1. Log in as an executive user
2. Navigate to Company Portal (`/company`)
3. Click "SOP Documents" in sidebar
4. Verify the Investor Compliance SOP appears
5. Test viewing/downloading the PDF

---

## Adding New SOPs

### Method 1: Manual Upload (Quick)

1. Create/edit the `.md` file in the repository
2. Convert to PDF manually (using any MD→PDF tool)
3. Go to Company Portal → SOP Documents
4. Click "Upload PDF" (if SOP record exists) or create new record first

### Method 2: Automated Sync (Recommended)

1. Create/edit the `.md` file in the repository
2. Run sync script:
   ```bash
   tsx scripts/sync-sop-to-portal.ts path/to/your-sop.md
   ```
3. Script will:
   - Extract metadata from MD file
   - Convert to PDF
   - Create/update database record
   - Upload PDF to storage

### Method 3: Database + Manual Upload

1. Insert record in `sop_documents` table:
   ```sql
   INSERT INTO sop_documents (
     title, description, category, version,
     markdown_file_path, owner_department, tags
   ) VALUES (
     'Your SOP Title',
     'Description',
     'Category',
     '1.0',
     'YOUR_SOP.md',
     'Department',
     ARRAY['tag1', 'tag2']
   );
   ```
2. Upload PDF via portal interface

---

## SOP Document Structure

### Required Fields

- `title` - SOP title
- `category` - Category (Investor Relations, HR, Finance, Operations, etc.)
- `version` - Version number (e.g., "1.0")
- `status` - draft | active | archived
- `markdown_file_path` - Path to .md file in repo

### Optional Fields

- `description` - Brief description
- `owner_department` - Responsible department
- `tags` - Array of tags for filtering
- `keywords` - Searchable keywords
- `review_frequency_days` - How often to review (default: 90)
- `next_review_due_at` - When next review is due

---

## Access Control

### Who Can View

- All executives with Company Portal access
- Users with roles: `CRAVEN_EXECUTIVE`, `CRAVEN_FOUNDER`, `CRAVEN_CORPORATE_SECRETARY`, `CRAVEN_BOARD_MEMBER`
- Finance, Executive, and Operations department employees
- Admin users

### Who Can Upload/Manage

- Same as view access
- Only executives can upload PDFs
- Only executives can create new SOP records

---

## PDF Generation

### Current Implementation

The `markdownToPdf` utility provides basic MD→PDF conversion:
- Removes markdown syntax
- Preserves text content
- Adds title and formatting
- Handles page breaks

### Limitations

- **No advanced formatting** (tables, complex lists, images)
- **Basic markdown only** (headers, bold, italic, links)
- **No syntax highlighting** for code blocks

### Future Enhancements

For better PDF generation, consider:
- Using `marked` or `markdown-it` for proper parsing
- Using `puppeteer` for HTML→PDF conversion
- Using a dedicated service (e.g., PDFShift, HTMLPDF)

---

## Maintenance

### Regular Tasks

1. **Review SOPs Quarterly**
   - Check `next_review_due_at` dates
   - Update versions when SOPs change
   - Archive outdated SOPs

2. **Sync New SOPs**
   - When new `.md` files are added to repo
   - Run sync script or manually upload

3. **Update PDFs**
   - When MD files are updated
   - Re-run sync script or re-upload PDF

### Version Management

- Increment version when SOP content changes significantly
- Keep old versions archived (status='archived')
- Update `last_reviewed_at` after reviews

---

## Troubleshooting

### PDF Not Showing

**Check:**
1. Storage bucket exists: `sop-documents`
2. RLS policies allow executive access
3. PDF file path is correct in database
4. File actually exists in storage

**Fix:**
```sql
-- Check SOP record
SELECT id, title, pdf_file_path FROM sop_documents WHERE title LIKE '%Investor%';

-- Verify storage file exists (via Supabase Dashboard)
```

### Upload Fails

**Check:**
1. File size < 10MB
2. File is valid PDF
3. User has executive access
4. Storage bucket permissions

**Fix:**
- Check browser console for errors
- Verify RLS policies
- Try smaller PDF file

### Sync Script Errors

**Check:**
1. Environment variables set correctly
2. File path is correct
3. Markdown file is readable
4. Supabase credentials valid

**Fix:**
```bash
# Verify environment
echo $VITE_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test file exists
ls -la INVESTOR_COMPLIANCE_SOP.md
```

---

## Best Practices

1. **Keep MD and PDF in Sync**
   - Update both when SOP changes
   - Use sync script for consistency

2. **Version Control**
   - Increment version numbers
   - Archive old versions
   - Document changes in description

3. **Categorization**
   - Use consistent categories
   - Add relevant tags
   - Include keywords for search

4. **Review Schedule**
   - Set `review_frequency_days` appropriately
   - Review quarterly for active SOPs
   - Archive outdated SOPs

---

## Current SOPs

| Title | Category | Version | Status |
|-------|----------|---------|--------|
| Investor Compliance & Intake Process | Investor Relations | 1.0 | Active |

---

## Next Steps

1. ✅ Run migration to create `sop_documents` table
2. ✅ Create `sop-documents` storage bucket
3. ✅ Upload Investor Compliance SOP PDF
4. ⏳ Add more SOPs as they're created
5. ⏳ Set up automated sync (CI/CD) if desired

---

**Questions?** Contact the development team or check the Company Portal → SOP Documents section.

