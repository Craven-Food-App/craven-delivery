# TPI Admin UI/UX Design System

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Active Standard

---

## 1. UX Principles

### Enterprise-Grade Core Values

**Clarity**
- Every interface element must have a clear purpose
- Information hierarchy must be immediately apparent
- No ambiguous states or actions
- Labels and microcopy must be precise and unambiguous

**Consistency**
- Identical patterns behave identically across all portals
- Component usage follows strict conventions
- Visual language remains uniform (spacing, typography, colors)
- Navigation patterns are predictable

**Speed**
- Critical actions complete in < 2 seconds
- Non-critical actions provide immediate feedback
- Data-heavy views use progressive loading
- Keyboard shortcuts for power users

**Visibility**
- System state is always apparent
- Changes are immediately reflected
- Audit trails are accessible
- Status indicators are unambiguous

**Auditability**
- Every data modification is traceable
- Change history is accessible within 2 clicks
- User actions are logged with context
- Export capabilities for compliance

---

## 2. Information Architecture

### Portal Structure

Each TPI portal follows this hierarchy:

```
Portal Root
├── Dashboard (landing page)
├── Primary Sections (3-7 main areas)
│   ├── Sub-pages (detail views)
│   │   ├── Detail tabs (Overview, Activity, Audit)
│   │   └── Actions (Edit, Delete, Export)
│   └── Management views (tables, kanban, lists)
└── Settings (portal-specific configuration)
```

### Portal Mapping

**Technology Executive Dashboard** (`/cto`)
- CTO Command Center (Dashboard)
- Advanced Infrastructure
- DevOps & CI/CD
- Security & Compliance
- Team & Resources
- Technology Roadmap
- Tech Cost Management
- Incidents
- Assets

**Engineering Workspace** (planned)
- Sprint Management
- Code Reviews
- Developer Onboarding
- Team Collaboration

**Platform & Infrastructure Hub** (planned)
- Service Health
- Deployment Pipeline
- Infrastructure Monitoring
- Incident Response

**Product Command Center** (planned)
- Feature Tracking
- Roadmap Planning
- Product Analytics

**Quality & Release Portal** (planned)
- Release Management
- QA Workflows
- Testing Coordination

**Internal IT Operations** (planned)
- IT Help Desk
- Asset Management
- Internal Tooling

### Global Navigation Elements

**Sidebar Navigation**
- Grouped by functional area
- Collapsible sections for >5 items
- Permission-gated visibility
- Active state: left border + background highlight
- Icons: 20x20px, consistent style

**Top Bar**
- Global search (Cmd/Ctrl+K)
- Quick actions menu
- Notifications bell
- User menu (avatar + dropdown)
- Portal switcher (if multi-portal access)

**Breadcrumbs**
- Always visible on sub-pages
- Clickable path to parent pages
- Current page: non-clickable, bold
- Format: `Portal > Section > Sub-page > Current`

**Global Search**
- Trigger: Cmd/Ctrl+K or search icon
- Scope: Current portal + cross-portal (if permitted)
- Results: Pages, entities, actions
- Keyboard navigation: Arrow keys, Enter to select

---

## 3. Global Layout

### AppShell Structure

```
┌─────────────────────────────────────────────────────────┐
│ TopBar (64px height)                                     │
│ [Logo] [Search] [Actions] [Notifications] [User]        │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ SideNav  │  Content Area (max-width: 1400px, centered) │
│ (240px)  │                                               │
│          │  ┌─────────────────────────────────────┐   │
│          │  │ Page Header (title + actions)        │   │
│          │  ├─────────────────────────────────────┤   │
│          │  │ Breadcrumbs                          │   │
│          │  ├─────────────────────────────────────┤   │
│          │  │ Main Content                         │   │
│          │  │                                      │   │
│          │  └─────────────────────────────────────┘   │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

### Layout Rules

**Content Width**
- Max-width: 1400px (desktop)
- Centered with equal side margins
- Responsive breakpoints:
  - Desktop: ≥1280px (full layout)
  - Tablet: 768px-1279px (collapsed sidebar)
  - Mobile: <768px (drawer sidebar)

**Spacing Scale**
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Component padding: 12px (compact), 16px (standard), 24px (spacious)
- Section gaps: 24px (standard), 32px (major sections)

**Sidebar Width**
- Expanded: 240px
- Collapsed: 64px (icons only)
- Transition: 200ms ease-in-out

**Top Bar Height**
- Fixed: 64px
- Sticky on scroll (if content area scrolls)

---

## 4. Navigation Standards

### Sidebar Grouping

**Group Structure**
```
Section Name (collapsible header)
  ├── Item 1
  ├── Item 2
  └── Sub-section (nested, max 1 level)
      ├── Sub-item 1
      └── Sub-item 2
```

**Grouping Rules**
- Max 7 items per group (before splitting)
- Related functionality grouped together
- Frequency-based ordering (most-used first)
- Separator lines between major groups

**Active State**
- Background: `bg-primary/10` (10% opacity primary color)
- Left border: 3px solid primary color
- Text: Primary color, font-weight: 600
- Icon: Primary color

**Permission-Gated Navigation**
- Hidden items: Not rendered (not just disabled)
- Partial access: Visible but shows "Limited Access" badge
- Role-based: Dynamic sidebar based on user role
- Audit: Navigation access attempts logged

---

## 5. Interaction Standards

### Drawer vs Full Page

**Use Drawer When:**
- Viewing detail of a list item
- Quick edit forms (< 5 fields)
- Contextual actions (filter, sort options)
- Secondary information (comments, notes)

**Use Full Page When:**
- Primary workflow (create, major edit)
- Complex forms (> 5 fields, multi-step)
- Primary content (dashboard, main table)
- Settings pages

### Modal Usage Rules

**Standard Modal**
- Max width: 600px
- Use for: Confirmations, simple forms, alerts
- Backdrop: 50% opacity, clickable to dismiss (if non-destructive)

**Large Modal**
- Max width: 900px
- Use for: Complex forms, multi-step wizards
- Backdrop: Not dismissible

**Full-Screen Modal**
- 100% viewport
- Use for: Critical workflows, onboarding
- Close: Explicit "Cancel" or "X" button only

### Inline Editing Rules

**Single Field Edit**
- Click field → Inline input appears
- Save: Enter key or blur
- Cancel: Escape key
- Visual: Subtle border highlight during edit

**Multi-Field Edit**
- Click "Edit" button → Form mode
- Save: Explicit "Save" button
- Cancel: "Cancel" button (discards changes)
- Unsaved changes: Warning on navigation

### Confirmation & Destructive Actions

**Standard Confirmation**
- Modal with clear action description
- Button: "Confirm" (primary) + "Cancel" (secondary)
- Format: "Are you sure you want to [action] [entity]?"

**Destructive Actions**
- Red "Delete" button (not primary color)
- Two-step confirmation for critical actions:
  1. Click delete → Confirmation modal
  2. Type entity name or "DELETE" to confirm
- Audit: All destructive actions logged with reason

---

## 6. State Standards

### Loading States

**Skeleton Loaders**
- Match content structure (cards, tables, lists)
- Animated shimmer effect
- Duration: 200-800ms per skeleton block
- Use for: Initial page load, data refresh

**Spinner States**
- Centered spinner for full-page loads
- Inline spinner for section updates
- Size: 24px (inline), 40px (centered)
- Color: Primary color

**Progressive Loading**
- Load critical data first (KPIs, main table)
- Load secondary data after (charts, activity feed)
- Show partial content immediately

### Empty States

**Empty State Components**
- Icon: 64px, muted color
- Title: "No [entities] found"
- Description: Contextual help text
- Action: Primary CTA button (if applicable)
- Illustration: Optional, brand-appropriate

**Empty State Variants**
- No data: "Get started by creating your first [entity]"
- Filtered empty: "No results match your filters. Try adjusting your search."
- Permission empty: "You don't have access to view [entities]. Contact your administrator."

### Error States

**Error Display Rules**
- Inline errors: Red text below field, icon prefix
- Form errors: Summary at top + inline field errors
- Page errors: Centered card with error icon
- Network errors: Retry button + error message
- 404 errors: "Page not found" with navigation help

**Error Message Format**
- User-friendly language (no stack traces)
- Actionable guidance ("Check your connection and try again")
- Error code: Shown in collapsed details (for support)

### Offline/Timeout States

**Offline Detection**
- Banner at top: "You're offline. Some features may be unavailable."
- Disable write actions
- Queue actions for sync when online

**Timeout Handling**
- Request timeout: 30 seconds
- Show: "Request timed out. Please try again."
- Auto-retry: Optional, max 2 retries

---

## 7. Data Display Standards

### Tables

**Column Density**
- Compact: 40px row height, 8px cell padding
- Standard: 48px row height, 12px cell padding
- Spacious: 56px row height, 16px cell padding
- Default: Standard density

**Sorting**
- Clickable column headers
- Sort indicator: Arrow icon (↑↓)
- Multi-sort: Shift+Click for secondary sort
- Default sort: Most recent first (or specified)

**Filtering**
- Filter bar above table
- Active filters: Chips with remove (X)
- Filter types: Text, select, date range, boolean
- "Clear all" button when filters active

**Pagination**
- Items per page: 25 (default), 50, 100
- Page controls: Previous, page numbers, Next
- Total count: "Showing 1-25 of 247"
- Jump to page: Optional input field

**Export**
- Button: Top-right of table
- Formats: CSV (default), PDF (if applicable)
- Scope: Current filtered view
- Filename: `[entity]_[date]_[time].csv`

**Row Actions**
- Click row: Opens DetailDrawer (if enabled)
- Actions menu: Three-dot menu per row
- Bulk actions: Checkbox selection + toolbar

### Badges/Tags Conventions

**Status Badges**
- Color coding:
  - Green: Active, Success, Completed
  - Yellow: Pending, Warning, In Progress
  - Red: Error, Failed, Critical
  - Gray: Inactive, Cancelled, Neutral
- Size: Small (text-xs) for tables, Standard (text-sm) for cards
- Format: Uppercase, 2-3 words max

**Type Badges**
- Neutral color (gray/blue)
- Descriptive labels
- Used for categorization

### Formatting Standards

**Time Formatting**
- Relative: "< 1 min ago", "2 hours ago", "3 days ago"
- Absolute: "Jan 15, 2025 2:30 PM" (for timestamps)
- Date only: "Jan 15, 2025" (for dates)
- Timezone: Display user's local timezone

**Currency Formatting**
- Format: `$1,234.56` (USD)
- Negative: `-$123.45` (red color)
- Zero: `$0.00`
- Large numbers: `$1.2M`, `$45.6K` (if > 10,000)

**Number Formatting**
- Integers: `1,234`
- Decimals: `1,234.56` (2 decimal places)
- Percentages: `45.6%`
- Large numbers: `1.2M`, `45.6K`

---

## 8. Notifications

### Toast Rules

**Toast Types**
- Success: Green, checkmark icon
- Error: Red, X icon
- Warning: Yellow, warning icon
- Info: Blue, info icon

**Toast Behavior**
- Auto-dismiss: 5 seconds (success/info), 10 seconds (error/warning)
- Manual dismiss: X button always available
- Stack: Max 3 toasts visible, newest on top
- Position: Top-right corner

**Toast Content**
- Title: Action result ("Saved successfully")
- Description: Optional, additional context
- Action: Optional button (e.g., "Undo")

### Inline Alerts

**Alert Placement**
- Top of page/section (below header)
- Full-width banner
- Dismissible: X button (if not critical)

**Alert Types**
- Info: Blue background, info icon
- Warning: Yellow background, warning icon
- Error: Red background, error icon
- Success: Green background, checkmark icon

### Incident Banners

**Critical Incident Banner**
- Top of viewport (above all content)
- Red background, white text
- Non-dismissible
- Content: "[Service] is experiencing issues. Estimated resolution: [time]"
- Link: "View status page"

---

## 9. Auditability

### "Last Updated By" Surfaces

**Display Rules**
- Always visible on editable entities
- Format: "Last updated by [Name] on [Date] [Time]"
- Placement: Below entity title or in metadata section
- Clickable: Links to user profile (if permitted)

**Update Tracking**
- Track: User ID, timestamp, field changes (if applicable)
- Display: Inline for recent updates (< 24 hours), in metadata for older

### Change History Patterns

**Change History Access**
- Button: "View History" or "Audit Trail"
- Placement: Top-right of detail view or in metadata section
- Display: Timeline or table format

**Change History Content**
- Fields changed (before/after values)
- Changed by (user name + role)
- Timestamp
- Reason (if provided)
- IP address (for security-sensitive changes)

**Change History Format**
- Timeline: Vertical timeline with dates
- Table: Sortable, filterable table
- Export: CSV/PDF export capability

---

## 10. Security UX

### Permission-Denied Page Pattern

**403 Forbidden Page**
- Icon: Lock icon (64px)
- Title: "Access Denied"
- Description: "You don't have permission to view this page."
- Actions:
  - "Go Back" button
  - "Request Access" button (if applicable)
  - Link to accessible areas

**Partial Access**
- Show accessible content
- Hide restricted sections
- Badge: "Limited Access" on restricted areas
- Tooltip: "Contact administrator for full access"

### Sensitive Data Masking Rules

**Data Masking Patterns**
- SSN: `***-**-1234` (last 4 visible)
- Credit Card: `**** **** **** 1234` (last 4 visible)
- Email: `j***@example.com` (first letter + domain)
- Phone: `(***) ***-1234` (last 4 visible)

**Masking Display**
- Default: Masked
- Reveal: "Show" button (requires permission)
- Audit: Unmasking actions logged
- Auto-mask: After 30 seconds of inactivity

**Permission Levels**
- View: Can see masked data
- Reveal: Can unmask sensitive data
- Full: Can see unmasked data by default

---

## Implementation Notes

### Framework Compatibility

This system is designed to work with:
- **React** (primary)
- **Mantine UI** (component library)
- **Material-UI (MUI)** (alternative)
- **shadcn/ui** (headless components)

### Component Naming

All components follow PascalCase:
- `PortalLayout` (not `portal-layout`)
- `KpiCard` (not `kpi-card`)
- `DataTable` (not `data-table`)

### State Management

- Use React Query for server state
- Use Context API for UI state (modals, drawers)
- Use local state for form inputs

### Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

---

**Next Steps:**
- Review [Component Inventory](./components/COMPONENT_INVENTORY.md)
- Review [Page Templates](./page-templates/PAGE_TEMPLATES.md)
- Review [Pattern Guides](./patterns/)


















































