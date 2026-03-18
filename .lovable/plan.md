

# Fix Executive Onboarding Flow

## Problem Summary

The executive onboarding flow is broken for multiple reasons:

1. **No appointment record exists for Jason Parcell** in `executive_appointments`
2. **The `executive_documents` table is completely empty** — documents exist as URLs on `executive_appointments` columns but were never synced to `executive_documents`
3. **The OnboardingPacket component filters by statuses** (`authorized_to_offer`, `offer_accepted`, etc.) that no appointment currently has — they're all `pending`
4. **Appointment-to-user matching is fragile** — it compares `proposed_title` to `exec_users.role` which doesn't work for all roles (e.g., "Chief Financial Officer" vs "cfo")

## Implementation Plan

### Step 1: Create Jason Parcell's appointment record

Insert an `executive_appointments` row for Jason Parcell with his CPO title, email (`jparcell2022@gmail.com`), and set status to `documents_sent` so the onboarding flow picks it up.

### Step 2: Generate documents for Jason Parcell

Invoke the `governance-generate-appointment-document` edge function for each required document type (appointment_letter, employment_agreement, confidentiality_ip, board_resolution, etc.) using his new appointment ID.

### Step 3: Backfill `executive_documents` from appointment URLs

For both Jason Parcell and Justin Sweet (and Torrance Stroman), create rows in `executive_documents` by reading the URL columns from their `executive_appointments` records. Each row needs:
- `type`, `officer_name`, `role`, `status`, `file_url`
- `appointment_id`, `executive_id` (from `exec_users`)
- `signature_status = 'pending'`
- `signing_stage`, `signing_order`, `packet_id` (from `DOCUMENT_FLOW` mapping)
- `signature_token` + `signature_token_expires_at` for signing access

### Step 4: Update appointment statuses

Change Justin Sweet's and Jason Parcell's appointments from `pending` to `documents_sent` so the OnboardingPacket component can find them.

### Step 5: Fix OnboardingPacket matching logic

Update `src/portals/company/executives/OnboardingPacket.tsx`:
- Add `pending` and `documents_sent` to the status filter (or broaden to include all non-rejected statuses)
- Match appointments by **email** (comparing `proposed_officer_email` against the user's email or the `exec_users.metadata.proposed_officer_email`) instead of fragile role/title matching
- This ensures executives reliably see their own onboarding packets

### Step 6: Ensure Jason has access to the Executive Dashboard

Update Jason's allowed portals in `MainHub.tsx` to include the executive dashboard route, and ensure the Executive Dashboard tab (with Onboarding Packet) is accessible from his Company Portal or directly.

## Technical Details

- **Edge function**: Will create a one-time `seed-executive-onboarding` edge function that handles steps 1-4 (creating appointment, generating docs, backfilling `executive_documents`, updating statuses)
- **Frontend fix**: Modify `OnboardingPacket.tsx` to use email-based matching and broader status filtering
- **Data**: Justin Sweet already has 5+ documents generated (appointment_letter, employment_agreement, confidentiality_ip, board_resolution, deferred_compensation, stock_subscription). Jason needs documents generated first.

