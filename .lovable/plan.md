

# Executive Guided Tour — First-Login Walkthrough

## Overview
When an executive lands on the Executive Dashboard for the first time, a multi-step guided tour modal walks them through each section. The tour is shown once — dismissed either by completing it or clicking "Don't show again." The dismissal state is persisted in the `exec_users.metadata` JSONB field so it follows the user across devices.

## Tour Steps (5 steps)
1. **Welcome** — "Welcome to your Executive Dashboard" with a brief overview of what's available
2. **My Appointment** — Explains their appointment details, status, and role
3. **Onboarding Packet** — Highlights documents to review and sign
4. **Documents & Vault** — Where to find and manage their corporate documents
5. **Equity & Vesting** — Overview of equity grants and vesting schedule

## Persistence Logic
- On dashboard load, query `exec_users.metadata` for `guided_tour_completed: true`
- If `true` → skip tour entirely
- If missing/false → show tour modal
- On "Complete Tour" (final step) or "Don't show me this again" → update `exec_users.metadata` to set `guided_tour_completed: true`

## Files to Create/Modify

### New file: `src/portals/company/executives/ExecutiveGuidedTour.tsx`
- Multi-step modal using Mantine `Modal` + `Stepper` components
- Each step has an icon, title, and description
- Footer has Back/Next/Finish buttons + "Don't show me this again" checkbox or link
- On finish or dismiss-permanently: calls Supabase to update `exec_users.metadata`
- Props: `opened`, `onClose` (called after persisting)

### Modified: `src/portals/company/executives/ExecutiveDashboard.tsx`
- On mount, after fetching exec user, check `metadata.guided_tour_completed`
- If not completed, set `showTour = true`
- Render `<ExecutiveGuidedTour opened={showTour} onClose={() => setShowTour(false)} />`

### No database migration needed
- `exec_users.metadata` is already a JSONB column — we just add a `guided_tour_completed` key to it

## Technical Details
- The tour state check happens in the same `fetchStats` flow that already queries `exec_users`
- The metadata update uses a JSONB merge: `metadata = metadata || '{"guided_tour_completed": true}'` via the Supabase client's `.update()` with spread of existing metadata
- The "Don't show again" button and the "Finish" button both trigger the same persist logic, then close the modal

