# Crave'n Inc. Company Portal - Complete Export
**For Claude.ai Design Consultation**

## Project Context
- **Company**: Crave'n Inc. (last-mile delivery & logistics platform)
- **Tech Stack**: React + TypeScript + Vite + Mantine UI + Supabase
- **Purpose**: Internal company portal for governance, executives, cap table, and operations

---

## Portal Structure

### Main Entry Point
**File**: `src/portals/company/CompanyPortalLayout.tsx`

### Current Pages & Routes

1. **Dashboard** - `/company`
2. **Governance Admin** - `/company/governance-admin` (Cap table, equity, resolutions)
3. **Board Portal** - `/company/board` (Board members, meetings, voting)
4. **Voting** - `/company/voting` (Resolution voting)
5. **Executives** - `/company/executives` (Executive management)
6. **Leadership** - `/company/leadership-public` (Public leadership page)
7. **Template Manager** - `/company/leadership/templates`
8. **SOP Documents** - `/company/sop` (Standard operating procedures)

---

## Current Users & Roles

### Executives (stored in `exec_users` table)
- **Torrance Stroman** - Founder & CEO
- **Justin Sweet** - CFO

### Shareholding Structure (stored in `cap_tables` + `equity_ledger`)
- **Invero, Inc.** (Holding Company) - 40,600,000 shares (58%) @ $0.00
- **Torrance Stroman** (Founder) - 10,500,000 shares (15%) @ $0.00
- **Justin Sweet** (Executive/CFO) - 4,200,000 shares (6%) @ $2.00
- **Equity Pool** - 14,700,000 shares (21%) reserved
- **Total Authorized** - 70,000,000 shares @ $0.001 par value

---

## Key Components That Need Design Improvements

### 1. Cap Table Overview (`CapTableOverview.tsx`)
**Current Issues**:
- Functional but basic design
- Could use better data visualization
- Needs clearer hierarchy
- Strike price display could be more prominent

**Current Features**:
- Shows authorized/issued/unissued shares
- Displays shareholders with percentages
- Progress bars for visual representation
- Strike price per shareholder

---

### 2. Governance Admin Dashboard (`GovernanceAdminDashboard.tsx`)
**Current Issues**:
- Too much information on one page
- Could use better organization
- Needs modern card-based layout

**Current Features**:
- Executive appointments
- Equity grants list
- Exit workflow management
- Resolution management

---

### 3. Company Shell/Sidebar (`CompanyShell.tsx` + `CompanySidebar.tsx`)
**Current Issues**:
- Basic navigation
- Could use better visual hierarchy
- Role-based access control works but UI needs polish

**Current Features**:
- Role-based navigation
- Dynamic menu based on permissions
- Collapsible sidebar

---

## Design Requirements

### Brand Guidelines
- **Primary Color**: #3b82f6 (blue)
- **Secondary Colors**: 
  - Green: #10b981 (success/issued)
  - Yellow: #eab308 (warning/unissued)
  - Orange: #f97316 (pool/reserved)
  - Purple: #8b5cf6 (executives)
- **Typography**: Modern, clean, professional
- **Style**: Fortune 500 / enterprise-grade

### User Experience Goals
1. **Clean & Modern** - Remove clutter, embrace whitespace
2. **Data-Driven** - Clear visualization of cap table, equity, governance
3. **Executive-Friendly** - Easy for C-level to understand at a glance
4. **Mobile Responsive** - Works on tablet/mobile for board meetings
5. **Fast Loading** - Optimized performance

### Key Metrics to Display Prominently
- Total Authorized Shares: 70,000,000
- Total Issued: ~55,300,000
- Equity Pool Available: 14,700,000
- Executive Count: 2 active
- Holding Company Ownership: 58%

---

## Database Schema (Key Tables)

### `cap_tables`
```sql
- total_authorized: 70000000
- total_issued: 55300000
- total_unissued: 14700000
- holding_company_shares: 40600000
- holding_company_percentage: 58.00
- founder_shares: 10500000
- founder_percentage: 15.00
- equity_pool: 14700000
- pool_percentage: 21.00
- par_value: 0.001
```

### `equity_ledger` (Executive equity ONLY)
```sql
- recipient_user_id: UUID
- shares_amount: BIGINT
- price_per_share: NUMERIC (strike price)
- transaction_type: 'grant'
- transaction_date: TIMESTAMPTZ
```

### `exec_users` (All executives)
```sql
- user_id: UUID
- name: TEXT
- title: TEXT
- role: TEXT (ceo, cfo, cto, etc.)
- email: TEXT
```

### `employee_equity` (Founders + Holding Company)
```sql
- shareholder_name: TEXT
- shareholder_type: TEXT (entity, founder)
- shares_total: BIGINT
- shares_percentage: NUMERIC
- strike_price: NUMERIC
- is_majority_shareholder: BOOLEAN
```

---

## Current File Structure

```
src/portals/company/
├── CompanyPortalLayout.tsx          # Main layout
├── components/
│   ├── CompanyShell.tsx             # Shell with sidebar
│   ├── CompanySidebar.tsx           # Navigation sidebar
│   └── ...
├── governance-admin/
│   ├── CapTableOverview.tsx         # ⭐ Cap table display
│   ├── GovernanceAdminDashboard.tsx # ⭐ Main governance page
│   ├── EquityGrantsList.tsx         # Equity grants management
│   ├── AppointmentList.tsx          # Executive appointments
│   ├── ResolutionList.tsx           # Board resolutions
│   └── ...
├── board/
│   └── BoardPortalDashboard.tsx     # Board member portal
├── executives/
│   └── ExecutiveDashboard.tsx       # Executive management
└── ...
```

---

## Pain Points (What Needs Improvement)

### 1. **Cap Table Page**
- Current: Basic table with progress bars
- Desired: Beautiful, investor-grade cap table visualization
- Needs: Charts, graphs, visual hierarchy, drill-down capability

### 2. **Dashboard**
- Current: List-based, text-heavy
- Desired: Card-based, metric-focused, scannable
- Needs: KPI cards, recent activity, quick actions

### 3. **Navigation**
- Current: Standard sidebar
- Desired: Modern, contextual, role-aware
- Needs: Better icons, grouping, visual feedback

### 4. **Mobile Experience**
- Current: Works but cramped
- Desired: Touch-optimized, readable on tablets
- Needs: Responsive design, mobile-first components

### 5. **Data Visualization**
- Current: Progress bars only
- Desired: Charts, graphs, interactive elements
- Needs: Pie charts for ownership, line charts for equity history

---

## What Works Well (Keep These)

✅ **Role-based Access Control** - Solid security model
✅ **Data Architecture** - Clean separation (equity_ledger for executives, cap_tables for summary)
✅ **TypeScript** - Type safety throughout
✅ **Supabase Integration** - Real-time, reliable
✅ **Mantine UI Components** - Professional, consistent

---

## Specific Design Requests

### Cap Table Page Redesign
1. **Hero Section**: Large numbers with context
2. **Ownership Pie Chart**: Visual breakdown of shareholders
3. **Shareholder Cards**: Each shareholder as a card with details
4. **Timeline View**: Option to see equity changes over time
5. **Export Options**: PDF, CSV for board meetings

### Dashboard Redesign
1. **KPI Cards**: Key metrics in hero cards
2. **Recent Activity Feed**: Latest equity grants, appointments
3. **Quick Actions**: Common tasks as buttons
4. **Alerts**: Important items needing attention
5. **Executive Directory**: Photo cards of active executives

### Navigation Redesign
1. **Grouped Sections**: Governance, Operations, Reports
2. **Icons**: Modern, consistent iconography
3. **Breadcrumbs**: Clear location awareness
4. **Search**: Global search across portal
5. **User Menu**: Profile, settings, logout

---

## Technical Constraints

- **Must use Mantine UI components** (already installed)
- **Must work with existing Supabase schema** (can't change DB easily)
- **Must maintain TypeScript** (type safety required)
- **Must support role-based access** (security critical)
- **Must be responsive** (mobile/tablet support)

---

## Files to Focus On for Redesign

### High Priority
1. `src/portals/company/governance-admin/CapTableOverview.tsx` - 430 lines
2. `src/portals/company/governance-admin/GovernanceAdminDashboard.tsx` - ~800 lines
3. `src/portals/company/components/CompanySidebar.tsx` - Navigation
4. `src/portals/company/CompanyPortalLayout.tsx` - Overall layout

### Medium Priority
5. `src/portals/company/board/BoardPortalDashboard.tsx` - Board view
6. `src/portals/company/executives/ExecutiveDashboard.tsx` - Executive management
7. Executive profile cards/directory
8. Dashboard home page

---

## Success Criteria

The redesigned portal should:
1. ✅ **Impress investors** - Looks professional, Fortune 500-grade
2. ✅ **Be intuitive** - CEO can navigate without training
3. ✅ **Load fast** - < 2 seconds to interactive
4. ✅ **Be mobile-friendly** - Usable on iPad during board meetings
5. ✅ **Show data clearly** - Cap table understandable at a glance
6. ✅ **Be maintainable** - Clean code, easy to update

---

## Next Steps for Claude.ai

Please provide:
1. **Wireframes/Mockups** for key pages (Cap Table, Dashboard, Navigation)
2. **Component Structure** recommendations
3. **Design System** (colors, typography, spacing, components)
4. **Code Examples** for key components (Cap Table visualization, KPI cards, etc.)
5. **Mantine UI Component Usage** - specific components to use
6. **Responsive Breakpoints** - mobile/tablet/desktop layouts

---

## Additional Context

- Company is venture-backed, needs investor-ready presentation
- Portal used by CEO (Torrance) and CFO (Justin) primarily
- May add more executives soon
- Board meetings reference this portal
- Cap table is critical - must be accurate and clear
- Security is paramount - role-based access must stay

---

## Current Screenshots Location

The portal is running at: `http://localhost:8080/company`

Key pages:
- Cap Table: `/company/governance-admin` (scroll to "Capitalization Table")
- Dashboard: `/company/governance-admin`
- Equity: `/company/governance-admin` (Equity Grants section)

---

**Thank you for helping redesign this portal to be more professional and user-friendly!**

