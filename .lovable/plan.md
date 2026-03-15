

# CPO Portal Enhancements — Renewal Alerts, Export, and KPI Tracking

## 1. Renewal Alerts & Calendar Tab
**New tab: "Calendar"** in CPOPortal showing:
- Monthly calendar view of contract expirations (from `partnership_documents.expires_at`) and partnership contract end dates (`partnerships.contract_end_date`)
- Color-coded: red for expiring within 7 days, orange for 30 days, green for future
- Alert banner on Dashboard showing count of contracts expiring in the next 7/30 days with partner names
- Click a calendar date to see details of what's expiring

**New file:** `src/portals/cpo/tabs/RenewalCalendar.tsx`
**Modified:** `CPOPortal.tsx` (add tab), `CPODashboard.tsx` (add alert banner)

## 2. Data Export (CSV + PDF)
Add export buttons to Pipeline, Contracts, Analytics, and Directory tabs:
- **CSV**: Client-side generation using native JS (Blob + download). Exports table data as CSV.
- **PDF**: Client-side generation using `window.print()` with a styled print view, or a lightweight approach generating a printable HTML summary in a new window.

No new dependencies needed — CSV via Blob, PDF via `window.print()`.

**Modified:** `PartnerPipeline.tsx`, `ContractManagement.tsx`, `PartnershipAnalytics.tsx`, `PartnerDirectory.tsx` — add export buttons to each

## 3. Partner KPI Scorecards

**New database table:** `partnership_kpis`
- `id`, `partnership_id` (FK), `kpi_name` (text), `target_value` (numeric), `actual_value` (numeric), `unit` (text — e.g., "%", "$", "orders"), `period` (text — e.g., "2026-Q1"), `updated_at`
- RLS: authenticated can CRUD

**New tab: "Scorecards"** in CPOPortal showing:
- Select a partner → see their KPIs in a table with target vs actual, progress bars, and status (on-track/behind/exceeded)
- Add/edit KPI targets per partner (name, target, actual, unit, period)
- Overview mode: grid of all partners with their top-level KPI health summary

**New file:** `src/portals/cpo/tabs/PartnerScorecards.tsx`
**Modified:** `CPOPortal.tsx` (add tab)

## Database Migration
```sql
CREATE TABLE partnership_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES partnerships(id) ON DELETE CASCADE NOT NULL,
  kpi_name TEXT NOT NULL,
  target_value NUMERIC DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '',
  period TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partnership_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage partnership_kpis"
  ON partnership_kpis FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

## Summary of Changes

| Change | Files |
|--------|-------|
| Renewal Calendar tab | New: `RenewalCalendar.tsx`, Edit: `CPOPortal.tsx`, `CPODashboard.tsx` |
| CSV/PDF Export | Edit: `PartnerPipeline.tsx`, `ContractManagement.tsx`, `PartnershipAnalytics.tsx`, `PartnerDirectory.tsx` |
| KPI Scorecards tab | New: `PartnerScorecards.tsx`, Edit: `CPOPortal.tsx`, Migration for `partnership_kpis` |

Total: 2 new files, 6 modified files, 1 migration.

