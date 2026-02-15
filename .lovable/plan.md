

## Earnings Dashboard Enhancements

### What Changes

**1. Add "Overall" tab to the time range selector**
- Add `'overall'` to the `TimeRange` type (currently: `'today' | 'thisWeek' | 'lastWeek' | 'custom'`)
- Add an "Overall" button to the tab bar alongside Today, This Week, Last Week
- For "Overall", the date range query will use no date filter (fetches all earnings for the driver)

**2. Add "Sent to Feeder Card" amount in the Your Earnings card**
- Below the earnings dollar amount, add an orange line showing "Sent to Feeder Card: $X.XX"
- This value represents the total amount that has been transferred to the Feeder Card for the selected time period
- Sourced from the `driver_payouts` table (completed/sent status payouts within the date range)

**3. Business logic clarification (per your description)**
- After each delivery, earnings instantly go to the Feeder Card minus the gas money portion
- Gas money accumulates separately (like a savings account) and only transfers to the Feeder Card when the feeder requests it
- The "Sent to Feeder Card" amount will grow to match total earnings for each period as payouts complete

---

### Technical Details

**File: `src/components/mobile/EarningsDashboard.tsx`**

1. **Update `TimeRange` type** (line 15):
   - Change from `'today' | 'thisWeek' | 'lastWeek' | 'custom'` to `'today' | 'thisWeek' | 'lastWeek' | 'overall' | 'custom'`

2. **Update `getDateRange()` function** (line 465-483):
   - Add `'overall'` case that returns a very early start date (e.g., `new Date(2020, 0, 1)`) and tomorrow as end, effectively capturing all records

3. **Update time range tab bar** (lines 768-782):
   - Change the array from `['today', 'thisWeek', 'lastWeek']` to `['today', 'thisWeek', 'lastWeek', 'overall']`
   - Add label mapping for `'overall'` -> `'Overall'`

4. **Add state for "Sent to Feeder Card"**:
   - New state: `const [sentToFeederCard, setSentToFeederCard] = useState(0);`

5. **Update `fetchEarningsData()`** (around line 558-586):
   - Query `driver_payouts` with the same date range filter to get completed payouts within the selected period
   - Sum completed/sent payouts for the period and store in `sentToFeederCard`

6. **Update the Your Earnings card UI** (lines 1019-1027):
   - Below the existing earnings amount and "Available to cash out" text, add an orange text line:
   - `Sent to Feeder Card: $XXX.XX` styled with `text-orange-500` font

