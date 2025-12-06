-- =====================================================
-- Seed CXO Training Lessons, Steps, and Quizzes
-- =====================================================
-- This migration populates the training system with comprehensive lesson content

-- =====================================================
-- MODULE 1: CXO Orientation & Portal Overview
-- =====================================================

-- Lesson 1.1: Welcome to the CXO Command Center
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'cxo_orientation';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Welcome to the CXO Command Center',
    'Get oriented with your new workspace',
    '## Welcome to Your Command Center

As the Chief Experience Officer, you now have access to a comprehensive portal designed to help you manage the entire Experience Organization at Crave''n.

### What You''ll Learn

This lesson will introduce you to:
- The structure and purpose of the CXO Portal
- Your daily responsibilities and workflow
- How to navigate between different sections
- Key metrics and KPIs you''ll be monitoring

### Your Role

As CXO, you are responsible for:
- **Driver Experience (Cravers)**: Ensuring drivers are happy, supported, and efficient
- **Customer Experience**: Maintaining high satisfaction and resolving issues quickly
- **Restaurant/Merchant Partner Experience**: Keeping merchant partners satisfied and operational
- **Support Operations**: Overseeing support team performance and adherence to SLAs
- **Experience Analytics**: Tracking CSAT, NPS, wait times, and delivery quality
- **Issue Resolution & Quality Control**: Identifying patterns and fixing root causes

### Portal Structure

The CXO Portal is organized into 10 main sections accessible from the left sidebar:
1. **Dashboard** - Your daily command view
2. **Tickets** - Escalated ticket governance
3. **Drivers** - Driver experience oversight
4. **Customers** - Customer experience monitoring
5. **Merchants** - Restaurant/merchant partner management
6. **Support** - Support operations & staff performance
7. **Analytics** - Experience analytics and trends
8. **Initiatives** - Improvement programs tracking
9. **Incidents** - Risk and incident management
10. **Reports** - Daily and weekly executive reports

### Next Steps

After completing this orientation, you''ll move on to understanding your daily workflow and how to navigate the portal effectively.',
    '/cxo/dashboard',
    1,
    10
  ) RETURNING id INTO lesson_id_var;

  -- Steps for Lesson 1.1
  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Navigate to Dashboard', 'Click on "Dashboard" in the left sidebar to view your executive command center', 'sidebar.dashboard', 1, true),
    (lesson_id_var, 'Review Portal Structure', 'Familiarize yourself with all 10 main sections in the sidebar navigation', 'sidebar.navigation', 2, true),
    (lesson_id_var, 'Check User Profile', 'Click on your profile in the top right to see your role and access settings', 'header.profile', 3, false);
END $$;

-- Lesson 1.2: Understanding Your Daily Workflow
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'cxo_orientation';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Understanding Your Daily Workflow',
    'Learn what you should do every day as CXO',
    '## Your Daily CXO Workflow

Every morning, you should follow a structured routine to stay on top of experience metrics and issues.

### Morning Routine (First 30 Minutes)

1. **Review Live Experience Metrics**
   - Open the Dashboard
   - Check open and delayed orders
   - Review support ticket volumes
   - Monitor driver online/offline counts
   - Identify at-risk restaurants

2. **Check Experience Alerts**
   - Review tickets requiring your approval
   - Check for open incidents
   - Identify merchants flagged as at-risk

3. **Prioritize Your Day**
   - Address critical tickets first
   - Review escalated issues
   - Plan time for strategic initiatives

### Throughout the Day

- **Manage Experience Tickets**: Review escalated tickets, approve credits, tag root causes
- **Oversee Driver Experience**: Monitor driver complaints, check heatmaps, approve bonuses
- **Monitor Merchant Experience**: Review merchant issues, approve menu changes, check uptime
- **Customer Experience**: Validate complaints, approve credits/refunds, identify problem areas
- **Support Staff Oversight**: Review team performance, check unresolved tickets, assign goals

### End of Day

- Complete your Daily Stand-Up Summary
- Review metrics that moved
- Document biggest issues and fixes deployed
- Prepare recommendations for tomorrow

### Best Practices

- **Start with the Dashboard**: Always begin your day here to get the full picture
- **Prioritize by Impact**: Focus on issues affecting the most customers/drivers first
- **Document Patterns**: Use root cause tagging to identify systemic problems
- **Be Proactive**: Don''t wait for escalations - monitor metrics and catch issues early',
    '/cxo/dashboard',
    2,
    15
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Open Dashboard', 'Navigate to the Dashboard to see your morning metrics overview', 'dashboard.metrics', 1, true),
    (lesson_id_var, 'Review Problem Zones', 'Check the Problem Zones panel to identify areas needing attention', 'dashboard.problemZones', 2, true),
    (lesson_id_var, 'Check Experience Alerts', 'Review the Experience Alerts panel for items requiring immediate action', 'dashboard.alerts', 3, true);
END $$;

-- Lesson 1.3: Navigating the CXO Sidebar and Tabs
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'cxo_orientation';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Navigating the CXO Sidebar and Tabs',
    'Master the portal navigation',
    '## Portal Navigation Guide

The CXO Portal uses a persistent left sidebar for navigation, making it easy to switch between different sections.

### Sidebar Navigation

The sidebar contains 10 main sections plus Training:

1. **Dashboard** - Your home base for daily metrics
2. **Tickets** - All escalated and high-impact tickets
3. **Drivers** - Driver experience and supply management
4. **Customers** - Customer experience and satisfaction
5. **Merchants** - Restaurant partner management
6. **Support** - Support team performance tracking
7. **Analytics** - Experience analytics and trends
8. **Initiatives** - Improvement program tracking
9. **Incidents** - Risk and incident management
10. **Reports** - Executive reporting tools
11. **Training** - This training portal

### Navigation Tips

- **Active Section Highlighting**: The current section is highlighted in the sidebar
- **Quick Access**: Click any section to navigate instantly
- **Breadcrumbs**: Use browser back/forward buttons to navigate history
- **Keyboard Shortcuts**: (Future enhancement)

### Top Bar Features

The top bar provides:
- **User Profile Menu**: Access your profile and sign out
- **Back to Hub**: Return to the main company hub
- **Portal Title**: "CXO Portal - Experience Command Center"

### Best Practices

- Bookmark frequently used sections
- Use the Dashboard as your starting point each day
- Navigate directly to specific tickets/incidents when needed
- Keep the Training tab open in another window while learning',
    '/cxo/dashboard',
    3,
    5
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Navigate Between Sections', 'Click through at least 3 different sections in the sidebar to practice navigation', 'sidebar.navigation', 1, true),
    (lesson_id_var, 'Use Back Button', 'Use the "Back to Hub" button to return to the main hub, then navigate back to CXO Portal', 'header.backButton', 2, false);
END $$;

-- =====================================================
-- MODULE 2: Dashboard Fundamentals
-- =====================================================

-- Lesson 2.1: Reading the Executive CX Dashboard
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'dashboard_fundamentals';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Reading the Executive CX Dashboard',
    'Understand key metrics and KPIs',
    '## Understanding Your Dashboard

The Executive CX Dashboard is your command center, providing a real-time view of all experience metrics.

### Top Metric Cards

The dashboard displays 6 key metrics at a glance:

1. **Open Orders**: Current number of active orders in the system
2. **Delayed Orders**: Orders that are past their estimated delivery time
3. **Avg Delivery Time**: Average delivery time for today (in minutes)
4. **Tickets (Open/Escalated)**: Total open tickets and those requiring escalation
5. **Drivers Online/Offline**: Current driver availability
6. **At-Risk Restaurants**: Number of restaurants flagged as at-risk

### Interpreting Metrics

**Open Orders**: 
- Normal range varies by time of day
- Spike during lunch/dinner hours is expected
- Persistent high numbers may indicate driver shortage

**Delayed Orders**:
- Should be minimal (< 5% of open orders)
- High numbers indicate operational issues
- Check Problem Zones panel for geographic patterns

**Avg Delivery Time**:
- Target: Under 30 minutes
- Monitor for trends over time
- Compare across zones

**Tickets**:
- Open tickets: Total active issues
- Escalated: Requiring your attention or approval
- High escalation rate may indicate systemic problems

### Problem Zones Panel

This panel shows geographic areas with delivery issues:
- Zone name
- Number of delayed orders
- Average delivery time
- Highlighted when breaching SLAs

### Experience Alerts Panel

Shows items requiring immediate attention:
- Tickets needing CXO approval
- Open incidents
- At-risk merchants

### Today''s CXO Priorities

Lists active initiatives and unresolved high/critical incidents that need your focus.',
    '/cxo/dashboard',
    1,
    15
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Review Metric Cards', 'Examine each of the 6 metric cards at the top of the dashboard', 'dashboard.metricCards', 1, true),
    (lesson_id_var, 'Check Problem Zones', 'Review the Problem Zones panel to see geographic areas with issues', 'dashboard.problemZones', 2, true),
    (lesson_id_var, 'Review Experience Alerts', 'Check the Experience Alerts panel for items requiring your attention', 'dashboard.alerts', 3, true),
    (lesson_id_var, 'View Priorities', 'Review Today''s CXO Priorities section', 'dashboard.priorities', 4, false);
END $$;

-- Lesson 2.2: Interpreting Problem Zones & Alerts
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'dashboard_fundamentals';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Interpreting Problem Zones & Alerts',
    'Identify and respond to operational issues',
    '## Problem Zones & Alerts

The dashboard highlights areas requiring your attention through Problem Zones and Experience Alerts.

### Problem Zones

Problem Zones are geographic areas experiencing delivery delays or operational issues.

**What to Look For**:
- Zones with > 10 delayed orders
- Average delivery time > 35 minutes
- Zones highlighted in red (SLA breach)

**Actions to Take**:
1. Click on the zone to see detailed metrics
2. Check if it''s a driver shortage issue
3. Review merchant prep times in that zone
4. Check for incidents reported in that area
5. Consider creating an initiative to address systemic issues

### Experience Alerts

The Experience Alerts panel shows three types of critical items:

**1. Tickets Needing Approval**
- Tickets with `needs_cxo_approval = true`
- Usually involve credits/refunds above a threshold
- Click to review and approve/deny

**2. Open Incidents**
- Active incidents that haven''t been resolved
- Critical and high severity incidents require immediate attention
- Click to view details and update status

**3. At-Risk Merchants**
- Restaurants flagged as at-risk
- May have high complaint rates, slow prep times, or frequent outages
- Review in Merchants section for details

### Response Workflow

1. **Assess Severity**: Determine if immediate action is needed
2. **Investigate Root Cause**: Use related tickets and incidents to understand the issue
3. **Take Action**: Approve credits, update incident status, or create initiatives
4. **Monitor**: Track metrics to ensure the issue is resolved

### Best Practices

- Check Problem Zones first thing each morning
- Address critical alerts before moving to routine tasks
- Document patterns - if a zone appears frequently, it needs a systemic fix
- Use the Initiatives section to track long-term improvements',
    '/cxo/dashboard',
    2,
    10
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Identify Problem Zone', 'Find a problem zone in the Problem Zones panel and note the delayed orders count', 'dashboard.problemZones.table', 1, true),
    (lesson_id_var, 'Review Alert Item', 'Click on an item in the Experience Alerts panel to view details', 'dashboard.alerts.list', 2, true),
    (lesson_id_var, 'Navigate to Related Section', 'From an alert, navigate to the related section (Tickets, Incidents, or Merchants)', 'dashboard.alerts.navigation', 3, false);
END $$;

-- Lesson 2.3: Identifying Daily Priorities from the Dashboard
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'dashboard_fundamentals';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Identifying Daily Priorities from the Dashboard',
    'Prioritize your daily tasks effectively',
    '## Setting Daily Priorities

The dashboard helps you identify what needs your attention most urgently each day.

### Priority Framework

Use this framework to prioritize:

**P0 - Critical (Do First)**:
- Critical severity incidents
- Tickets with high priority and needs approval
- System outages affecting multiple zones
- Safety-related issues

**P1 - High (Do Today)**:
- High priority tickets
- At-risk merchants with high order volumes
- Problem zones with > 15 delayed orders
- Active initiatives with approaching deadlines

**P2 - Medium (Do This Week)**:
- Medium priority tickets
- Problem zones with moderate delays
- Initiatives in planning phase
- Weekly report preparation

**P3 - Low (Backlog)**:
- Low priority tickets
- Optional training modules
- Long-term strategic initiatives

### Today''s CXO Priorities Section

This section automatically surfaces:
- Active initiatives with imminent target dates
- Unresolved high/critical incidents
- Items from your previous day''s recommendations

### Daily Prioritization Workflow

1. **Morning Review** (5 minutes):
   - Check all metric cards for anomalies
   - Review Problem Zones for new issues
   - Scan Experience Alerts for critical items

2. **Priority Assignment** (10 minutes):
   - Categorize alerts by priority level
   - Assign time blocks for each priority
   - Delegate lower-priority items if possible

3. **Execution** (Throughout Day):
   - Work through P0 items first
   - Update status as you complete items
   - Reassess priorities if new critical issues arise

4. **End of Day Review** (5 minutes):
   - Document what was completed
   - Note items to carry forward
   - Update initiatives and incidents

### Tips for Effective Prioritization

- **Time-box Critical Items**: Don''t let one issue consume your entire day
- **Batch Similar Tasks**: Group ticket approvals together
- **Use Initiatives for Patterns**: If you see the same issue repeatedly, create an initiative
- **Delegate When Possible**: Use the Support section to assign items to your team',
    '/cxo/dashboard',
    3,
    10
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Review Priorities Section', 'Check the Today''s CXO Priorities section on the dashboard', 'dashboard.priorities', 1, true),
    (lesson_id_var, 'Categorize an Alert', 'Take one item from Experience Alerts and determine its priority level (P0-P3)', 'dashboard.alerts.priority', 2, true);
END $$;

-- =====================================================
-- MODULE 3: Ticket Governance & Approvals
-- =====================================================

-- Lesson 3.1: Ticket Types and Priority Levels
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'ticket_governance';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Ticket Types and Priority Levels',
    'Understand the ticket classification system',
    '## Ticket Classification System

Tickets in the CXO Portal are classified by type, status, and priority to help you manage them effectively.

### Ticket Types

Tickets are categorized into four types:

**1. Driver Tickets**
- Issues reported by or about drivers (Cravers)
- Examples: Navigation problems, pickup issues, payment disputes
- Usually handled by Driver Ops team, escalated to you for systemic issues

**2. Customer Tickets**
- Issues reported by customers
- Examples: Late delivery, missing items, wrong order, rude driver
- May require credit/refund approval
- High volume indicates experience problems

**3. Merchant Tickets**
- Issues reported by or about restaurant partners
- Examples: Order prep delays, menu errors, rude interactions
- Can impact driver wait times and customer satisfaction
- May require menu change approvals

**4. System Tickets**
- Technical or operational system issues
- Examples: App crashes, payment failures, API outages
- Usually require coordination with CTO/Engineering
- High priority due to broad impact

### Priority Levels

Tickets are assigned one of four priority levels:

**Critical**:
- Safety issues
- System outages affecting multiple users
- Legal/compliance concerns
- Requires immediate response (< 1 hour)

**High**:
- Significant customer impact
- Driver payment issues
- Merchant operational problems
- Response within 4 hours

**Medium**:
- Moderate impact
- Standard customer complaints
- Non-urgent driver issues
- Response within 24 hours

**Low**:
- Minor issues
- General inquiries
- Non-blocking problems
- Response within 48 hours

### Status Values

**Open**: Newly created, not yet assigned
**In Progress**: Assigned and being worked on
**Resolved**: Issue fixed, awaiting verification
**Closed**: Fully resolved and verified

### Filtering Tickets

Use the filter bar to:
- Filter by type (driver, customer, merchant, system)
- Filter by status
- Filter by priority
- Show only tickets needing your approval

### Best Practices

- Start with Critical and High priority tickets
- Filter by "Needs Approval" to see items requiring your action
- Use root cause tagging to identify patterns
- Review tickets by zone to spot geographic issues',
    '/cxo/tickets',
    1,
    12
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Navigate to Tickets', 'Go to the Tickets section from the sidebar', 'sidebar.tickets', 1, true),
    (lesson_id_var, 'Use Type Filter', 'Filter tickets by type (e.g., select "Customer" to see only customer tickets)', 'tickets.filters.type', 2, true),
    (lesson_id_var, 'Use Priority Filter', 'Filter to show only "Critical" priority tickets', 'tickets.filters.priority', 3, true),
    (lesson_id_var, 'Filter by Approval Needed', 'Toggle the "Needs Approval" filter to see tickets requiring your action', 'tickets.filters.needsApproval', 4, true);
END $$;

-- Lesson 3.2: Managing Escalated Tickets & Approvals
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'ticket_governance';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Managing Escalated Tickets & Approvals',
    'Handle tickets that require your oversight',
    '## Managing Escalated Tickets

Escalated tickets are those that require CXO-level attention, typically involving approvals, high-value credits, or systemic issues.

### Identifying Escalated Tickets

Tickets are escalated when:
- Credit/refund amount exceeds threshold (usually $50+)
- Issue affects multiple customers/drivers
- Root cause indicates systemic problem
- Support team needs executive decision
- Legal or compliance concerns

### Ticket Detail View

When you click "View" on a ticket, you''ll see:

**Ticket Information**:
- Summary and full description
- Type, category, and priority
- Status and assignment
- Zone and related entities (customer, driver, merchant)
- Created and updated timestamps

**Actions Available**:
- Update status (Open → In Progress → Resolved → Closed)
- Change priority level
- Tag root cause
- Approve credit/refund
- Assign to support staff

### Approval Workflow

**For Credit/Refund Approvals**:

1. Review ticket details and customer history
2. Check if credit amount is appropriate
3. Verify the issue warrants compensation
4. Approve or deny with notes
5. System automatically clears `needs_cxo_approval` flag

**Best Practices for Approvals**:
- Check customer''s previous ticket history
- Verify the issue actually occurred
- Ensure credit amount matches the inconvenience
- Document your reasoning in resolution notes
- Look for patterns - if same issue appears frequently, create an initiative

### Status Management

**Updating Status**:
- Move tickets through the workflow as they progress
- Don''t mark as "Resolved" until issue is actually fixed
- Use "Closed" only after customer verification

**Priority Adjustments**:
- Escalate priority if issue worsens
- Lower priority if issue is less urgent than initially thought
- Document reason for priority change

### Root Cause Tagging

Tag root causes to identify patterns:
- `merchant_prep_delay`: Restaurant taking too long
- `routing_issue`: Driver navigation problems
- `driver_shortage`: Not enough drivers in zone
- `system_error`: Technical issue
- `customer_error`: Customer mistake (wrong address, etc.)

### Delegation

You can assign tickets to:
- Support managers for team handling
- Specific support agents for resolution
- Keep assigned to yourself for direct oversight

### Daily Ticket Review Routine

1. Filter by "Needs Approval" - review all pending approvals
2. Check Critical/High priority tickets
3. Review tickets by zone to spot geographic patterns
4. Tag root causes as you review
5. Update statuses for tickets you''ve addressed',
    '/cxo/tickets',
    2,
    18
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'View Ticket Details', 'Click "View" on a ticket to open the detail modal', 'tickets.table.viewButton', 1, true),
    (lesson_id_var, 'Update Ticket Status', 'Change a ticket status using the status dropdown in the detail view', 'tickets.detail.statusSelect', 2, true),
    (lesson_id_var, 'Update Priority', 'Change a ticket priority using the priority dropdown', 'tickets.detail.prioritySelect', 3, true),
    (lesson_id_var, 'Tag Root Cause', 'Enter a root cause tag in the "Tag Root Cause" field', 'tickets.detail.rootCauseInput', 4, true);
END $$;

-- Lesson 3.3: Applying Credits and Logging Root Cause
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'ticket_governance';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Applying Credits and Logging Root Cause',
    'Master credit approvals and pattern identification',
    '## Credit Approval Process

Approving credits and refunds is a key CXO responsibility that requires careful judgment.

### When to Approve Credits

**Approve credits when**:
- Customer experienced significant inconvenience
- Issue was clearly our fault (late delivery, wrong order, missing items)
- Customer has good history (not a repeat complainer)
- Credit amount is reasonable for the issue
- Issue is documented and verifiable

**Consider denying when**:
- Customer error (wrong address, didn''t answer door)
- Issue is unverifiable
- Customer has history of false complaints
- Credit amount is excessive for the issue
- Issue was already resolved without credit

### Credit Approval Steps

1. **Review Ticket Details**:
   - Read full description
   - Check customer order history
   - Verify the issue occurred

2. **Determine Appropriate Amount**:
   - Full refund for wrong/missing orders
   - Partial credit for delays (10-25% typical)
   - Full credit for safety issues
   - Consider order value when determining amount

3. **Approve or Deny**:
   - Click "Approve Credit" button
   - Enter credit amount
   - System automatically clears approval flag
   - Customer receives notification

### Root Cause Logging

Root cause tagging helps identify systemic problems that need broader fixes.

**Common Root Cause Tags**:

- `merchant_prep_delay`: Restaurant consistently slow
- `routing_issue`: Navigation problems causing delays
- `driver_shortage`: Not enough drivers in area
- `system_error`: App or payment system failure
- `weather_impact`: Severe weather affecting operations
- `customer_error`: Customer provided wrong info
- `driver_error`: Driver mistake (wrong address, etc.)
- `merchant_error`: Restaurant made mistake

**Using Root Cause Data**:

- Review root cause tags weekly to spot patterns
- Create initiatives for frequently occurring root causes
- Share patterns with relevant teams (Driver Ops, Merchant Success)
- Use data to prioritize improvements

### Best Practices

**Credit Approvals**:
- Be consistent with credit amounts for similar issues
- Document your reasoning in resolution notes
- Don''t approve excessive credits without justification
- Track approval patterns to identify abuse

**Root Cause Tagging**:
- Tag every ticket you review
- Use consistent tag names
- Be specific (e.g., "merchant_prep_delay" not just "merchant")
- Review tags monthly to identify trends

**Workflow Efficiency**:
- Batch similar approvals together
- Use filters to group tickets by type/zone
- Delegate routine approvals to support managers when possible
- Focus your time on high-value decisions',
    '/cxo/tickets',
    3,
    15
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Open Approval Modal', 'Click "Approve Credit" on a ticket that needs approval', 'tickets.detail.approveButton', 1, true),
    (lesson_id_var, 'Enter Credit Amount', 'Enter an appropriate credit amount in the approval modal', 'tickets.approvalModal.amountInput', 2, true),
    (lesson_id_var, 'Approve Credit', 'Click "Approve" to complete the credit approval', 'tickets.approvalModal.approveButton', 3, true),
    (lesson_id_var, 'Tag Root Cause', 'Add a root cause tag to a ticket you''ve reviewed', 'tickets.detail.rootCauseInput', 4, true);
END $$;

-- Continue with remaining modules... (Due to length, I'll create a second migration file for modules 4-7)

