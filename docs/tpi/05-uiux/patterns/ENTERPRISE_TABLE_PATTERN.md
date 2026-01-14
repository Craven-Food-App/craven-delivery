# Enterprise Table Pattern

**Version:** 1.0  
**Component:** DataTable  
**Last Updated:** 2025-01-XX

---

## Overview

The Enterprise Table Pattern defines standards for data tables across all TPI portals. Tables are the primary data display mechanism for lists, reports, and management interfaces.

---

## Column Density Rules

### Density Levels

**Compact (40px row height)**
- Use when: Displaying many rows (>100), space-constrained views
- Cell padding: 8px vertical, 12px horizontal
- Font size: 12px (text-xs)
- Icon size: 16px

**Standard (48px row height)**
- Use when: Default for most tables
- Cell padding: 12px vertical, 16px horizontal
- Font size: 14px (text-sm)
- Icon size: 20px

**Spacious (56px row height)**
- Use when: Important data, accessibility priority, touch interfaces
- Cell padding: 16px vertical, 20px horizontal
- Font size: 14px (text-sm)
- Icon size: 24px

### Column Width Rules

- **Auto-width**: Text columns (name, description)
- **Fixed-width**: Numeric columns (120px), status (100px), actions (80px)
- **Flexible**: Primary content column (min-width: 200px, flex: 1)
- **Min-width**: 80px per column
- **Max-width**: 400px per column (truncate with ellipsis)

---

## Default Sort Rules

### Sort Priority

1. **Most Recent First** (default for time-based entities)
   - Column: `created_at` or `updated_at`
   - Direction: Descending
   - Use for: Incidents, tasks, logs, activities

2. **Alphabetical** (default for reference entities)
   - Column: `name` or `title`
   - Direction: Ascending
   - Use for: Users, services, configurations

3. **Status Priority** (default for workflow entities)
   - Column: `status` (custom sort order)
   - Direction: Custom (Active → Pending → Resolved)
   - Use for: Work items, approvals, requests

4. **Numeric** (default for metric entities)
   - Column: Primary metric
   - Direction: Descending (highest first)
   - Use for: Performance data, rankings

### Sort Indicators

- **Unsorted**: No indicator
- **Ascending**: ↑ icon, primary color
- **Descending**: ↓ icon, primary color
- **Multi-sort**: Show all sorted columns with indicators

---

## Bulk Actions + Selection UX

### Selection Behavior

**Single Selection**
- Click row: Selects row (if selection enabled)
- Checkbox: Toggle selection
- Keyboard: Space bar toggles selection

**Multi-Selection**
- Checkbox column: First column (fixed 48px width)
- "Select All" checkbox: In header
- Selected count: "3 selected" badge in toolbar
- Selection persists: Across pagination (if same filter)

### Bulk Actions Toolbar

**Toolbar Appearance**
- Shows when: 1+ items selected
- Position: Above table, replaces filter bar temporarily
- Sticky: Sticks to top on scroll

**Toolbar Content**
```
[3 selected] [Bulk Action 1] [Bulk Action 2] [Clear Selection]
```

**Bulk Action Types**
- Delete: Destructive, requires confirmation
- Export: Export selected items
- Update Status: Change status of selected items
- Assign: Assign to user/team
- Archive: Move to archive

**Bulk Action Flow**
1. User selects items
2. Toolbar appears
3. User clicks bulk action
4. Confirmation dialog (if destructive)
5. Action applied to all selected
6. Success toast: "3 items updated"
7. Selection cleared

---

## Saved Views

### View Management

**Save Current View**
- Button: "Save View" in filter bar
- Dialog: Name input + "Save as default" checkbox
- Saved: Filters, sort, column visibility, page size

**Load Saved View**
- Dropdown: "Saved Views" in filter bar
- List: All saved views + "Default View"
- Actions: Load, Rename, Delete, Set as Default

**Default View**
- One default view per user per table
- Auto-applied: On page load
- Override: User can change and save new default

**View Sharing** (optional)
- Share view: Generate shareable link
- Permissions: Role-based view access
- Use case: Team-standard filters

---

## Row Click => DetailDrawer

### Click Behavior

**Row Click Action**
- Primary action: Opens DetailDrawer
- Drawer content: Entity detail (Overview tab)
- Drawer width: 600px (standard), 800px (wide)

**Row Hover State**
- Background: Subtle highlight (bg-muted/50)
- Cursor: Pointer
- No other visual changes

**Disabled Row Click**
- Use when: Row is not actionable
- Visual: Reduced opacity, no hover
- Example: Archived items, read-only data

### Drawer Integration

**Drawer Content Structure**
```
DetailDrawer
├── Header (title + close)
├── Tabs (Overview / Activity / Audit)
└── Footer (actions, if editable)
```

**Drawer Behavior**
- Opens: Slide-in from right (300ms)
- Closes: Slide-out to right (300ms)
- Backdrop: 50% opacity, clickable to close
- Focus: Trapped in drawer when open

**Drawer Actions**
- Edit: Inline edit form (if permitted)
- Delete: Opens ConfirmDialog
- Export: Export entity data
- Share: Copy link to entity

---

## Accessibility

### Keyboard Navigation

**Table Navigation**
- Tab: Move between interactive elements
- Arrow keys: Navigate cells (if enabled)
- Enter/Space: Activate row (open drawer)
- Escape: Close drawer/modal

**Sorting**
- Tab to header
- Enter: Toggle sort
- Shift+Enter: Add secondary sort

**Selection**
- Space: Toggle row selection
- Shift+Space: Select range
- Ctrl/Cmd+A: Select all (if enabled)

### Screen Reader Support

**ARIA Labels**
- Table: `aria-label="[Entity] table"`
- Sortable header: `aria-sort="ascending|descending|none"`
- Selected row: `aria-selected="true"`
- Row count: "Showing 1-25 of 247 [entities]"

**Announcements**
- Sort change: "Sorted by [column] [direction]"
- Selection: "[N] items selected"
- Filter: "Filtered to [N] results"

### Focus Management

**Focus Indicators**
- Visible: 2px solid primary color outline
- High contrast: Meets WCAG AA
- Always visible: Never remove focus styles

**Focus Order**
1. Filter bar
2. Table header (sort controls)
3. Table rows (left to right, top to bottom)
4. Pagination
5. Actions

---

## Export Behavior

### Export Formats

**CSV Export** (default)
- Includes: All visible columns
- Scope: Current filtered/sorted view
- Filename: `[entity]_[date]_[time].csv`
- Headers: Column labels (not IDs)

**PDF Export** (optional)
- Format: Formatted table with branding
- Includes: Filters applied, export date
- Filename: `[entity]_[date]_[time].pdf`
- Pagination: Multiple pages if needed

**XLSX Export** (optional)
- Format: Excel-compatible
- Includes: Multiple sheets (if applicable)
- Filename: `[entity]_[date]_[time].xlsx`

### Export Flow

1. User clicks "Export" button
2. Dropdown: Format selection (CSV, PDF, XLSX)
3. User selects format
4. Loading: Button shows spinner
5. Download: File downloads automatically
6. Success: Toast notification "Exported 247 items"

### Export Scope

**What's Exported**
- Current filtered data
- Current sorted order
- Visible columns only
- Selected items (if bulk export)

**What's Not Exported**
- Hidden columns
- Pagination (all matching rows, not just current page)
- Computed/derived columns (unless specified)

---

## Performance Guidelines

### Virtualization

**When to Virtualize**
- Tables with >100 rows
- Complex cell rendering
- Real-time updates

**Virtualization Rules**
- Render: Visible rows + 5 buffer rows
- Scroll: Smooth, 60fps target
- Height: Fixed row height required

### Data Loading

**Progressive Loading**
1. Load first page (25 rows)
2. Render table immediately
3. Load remaining data in background
4. Update pagination when ready

**Infinite Scroll** (optional)
- Alternative to pagination
- Load more on scroll to bottom
- Show loading indicator
- Use for: Activity feeds, logs

---

## Table States

### Loading State
- Skeleton rows: Match table structure
- Count: Show 5-10 skeleton rows
- Animation: Shimmer effect

### Empty State
- Component: EmptyState
- Message: Contextual (no data vs. filtered empty)
- Action: Primary CTA if applicable

### Error State
- Component: ErrorState
- Message: User-friendly error
- Action: Retry button

### Partial Data State
- Show: Available data
- Indicator: "Some data may be unavailable"
- Use when: Partial API failure

---

## Column Configuration

### Column Visibility

**Show/Hide Columns**
- Button: "Columns" in table toolbar
- Menu: Checkboxes for each column
- Persist: Saved to user preferences
- Required: At least 1 column visible

### Column Reordering

**Drag to Reorder** (optional)
- Drag handle: Left edge of header
- Visual: Column highlights on drag
- Persist: Saved to user preferences
- Reset: "Reset to default" option

### Column Resizing

**Resize Handles** (optional)
- Handle: Right edge of header
- Visual: Cursor changes to resize
- Min-width: 80px
- Max-width: 400px
- Persist: Saved to user preferences

---

## Best Practices

### Do

✅ Use standard density for most tables  
✅ Provide default sort that makes sense  
✅ Enable row click for detail view  
✅ Show selection count in toolbar  
✅ Export includes current filters  
✅ Virtualize large tables  
✅ Provide keyboard navigation  
✅ Announce state changes to screen readers  

### Don't

❌ Mix densities in same table  
❌ Sort by non-meaningful columns by default  
❌ Require hover to see important data  
❌ Hide bulk actions behind menus  
❌ Export without user confirmation (for large datasets)  
❌ Render 1000+ rows without virtualization  
❌ Remove focus indicators  
❌ Use color alone to indicate status  

---

## Implementation Example

```tsx
<DataTable
  data={incidents}
  columns={[
    {
      id: "number",
      header: "Number",
      accessor: (row) => row.number,
      sortable: true,
      width: 120
    },
    {
      id: "title",
      header: "Title",
      accessor: (row) => row.title,
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-muted-foreground">{row.description}</div>
        </div>
      )
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (value) => <StatusBadge status={value} label={value} />,
      width: 100
    },
    {
      id: "created_at",
      header: "Created",
      accessor: (row) => row.created_at,
      sortable: true,
      render: (value) => formatDate(value),
      width: 150
    }
  ]}
  pagination={{
    page: currentPage,
    pageSize: 25,
    total: totalIncidents,
    onPageChange: setPage,
    onPageSizeChange: setPageSize
  }}
  sorting={{
    column: "created_at",
    direction: "desc",
    onSort: handleSort
  }}
  selection={{
    selected: selectedIds,
    onSelectionChange: setSelectedIds
  }}
  onRowClick={(row) => openDrawer(row.id)}
  exportable
  onExport={handleExport}
  density="standard"
  emptyState={
    <EmptyState
      title="No incidents found"
      description="Create your first incident to get started."
      action={{ label: "New Incident", onClick: handleCreate }}
    />
  }
/>
```

---

**Related:**
- [Drawer Pattern](./DRAWER_PATTERN.md)
- [Component Inventory](../components/COMPONENT_INVENTORY.md)


















