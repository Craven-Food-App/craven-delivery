# SOP: Prospect Queue Operations (CEO to CPO)

**Document ID:** SOP-COMMERCIAL-ProspectQueue-001  
**Version:** 1.0  
**Effective Date:** 2026-04-23  
**Owner:** Executive Operations (CEO) and Partnerships Operations (CPO)

## Purpose

Define the standard operating procedure for sourcing, prioritizing, assigning, executing, and converting merchant prospects from CEO-led intake to CPO pipeline conversion.

This SOP ensures:
- Consistent prospect quality and outreach cadence
- Reliable CEO-to-CPO handoff
- Full auditability of actions and outcomes
- Deterministic conversion into partnerships pipeline

## Scope

Applies to Prospect Queue workflow implemented in:
- `src/components/ceo/ProspectQueue.tsx`
- `supabase/migrations/20260421010000_ceo_merchant_prospect_queue.sql`

Covers:
- Prospect intake (import/manual)
- Prioritization and assignment
- Outreach and follow-up logging
- Push to CPO queue
- CPO acceptance and conversion

## Roles and Responsibilities

- **CEO / Executive Operator**
  - Imports and prepares prospects
  - Prioritizes and assigns ownership
  - Pushes execution-ready targets to CPO queue

- **CPO / Partnerships Operator**
  - Accepts pushed prospects
  - Executes outreach workflow
  - Converts qualified opportunities to pipeline

- **System**
  - Enforces constraints and permission checks
  - Logs activities and timestamps
  - Applies row-level security (RLS)

## System and Data Foundations

### Core table: `merchant_prospects`

Key operational fields:
- `business_name` (required)
- `phone`, `email`, `address_line1`, `city`, `state`, `postal_code`
- `category`, `source`
- `status`: `new|attempted|contacted|qualified|won|lost|do_not_call`
- `priority`: integer range `1..5`
- `delivery_state`: `draft|pushed_to_cpo|accepted_by_cpo|returned|archived`
- `next_call_at`, `last_contact_at`
- `owner_user_id`, `assigned_by_user_id`
- `notes`, `pipeline_partnership_id`

### Activity log: `merchant_prospect_activities`

Tracks all actions with actor and timestamp:
- `activity_type`
- `outcome`
- `note`
- `follow_up_at`
- `created_at`

### Import telemetry: `merchant_prospect_import_batches`

Tracks import runs and outcomes:
- Source metadata
- Total/imported/rejected rows
- Batch status and completion time

## End-to-End Workflow

1. **Intake (CEO)**
   - Prospect is added via import or manual creation.
   - `source` must be one of: `manual`, `import`, `referral`.
   - New prospects typically begin with:
     - `status='new'`
     - `delivery_state='draft'`

2. **Prioritization (CEO)**
   - Priority is set on 1-5 scale (5 highest urgency/value).
   - Queue ordering favors:
     - Overdue follow-ups first
     - Earliest `next_call_at`
     - Higher priority
     - Oldest records as tie-breaker

3. **Outreach and Logging (CEO or CPO)**
   - Use call actions to log outcomes (`no_answer`, `voicemail`, `connected`, etc.).
   - Save notes and follow-up times.
   - System function `log_merchant_prospect_activity`:
     - Creates audit log entry
     - Updates `last_contact_at` for call actions
     - Updates `next_call_at` when follow-up is provided
     - Updates `status` when specified

4. **CEO Push to CPO**
   - CEO executes push action for execution-ready targets.
   - `push_merchant_prospect_to_cpo`:
     - Sets `delivery_state='pushed_to_cpo'`
     - Stamps push metadata (`pushed_at`, `pushed_by_user_id`)
     - Optionally updates owner assignment
     - Logs assignment activity

5. **CPO Acceptance**
   - CPO accepts pushed item using `accept_merchant_prospect`.
   - System sets:
     - `delivery_state='accepted_by_cpo'`
     - `accepted_at`, `accepted_by_user_id`
   - Activity is logged for audit trail.

6. **Conversion to Pipeline**
   - CPO uses conversion action once qualified.
   - `convert_prospect_to_partnership`:
     - Creates `partnerships` record
     - Creates `partnership_contacts` when contact info exists
     - Writes `pipeline_partnership_id` back to prospect
     - Ensures status progression consistency
     - Logs conversion metadata

## CEO Operating Procedure

1. Open Prospect Queue in CEO mode.
2. Import or add prospects with valid constraints (`source`, `priority`).
3. Validate essential details (business name, contact path, notes).
4. Set owner when assigning to a specific rep.
5. Work queue via search/filter and "Load Next Call".
6. Log each attempt and always set follow-up for non-terminal outcomes.
7. Push only qualified execution-ready prospects to CPO queue.

## CPO Operating Procedure

1. Open Prospect Queue in CPO mode.
2. Review pushed queue items.
3. Accept each target before active execution.
4. Run call workflow and log every interaction.
5. Convert qualified opportunities into pipeline.
6. Mark terminal outcomes (`won`, `lost`, `do_not_call`) as appropriate.

## Status and Delivery State Semantics

- **`status`** = commercial/contact progression outcome
- **`delivery_state`** = handoff/ownership stage between CEO and CPO

These two dimensions are related but distinct and must both be maintained correctly.

## Controls and Compliance

- Every operational step must be activity-logged.
- No out-of-band state mutation outside approved procedures/migrations.
- RLS policies enforce visibility and mutation rules by role/ownership.
- Push action is restricted to executive permission scope.

## SLA and KPI Recommendations

- First touch SLA: initial attempt within 24 hours of intake
- Follow-up SLA: action by scheduled `next_call_at`
- Push throughput: % reviewed prospects pushed to CPO
- Acceptance lag: time from pushed to accepted
- Conversion rate: pushed to pipeline
- Data hygiene: completeness of contact + notes

## Exception Handling

- Invalid `source` -> use `manual`, `import`, or `referral`
- Invalid `priority` -> remap to integer `1..5`
- Missing state fields in UI -> render safe fallback text
- Duplicate conversion attempts -> return existing partnership reference if present

## Change Management

Any changes to queue states, transitions, permissions, or conversion behavior must include:
- Schema/function migration
- QA verification
- SOP revision and version increment

