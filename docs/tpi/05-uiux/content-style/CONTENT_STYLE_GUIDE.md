# TPI Content Style Guide

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

This guide defines content standards for all TPI portals, ensuring consistent, clear, and professional communication across all interfaces.

---

## Microcopy Rules

### Enterprise Tone

**Voice Characteristics**
- Professional: Clear, direct, authoritative
- Helpful: Guides users without condescension
- Concise: No unnecessary words
- Actionable: Every message has a purpose

**Tone Examples**

✅ **Good:**
- "Save changes to update the incident status"
- "No incidents found. Create your first incident to get started."
- "Failed to load data. Please check your connection and try again."

❌ **Avoid:**
- "Oops! Something went wrong!" (too casual)
- "You don't have any incidents yet, but that's okay!" (too chatty)
- "Error 500: Internal Server Error" (too technical for users)

### Button Labels

**Action Verbs**
- Use: Create, Save, Delete, Export, Cancel, Close
- Avoid: Submit, Click here, OK, Yes/No

**Specificity**
- ✅ "Save Changes" (specific)
- ❌ "Save" (ambiguous - save what?)

**Destructive Actions**
- Use: "Delete", "Remove", "Archive"
- Avoid: "Destroy", "Kill", "Remove Forever"

### Form Labels

**Clarity**
- ✅ "Incident Title" (clear)
- ❌ "Title" (ambiguous)

**Required Fields**
- Indicate: Asterisk (*) + "Required" in help text
- Format: "Field Name *"

**Help Text**
- Position: Below field
- Length: 1-2 sentences max
- Purpose: Explain why or how, not what

---

## Error Copy Standards

### Error Message Structure

**Format:**
1. What happened (user-friendly)
2. Why it happened (if helpful)
3. What to do next (actionable)

**Example:**
```
Failed to save incident.
The server is temporarily unavailable.
Please try again in a few moments.
```

### Error Types

**Network Errors**
- Message: "Failed to load data. Please check your connection and try again."
- Action: Retry button
- Tone: Helpful, not blaming

**Validation Errors**
- Message: "Please correct the errors below and try again."
- Location: Inline with fields
- Format: Specific field error + general summary

**Permission Errors**
- Message: "You don't have permission to perform this action."
- Action: "Request Access" button (if applicable)
- Tone: Professional, not apologetic

**404 Errors**
- Message: "Page not found. The page you're looking for doesn't exist."
- Action: "Go to Dashboard" button
- Helpful: Suggest common pages

**500 Errors**
- Message: "Something went wrong on our end. We've been notified and are working on it."
- Action: Retry button
- Tone: Reassuring, transparent

### Error Message Guidelines

**Do:**
✅ Use plain language  
✅ Provide actionable guidance  
✅ Show error at point of action  
✅ Include error code (collapsed) for support  

**Don't:**
❌ Show technical stack traces  
❌ Use jargon or technical terms  
❌ Blame the user  
❌ Leave user without next steps  

---

## Status Naming Conventions

### Status Values

**Standard Statuses**

**Active/Inactive**
- Active: Entity is operational/enabled
- Inactive: Entity is disabled/paused
- Use for: Services, features, users

**Pending/In Progress/Completed**
- Pending: Waiting to start
- In Progress: Currently being worked on
- Completed: Finished successfully
- Use for: Tasks, workflows, approvals

**Open/Resolved/Closed**
- Open: Issue is active
- Resolved: Issue is fixed
- Closed: Issue is archived
- Use for: Incidents, tickets, issues

**Draft/Published/Archived**
- Draft: Not yet published
- Published: Live and visible
- Archived: No longer active
- Use for: Content, releases, documents

### Status Badge Labels

**Format**
- Uppercase: All status labels
- Length: 2-3 words max
- Consistency: Same status = same label everywhere

**Examples**
- ✅ "ACTIVE", "IN PROGRESS", "RESOLVED"
- ❌ "Active", "in progress", "Resolved"

**Color Mapping**
- Green: Active, Completed, Resolved, Published
- Yellow: Pending, In Progress, Warning
- Red: Error, Failed, Critical, Closed
- Gray: Inactive, Draft, Archived, Cancelled

---

## Date/Time Formatting Standards

### Date Formats

**Relative Time** (for recent events)
- Format: "< 1 min ago", "2 hours ago", "3 days ago"
- Use when: Activity feeds, recent updates
- Threshold: Show relative for < 7 days, absolute for older

**Absolute Date** (for specific dates)
- Format: "Jan 15, 2025"
- Use when: Important dates, deadlines, creation dates

**Date Range**
- Format: "Jan 15 - Jan 20, 2025"
- Use when: Filters, reports, time periods

### Time Formats

**12-Hour Format** (default)
- Format: "2:30 PM"
- Use when: User-facing times, timestamps

**24-Hour Format** (optional)
- Format: "14:30"
- Use when: Technical contexts, logs

**Timezone**
- Display: User's local timezone
- Indicate: "(Local Time)" if needed
- Convert: All times to user's timezone

### Examples

**Timestamps**
- Recent: "2 hours ago"
- Today: "2:30 PM"
- This week: "Monday, 2:30 PM"
- Older: "Jan 15, 2025 2:30 PM"

**Date Only**
- Format: "Jan 15, 2025"
- Use: Creation dates, deadlines

**Duration**
- Format: "2h 30m", "3d 5h", "45s"
- Use: Processing times, elapsed time

---

## Currency Formatting Standards

### Format Rules

**USD Format**
- Symbol: $ (prefix)
- Decimals: Always 2 decimal places
- Separators: Comma for thousands
- Format: `$1,234.56`

**Negative Values**
- Format: `-$123.45`
- Color: Red (for losses, negative changes)
- Indicate: Minus sign + red color

**Zero Values**
- Format: `$0.00`
- Display: Always show, don't hide

**Large Numbers**
- Format: `$1.2M` (millions), `$45.6K` (thousands)
- Threshold: Abbreviate if > 10,000
- Precision: 1 decimal place for abbreviations

### Examples

**Standard Amounts**
- `$1,234.56`
- `$0.50`
- `$10,000.00`

**Large Amounts**
- `$1.2M` (instead of $1,200,000.00)
- `$45.6K` (instead of $45,600.00)

**Negative Amounts**
- `-$123.45` (red color)
- `-$1.2M` (red color)

---

## Number Formatting Standards

### Integer Formatting

**Standard Integers**
- Format: `1,234`
- Separator: Comma every 3 digits
- Use: Counts, quantities, IDs

**Large Integers**
- Format: `1.2M` (millions), `45.6K` (thousands)
- Threshold: Abbreviate if > 10,000
- Use: Large counts, metrics

### Decimal Formatting

**Standard Decimals**
- Format: `1,234.56`
- Decimals: 2 decimal places (default)
- Use: Percentages, ratios, measurements

**Precision Decimals**
- Format: `1,234.5678`
- Decimals: As needed for precision
- Use: Technical metrics, calculations

### Percentage Formatting

**Standard Percentages**
- Format: `45.6%`
- Decimals: 1 decimal place (default)
- Use: Completion, rates, changes

**Whole Percentages**
- Format: `45%`
- Decimals: 0 (when appropriate)
- Use: Simple percentages, whole numbers

### Examples

**Integers**
- `1,234`
- `12,345`
- `1.2M` (1,200,000)

**Decimals**
- `1,234.56`
- `0.50`
- `99.99`

**Percentages**
- `45.6%`
- `100%`
- `0.5%`

---

## Empty State Messages

### Message Structure

**Format:**
1. Title: "No [entities] found"
2. Description: Contextual help or explanation
3. Action: Primary CTA (if applicable)

### Empty State Types

**No Data**
- Title: "No [entities] found"
- Description: "Get started by creating your first [entity]."
- Action: "Create [Entity]" button

**Filtered Empty**
- Title: "No results match your filters"
- Description: "Try adjusting your search criteria or clearing filters."
- Action: "Clear Filters" button

**Permission Empty**
- Title: "Access Restricted"
- Description: "You don't have permission to view [entities]. Contact your administrator for access."
- Action: "Request Access" button (if applicable)

**Error Empty**
- Title: "Unable to Load [Entities]"
- Description: "There was an error loading the data. Please try again."
- Action: "Retry" button

### Examples

**Good Empty States**
```
Title: "No incidents found"
Description: "Get started by creating your first incident report."
Action: "New Incident" button
```

```
Title: "No results match your filters"
Description: "Try adjusting your search criteria or clearing all filters."
Action: "Clear Filters" button
```

---

## Loading Messages

### Loading State Text

**Generic Loading**
- Message: "Loading..."
- Use: Initial page load, data fetch

**Specific Loading**
- Message: "Loading incidents..."
- Use: When context is clear

**Progress Loading**
- Message: "Loading... 3 of 10"
- Use: When progress is known

### Skeleton Text

**Placeholder Text**
- Format: Match actual content structure
- Length: Similar to real content
- Animation: Shimmer effect

**Examples**
- "Loading incident details..."
- "Fetching data..."
- "Processing request..."

---

## Confirmation Messages

### Standard Confirmations

**Format:**
"Are you sure you want to [action] [entity]?"

**Examples:**
- "Are you sure you want to delete this incident?"
- "Are you sure you want to archive this release?"
- "Are you sure you want to resolve this ticket?"

### Destructive Confirmations

**Two-Step Confirmation**
1. First: Standard confirmation dialog
2. Second: Type entity name or "DELETE"

**Message Format:**
"Type '[entity name]' to confirm deletion."

**Examples:**
- "Type 'INC-2025-001' to confirm deletion."
- "Type 'DELETE' to permanently remove this incident."

---

## Notification Messages

### Toast Messages

**Success**
- Format: "[Action] [entity] successfully"
- Example: "Incident created successfully"

**Error**
- Format: "Failed to [action] [entity]. [Reason]"
- Example: "Failed to save incident. Please check your connection."

**Warning**
- Format: "[Warning message]. [Action]"
- Example: "Unsaved changes detected. Save before leaving?"

**Info**
- Format: "[Information message]"
- Example: "Export will begin shortly"

### Inline Notifications

**Alert Messages**
- Format: Clear, actionable message
- Position: Top of page/section
- Dismissible: X button (if not critical)

**Examples:**
- "System maintenance scheduled for tonight at 2 AM."
- "New features available. Check the release notes."

---

## Best Practices

### Do

✅ Use clear, action-oriented language  
✅ Provide context in error messages  
✅ Use consistent terminology  
✅ Format numbers and dates consistently  
✅ Write helpful empty states  
✅ Include actionable guidance  

### Don't

❌ Use technical jargon  
❌ Blame the user  
❌ Leave users without next steps  
❌ Use inconsistent formatting  
❌ Write vague error messages  
❌ Use casual or chatty tone  

---

**Related:**
- [Accessibility Standard](../accessibility/ACCESSIBILITY_STANDARD.md)
- [Component Inventory](../components/COMPONENT_INVENTORY.md)














































