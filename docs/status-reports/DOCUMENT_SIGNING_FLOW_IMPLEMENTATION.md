# Executive Document Signing Flow Implementation

## Overview
This document describes the implementation of the ordered executive document signing flow system. Executives now have a secure portal where documents must be signed in a specific order, with dependencies enforced.

## Email Delivery (Google Workspace)
Outbound notifications that support the signing flow (IBOE dispatch, executive document bundles, and onboarding packets) are now sent through Google Workspace using the Gmail API. Supabase Edge Functions authenticate with a Google service account that has domain-wide delegation enabled for Gmail sending.

### Setup Checklist
1. **Create a service account** in Google Cloud and enable domain-wide delegation.
2. **Grant domain-wide access** to the Gmail API scope `https://www.googleapis.com/auth/gmail.send` inside the Google Workspace admin console. Use the service account client ID.
3. **Configure send-as aliases** for the delegated user (e.g., `hr@craven.com`, `treasury@cravenusa.com`) so Gmail allows those `From` addresses.
4. **Store secrets** in the Supabase Edge Function environment (Dashboard → Project Settings → API → Environment variables, or `supabase functions secrets set ...`).

### Required Environment Variables
- `GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_WORKSPACE_SERVICE_ACCOUNT_PRIVATE_KEY` (use the PEM value; escape newlines as `\n` when storing)
- `GOOGLE_WORKSPACE_DELEGATED_USER` (workspace user that holds the send-as aliases)
- `GOOGLE_WORKSPACE_DEFAULT_FROM` (fallback `From` header, e.g., `Crave'N HR <hr@craven.com>`)

### Optional Overrides
- `GOOGLE_WORKSPACE_EXECUTIVE_FROM` (overrides the `From` header for executive document related emails)
- `GOOGLE_WORKSPACE_TREASURY_FROM` (overrides the `From` header for treasury/IBOE mail)
- `GOOGLE_WORKSPACE_GMAIL_SCOPE` (defaults to `https://www.googleapis.com/auth/gmail.send`)

### In-App Configuration
Administrators can update these credentials from the CEO portal’s Business Email System by clicking **Google Workspace Settings**. The modal writes the values to `ceo_system_settings.google_workspace_email`, which the Supabase Edge Functions read automatically (environment variables still take precedence when set).

All Supabase email functions now surface Google API errors directly in the function response/logs. Removing the external Resend dependency means email deliverability depends on the Google Workspace account configuration and quota.

## Database Changes

### Migration: `20251106131924_add_document_signing_order.sql`
Added the following fields to `executive_documents`:
- `signing_stage` (INTEGER): Document signing stage (1=Pre-Inc, 2=Appointment, 3=Employment, 4=Archival)
- `signing_order` (INTEGER): Order within stage
- `required_signers` (TEXT[]): Array of signer types required
- `signer_roles` (JSONB): Track which roles have signed
- `depends_on_document_id` (UUID): Previous document that must be signed first
- `stage_completed` (BOOLEAN): Whether the stage is complete
- `packet_id` (TEXT): Packet identifier (e.g., 'P1_PREINC', 'P2_BOARD')
- `template_key` (TEXT): Maps to document_templates.template_key

## New Files Created

### 1. Type Definitions (`src/types/signing.ts`)
- `Role`: Type for executive roles (INCORPORATOR, BOARD, CEO, etc.)
- `Person`: Executive person data structure
- `Company`: Company data structure
- `TemplateRef`: Template reference structure
- `SignatureSlot`: Signature requirement structure
- `RoutedDocument`: Document routing structure
- `Packet`: Document packet structure
- `FlowOutput`: Complete flow output structure

### 2. Flow Engine (`src/utils/documentSigningFlow.ts`)
The `buildExecutiveFlow()` function creates a structured document signing flow with 4 packets:
- **Packet 1 (P1_PREINC)**: Pre-Incorporation Setup
  - Pre-Incorporation Consent of Incorporators
  - Incorporator Statement
- **Packet 2 (P2_BOARD)**: Appointment & Authority
  - Board Consent to Appointment of Officers
- **Packet 3 (P3_OFFICER_CORE)**: Employment & Compensation
  - Officer Acceptance Letter (per officer)
  - Confidentiality & IP Assignment (per officer)
  - Executive Employment Agreement (per officer)
- **Packet 4 (P4_EQUITY)**: Equity & Compensation
  - Equity / Share Grant Agreement (per equity holder)
  - Stock Option Grant (per option holder)
  - Deferred Compensation & Vesting Schedule (per officer with deferred salary)

### 3. Executive Data Converter (`src/utils/convertExecutivesToFlow.ts`)
- `convertExecutiveToPerson()`: Converts `ExecutiveData` to `Person` format
- `getCompanyData()`: Fetches company settings for document generation
- `getAllExecutivesAsPeople()`: Gets all executives in Person format

### 4. Template Seeder (`src/utils/seedNewDocumentTemplates.ts`)
Utility function to seed new document templates:
- `incorporator_statement`: Action by Sole Incorporator template
- `board_organizational_consent`: Board Organizational Consent template

### 5. HTML Templates (`legal/templates/`)
- `incorporator-statement.html`: Incorporator Statement template
- `board-organizational-consent.html`: Board Organizational Consent template

## Updated Files

### 1. Executive Document Portal (`src/pages/ExecutiveDocumentPortal.tsx`)
**Enhancements:**
- Documents are now sorted by `signing_stage`, then `signing_order`
- Dependency checking: Documents with `depends_on_document_id` cannot be signed until the dependency is signed
- Visual indicators:
  - Progress bar showing signing completion percentage
  - Stage tags (Stage 1, Stage 2, etc.)
  - Packet ID tags (P1_PREINC, P2_BOARD, etc.)
  - Lock icon and warning alert for documents blocked by dependencies
- Disabled "Sign Document" button for documents with unmet dependencies
- Alert messages showing which documents must be signed first

### 2. Database Migration
The migration adds indexes for performance:
- `idx_exec_docs_signing_stage_order`: Composite index on (signing_stage, signing_order)
- `idx_exec_docs_depends_on`: Index on depends_on_document_id
- `idx_exec_docs_packet_id`: Index on packet_id
- `idx_exec_docs_template_key`: Index on template_key

## Template Mappings

The flow engine maps document types to existing templates:

| Document Type | Template Key | Usage Context |
|--------------|--------------|---------------|
| Pre-Incorporation Consent | `pre_incorporation_consent` | `pre_incorporation_consent` |
| Incorporator Statement | `incorporator_statement` | `incorporator_statement` |
| Board Appointment | `board_resolution` | `board_consent_appointment` |
| Officer Acceptance | `offer_letter` | `officer_acceptance` |
| Employment Agreement | `employment_agreement` | `employment_agreement` |
| NDA/PIIA | `confidentiality_ip` | `confidentiality_ip` |
| Stock Purchase | `stock_issuance` | `stock_issuance` |
| Option Grant | `stock_issuance` | `stock_option_grant` |
| Deferred Comp | `deferred_comp_addendum` | `deferred_comp_addendum` |

## Usage

### 1. Run the Migration
```bash
supabase db push
```

### 2. Seed New Templates (Optional)
```typescript
import { seedNewDocumentTemplates } from '@/utils/seedNewDocumentTemplates';
await seedNewDocumentTemplates();
```

### 3. Generate Documents Using Flow Engine
```typescript
import { buildExecutiveFlow } from '@/utils/documentSigningFlow';
import { getAllExecutivesAsPeople, getCompanyData } from '@/utils/convertExecutivesToFlow';

const company = await getCompanyData();
const people = await getAllExecutivesAsPeople();
const flow = buildExecutiveFlow(company, people);

// flow.packets contains all documents organized by stage
// Each packet has documents with signers, dependencies, and data bindings
```

### 4. Create Documents in Database
When generating documents, set the new fields:
```typescript
await supabase.from('executive_documents').insert({
  // ... existing fields ...
  signing_stage: 1,
  signing_order: 1,
  packet_id: 'P1_PREINC',
  template_key: 'pre_incorporation_consent',
  depends_on_document_id: null, // First document has no dependency
  required_signers: ['incorporator'],
  signer_roles: { incorporator: false },
});
```

## Next Steps

1. **Update Document Generation**: Modify `GenerateOfficerDocuments.tsx` to use the flow engine and set the new signing order fields when creating documents.

2. **Test the Flow**: 
   - Create documents with dependencies
   - Verify that documents cannot be signed until dependencies are met
   - Test the progress tracking

3. **Add More Templates**: If additional templates are needed, add them to `legal/templates/` and update the template seeder.

## Notes

- The flow engine uses Handlebars-style templates (`{{variable}}` syntax)
- All templates must be registered in the `document_templates` table
- The portal automatically enforces signing order based on `depends_on_document_id`
- Documents are grouped by stage for better organization
- Progress is calculated as (signed documents / total documents) × 100

