

## CPO Portal Enhancement Plan

### Current Gaps Identified

1. **No file upload** — The Contract Management "Add Document" modal only saves metadata. The `file_url` and `file_size_bytes` columns exist in `partnership_documents` but are never populated. No storage bucket exists for partnership files.

2. **Missing CPO features:**
   - No partner notes/meeting log UI (table exists: `partnership_activities`, but no way to add entries from the UI)
   - No revenue tracking per partner (no revenue columns or tab)
   - No task/action items for follow-ups
   - No communication log or email integration
   - No partner onboarding checklist
   - Pipeline has no edit capability (only advance stage or delete)

---

### What We Will Build

#### 1. File Upload for Contract Documents
- Create a `partnership-documents` storage bucket (public: false)
- Add a file upload dropzone (Mantine `FileInput` or `Dropzone`) to the "Add Document" modal
- Accept: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG
- Upload to Supabase Storage, save `file_url` and `file_size_bytes` to the record
- Add a "View/Download" button on the contracts table for documents with files

#### 2. Activity Log Tab (Notes & Meetings)
- New tab: **Activity Log** in the CPO portal
- Form to log activities: meeting notes, calls, emails, status updates
- Links to a partner, includes date/time, description, and activity type
- Timeline view of all activities across partners

#### 3. Partner Onboarding Checklist
- Add an **Onboarding** tab with configurable checklist items per partner type
- Default steps: NDA signed, contract executed, integration setup, first order, etc.
- Track completion per partner

#### 4. Edit Partner Details
- Add edit capability to the Pipeline cards (currently only advance/delete)
- Click a partner card to open an edit modal with all fields

#### 5. Revenue Tracking
- Add `revenue_ytd` and `revenue_mtd` columns to `partnerships` table
- Show revenue metrics on Dashboard and Analytics tabs
- Allow manual revenue entry per partner

---

### Technical Approach

**Database Migration:**
- Create `partnership-documents` storage bucket with RLS
- Add `partnership_onboarding_items` table (partnership_id, step_name, completed, completed_at)
- Add `revenue_ytd`, `revenue_mtd` columns to `partnerships`

**New/Updated Files:**
- `src/portals/cpo/tabs/ContractManagement.tsx` — Add file upload dropzone, download/view buttons
- `src/portals/cpo/tabs/ActivityLog.tsx` — New tab for logging and viewing activities
- `src/portals/cpo/tabs/PartnerOnboarding.tsx` — New tab with checklist per partner
- `src/portals/cpo/tabs/PartnerPipeline.tsx` — Add edit modal for partner details
- `src/portals/cpo/CPOPortal.tsx` — Add 2 new tabs (Activity Log, Onboarding)
- `src/portals/cpo/tabs/CPODashboard.tsx` — Add revenue KPIs
- `src/portals/cpo/tabs/PartnershipAnalytics.tsx` — Add revenue charts

**Storage bucket SQL:**
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('partnership-documents', 'partnership-documents', false);

CREATE POLICY "Authenticated can upload partnership docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partnership-documents');

CREATE POLICY "Authenticated can read partnership docs"  
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partnership-documents');
```

**Upload flow in ContractManagement:**
1. User selects file via `FileInput`
2. On submit: upload to `partnership-documents/{timestamp}-{filename}`
3. Get public URL, save to `partnership_documents.file_url`
4. Display download icon on table rows with files

