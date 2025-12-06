-- =====================================================
-- Seed CXO Training Lessons - Part 2 (Modules 4-7)
-- =====================================================

-- =====================================================
-- MODULE 4: Driver, Customer & Merchant Experience
-- =====================================================

-- Lesson 4.1: Monitoring Driver Experience and Supply
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'experience_management';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Monitoring Driver Experience and Supply',
    'Ensure drivers are happy and available',
    '## Driver Experience Management

Happy drivers are essential for a successful delivery operation. Monitor driver satisfaction and supply to maintain service quality.

### Driver KPIs

The Drivers section shows key metrics:

**Total Active Drivers**: Drivers who can accept orders
**Online/Offline Counts**: Current driver availability
**Suspended Drivers**: Drivers temporarily or permanently suspended
**Average Driver Rating**: Overall driver performance score

### Driver Issue Tickets

Review driver tickets to identify common problems:
- Navigation issues
- Pickup problems at restaurants
- Payment disputes
- App technical issues
- Customer interaction problems

### Driver Directory

View all drivers with:
- Status (active, inactive, suspended)
- Online state (online, offline)
- Home zone
- Rating

### Actions You Can Take

**For Driver Issues**:
- Review complaint patterns
- Escalate to Driver Ops team
- Approve driver bonuses if applicable
- Address systemic issues through initiatives

**For Supply Issues**:
- Check driver heatmap for low-supply zones
- Review driver waitlist if applicable
- Coordinate with Driver Ops for recruitment
- Monitor acceptance rates

### Best Practices

- Check driver online counts during peak hours
- Review driver tickets weekly for patterns
- Monitor driver ratings - declining ratings indicate problems
- Address driver complaints quickly to maintain satisfaction
- Use heatmaps to identify zones needing more drivers',
    '/cxo/drivers',
    1,
    12
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'View Driver KPIs', 'Review the driver metrics cards at the top of the Drivers page', 'drivers.metrics', 1, true),
    (lesson_id_var, 'Review Driver Tickets', 'Check the Driver Issue Tickets section', 'drivers.tickets', 2, true),
    (lesson_id_var, 'Browse Driver Directory', 'Review the driver directory table', 'drivers.directory', 3, false);
END $$;

-- Lesson 4.2: Protecting Customer Experience & CSAT
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'experience_management';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Protecting Customer Experience & CSAT',
    'Maintain high customer satisfaction scores',
    '## Customer Experience Management

Customer satisfaction (CSAT) and Net Promoter Score (NPS) are critical metrics for business success.

### Customer KPIs

Monitor these key metrics:

**CSAT Score**: Customer Satisfaction (typically 1-5 or 1-10 scale)
- Target: > 4.5/5 or > 8/10
- Monitor trends over time
- Compare across zones

**NPS Score**: Net Promoter Score (-100 to +100)
- Target: > 50
- Measures likelihood to recommend
- Strong predictor of growth

**Complaint Rate**: Percentage of orders with complaints
- Target: < 2%
- Monitor for spikes

**Repeat Complaint Rate**: Customers with multiple complaints
- Target: < 0.5%
- High rate indicates systemic issues

### Customer Tickets

Review customer tickets to identify:
- Common complaint types
- Problem areas (zones, restaurants, drivers)
- Issues requiring credits/refunds
- Patterns indicating systemic problems

### Credits Approval Queue

Tickets requiring credit approval appear in a dedicated queue:
- Review each ticket carefully
- Check customer history
- Approve appropriate credits
- Deny unreasonable requests

### Customer Trend Analysis

Use analytics to track:
- CSAT trends over time
- NPS changes
- Complaint rate by zone
- Repeat complaint patterns

### Best Practices

- Review CSAT/NPS weekly
- Address complaint spikes immediately
- Approve credits fairly and consistently
- Identify repeat complainers (may indicate abuse)
- Use customer feedback to drive improvements
- Create initiatives for recurring issues',
    '/cxo/customers',
    1,
    15
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Review Customer KPIs', 'Check CSAT, NPS, and complaint rate metrics', 'customers.metrics', 1, true),
    (lesson_id_var, 'Review Credits Queue', 'Check the Credits Approval Queue for pending approvals', 'customers.creditsQueue', 2, true),
    (lesson_id_var, 'Approve a Credit', 'Review and approve a credit from the approval queue', 'customers.approveCredit', 3, true);
END $$;

-- Lesson 4.3: Managing Merchant Health & At-Risk Partners
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'experience_management';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Managing Merchant Health & At-Risk Partners',
    'Keep restaurant partners operational and satisfied',
    '## Merchant Experience Management

Healthy merchant partners are essential for reliable service. Monitor merchant health and address at-risk partners proactively.

### Merchant KPIs

Track these metrics:

**Total Active Merchants**: Restaurants currently operational
**At-Risk Merchants**: Restaurants flagged for issues
**Average Prep Time**: Typical order preparation time
**Average Merchant Rating**: Customer satisfaction with restaurants

### At-Risk Merchant Indicators

Merchants are flagged as at-risk when they have:
- High complaint rates
- Slow prep times (> 30 minutes average)
- Frequent outages
- Low customer ratings
- Multiple driver complaints about wait times

### Merchant Tickets

Review merchant tickets for:
- Order prep delays
- Menu errors
- Rude interactions
- Technical issues
- Operational problems

### Merchant Directory

View all merchants with:
- Name and location
- Zone
- Status (active, paused, offline)
- Average prep minutes
- Rating
- At-risk flag

### Actions You Can Take

**For At-Risk Merchants**:
- Review their ticket history
- Check prep time trends
- Contact Merchant Success team
- Create improvement initiatives
- Consider pausing if issues persist

**For Merchant Issues**:
- Approve urgent menu changes
- Address operational problems
- Coordinate with Merchant Success
- Track improvement progress

### Best Practices

- Review at-risk merchants daily
- Address prep time issues quickly (affects driver wait times)
- Work with Merchant Success team on improvements
- Create initiatives for merchants with systemic issues
- Monitor merchant uptime (offline merchants hurt availability)
- Use merchant ratings to identify problem partners',
    '/cxo/merchants',
    1,
    12
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Review Merchant KPIs', 'Check merchant metrics including at-risk count', 'merchants.metrics', 1, true),
    (lesson_id_var, 'View At-Risk Merchants', 'Review merchants flagged as at-risk', 'merchants.atRisk', 2, true),
    (lesson_id_var, 'Toggle At-Risk Status', 'Mark a merchant as at-risk or clear the flag', 'merchants.toggleAtRisk', 3, true),
    (lesson_id_var, 'Review Merchant Tickets', 'Check tickets related to merchant issues', 'merchants.tickets', 4, false);
END $$;

-- =====================================================
-- MODULE 5: Support Operations & Performance
-- =====================================================

-- Lesson 5.1: Support Team Structure & Roles
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'support_operations';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Support Team Structure & Roles',
    'Understand your support organization',
    '## Support Team Overview

The Support section helps you oversee your support operations team and their performance.

### Support Roles

Your support organization includes:

**Support Agents**:
- Handle customer, driver, and merchant tickets
- First line of support
- Escalate complex issues to managers
- Target: Resolve 80%+ of tickets without escalation

**Support Managers**:
- Oversee support agents
- Handle escalated tickets
- Review and approve credits (within limits)
- Manage team performance

**Driver Onboarding Staff**:
- Onboard new drivers
- Handle driver verification
- Manage driver documentation
- Coordinate with Driver Ops

**Merchant Success Reps**:
- Work with restaurant partners
- Handle merchant issues
- Onboard new merchants
- Improve merchant operations

### Support Staff Registry

View all support staff with:
- Name and role
- Active status
- Last metrics date
- Performance history

### Performance Metrics

Track individual and team performance:
- Tickets resolved per day
- Average handle time
- Escalation rate
- CSAT scores
- Notes and coaching opportunities

### Best Practices

- Review support staff registry monthly
- Check that all staff have recent metrics
- Identify top performers for recognition
- Identify underperformers for coaching
- Ensure proper role distribution
- Monitor escalation rates (high rates indicate training needs)',
    '/cxo/support',
    1,
    10
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'View Support Registry', 'Review the Support Staff Registry table', 'support.registry', 1, true),
    (lesson_id_var, 'Filter by Role', 'Use the role filter to view specific support roles', 'support.filters.role', 2, true),
    (lesson_id_var, 'Select Date', 'Choose a date to view performance metrics for that day', 'support.filters.date', 3, true);
END $$;

-- Lesson 5.2: Reading Support Performance Metrics
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'support_operations';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Reading Support Performance Metrics',
    'Interpret support team performance data',
    '## Support Performance Metrics

Understanding support metrics helps you identify coaching opportunities and ensure SLAs are met.

### Key Metrics

**Tickets Resolved**:
- Number of tickets closed per staff member per day
- Target: Varies by role (agents: 20-30/day, managers: 10-15/day)
- Low numbers may indicate inefficiency or complex issues

**Average Handle Minutes**:
- Average time to resolve a ticket
- Target: < 15 minutes for simple tickets
- High handle time may indicate training needs or complex issues

**Escalations Count**:
- Number of tickets escalated to you or managers
- Target: < 10% of total tickets
- High escalation rate indicates agents need more training or authority

**CSAT Score**:
- Customer satisfaction with support interactions
- Target: > 4.5/5
- Low scores indicate quality issues

### Performance Snapshot

The Performance Snapshot shows metrics for a selected date:
- View individual staff performance
- Compare performance across team
- Identify top and bottom performers
- Track trends over time

### Interpreting Metrics

**Good Performance Indicators**:
- High tickets resolved with good CSAT
- Low handle time
- Low escalation rate
- Consistent performance over time

**Warning Signs**:
- Declining tickets resolved
- Increasing handle time
- High escalation rate
- Low CSAT scores
- Inconsistent performance

### Actions Based on Metrics

**For High Performers**:
- Recognize and reward
- Use as examples for team
- Consider for promotion
- Assign more complex tickets

**For Underperformers**:
- Review their ticket history
- Provide coaching
- Identify training needs
- Set improvement goals
- Consider reassignment if no improvement

### Best Practices

- Review metrics weekly
- Look for trends, not just single data points
- Compare similar roles fairly
- Use metrics for coaching conversations
- Track improvement over time
- Balance quantity (tickets resolved) with quality (CSAT)',
    '/cxo/support',
    2,
    12
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'View Performance Snapshot', 'Review the Performance Snapshot table for selected date', 'support.performance', 1, true),
    (lesson_id_var, 'Compare Staff Metrics', 'Compare tickets resolved and CSAT scores across staff', 'support.performance.table', 2, true),
    (lesson_id_var, 'Identify Coaching Opportunity', 'Find a staff member with low metrics who needs coaching', 'support.performance.coaching', 3, false);
END $$;

-- Lesson 5.3: Escalation Patterns and Coaching Opportunities
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'support_operations';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Escalation Patterns and Coaching Opportunities',
    'Use data to improve team performance',
    '## Identifying Coaching Needs

Support metrics reveal patterns that indicate where coaching and training are needed.

### Escalation Patterns

High escalation rates indicate:
- Agents lack authority to resolve issues
- Agents need more training
- Issues are too complex for current level
- Process gaps requiring fixes

**Analyze Escalations By**:
- Agent (who escalates most?)
- Ticket type (what issues get escalated?)
- Time of day (when do escalations spike?)
- Zone (geographic patterns?)

### Coaching Opportunities

Use metrics to identify coaching needs:

**Handle Time Issues**:
- Agents taking too long may need:
  - Better training on common issues
  - Access to better tools/resources
  - Process improvements
  - Time management coaching

**Low Resolution Rate**:
- Agents resolving few tickets may need:
  - More training
  - Better time management
  - Different ticket assignment
  - Performance improvement plan

**Low CSAT Scores**:
- Poor customer satisfaction may indicate:
  - Communication skills training
  - Product knowledge gaps
  - Empathy training
  - Process adherence issues

### Creating Improvement Plans

For underperforming staff:
1. Review their specific metrics
2. Analyze their ticket history
3. Identify root causes
4. Create targeted improvement plan
5. Set clear goals and timelines
6. Provide resources and training
7. Monitor progress weekly

### Best Practices

- Use data, not assumptions, to identify needs
- Provide constructive feedback
- Set achievable improvement goals
- Track progress over time
- Recognize improvement
- Consider reassignment if no progress after coaching
- Share best practices from top performers',
    '/cxo/support',
    3,
    10
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Review Escalation Rates', 'Check escalation counts in the performance snapshot', 'support.performance.escalations', 1, true),
    (lesson_id_var, 'Identify Low Performer', 'Find a staff member with metrics below targets', 'support.performance.underperformer', 2, true);
END $$;

-- =====================================================
-- MODULE 6: Analytics, Initiatives & Incidents
-- =====================================================

-- Lesson 6.1: Using Analytics to Drive Decisions
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'analytics_initiatives';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Using Analytics to Drive Decisions',
    'Make data-driven experience improvements',
    '## Experience Analytics Overview

The Analytics section provides comprehensive data to help you make informed decisions about experience improvements.

### Key Metrics

**CSAT Score**: Customer Satisfaction
- Track trends over time
- Compare across segments (driver, customer, merchant, global)
- Identify improvement opportunities

**NPS Score**: Net Promoter Score
- Measures customer loyalty
- Strong predictor of growth
- Target: > 50

**Late Delivery Rate**: Percentage of late deliveries
- Target: < 5%
- Monitor for spikes
- Identify problem zones

**Repeat Complaint Rate**: Customers with multiple complaints
- Target: < 0.5%
- High rate indicates systemic issues

**Avg Delivery Minutes**: Average delivery time
- Target: < 30 minutes
- Track trends
- Compare zones

### Segment Analysis

Analyze metrics by segment:
- **Global**: Overall company metrics
- **Driver**: Driver experience metrics
- **Customer**: Customer experience metrics
- **Merchant**: Merchant partner metrics

### Time-Series Analysis

View trends over time to:
- Identify improving or declining metrics
- Correlate changes with initiatives
- Spot seasonal patterns
- Measure impact of changes

### Exporting Data

Export analytics to CSV for:
- Executive presentations
- Board reports
- Detailed analysis
- Sharing with stakeholders

### Best Practices

- Review analytics weekly
- Look for trends, not just current values
- Compare segments to identify focus areas
- Use data to justify initiatives
- Track impact of improvements
- Share insights with relevant teams',
    '/cxo/analytics',
    1,
    15
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Select Segment', 'Choose a segment (global, driver, customer, merchant) to analyze', 'analytics.segmentSelect', 1, true),
    (lesson_id_var, 'Review Key Metrics', 'Examine CSAT, NPS, and other key metrics for selected segment', 'analytics.metrics', 2, true),
    (lesson_id_var, 'Export Analytics', 'Click "Export CSV" to download analytics data', 'analytics.exportButton', 3, true);
END $$;

-- Lesson 6.2: Designing and Tracking Experience Initiatives
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'analytics_initiatives';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Designing and Tracking Experience Initiatives',
    'Create and manage improvement programs',
    '## Experience Initiatives

Initiatives are structured improvement programs designed to address specific experience problems with measurable impact.

### Initiative Structure

Each initiative includes:

**Problem Statement**: Clear description of the issue
**Root Cause**: Why the problem exists
**Plan**: How you''ll fix it
**Owner**: Person responsible for execution
**Status**: Current state (planned, in_progress, completed, on_hold)
**Impact Metrics**: Target metrics to measure success
**Timeline**: Start date and target completion date

### Creating an Initiative

**Step 1: Identify the Problem**
- Use analytics to find declining metrics
- Review ticket patterns
- Identify root causes from ticket tags
- Prioritize by impact

**Step 2: Define the Solution**
- Research best practices
- Design the fix
- Assign an owner
- Set realistic timeline

**Step 3: Set Impact Metrics**
- Choose target metric (e.g., late_delivery_rate)
- Set baseline (current value)
- Set target (desired value)
- Define success criteria

**Step 4: Track Progress**
- Update status as work progresses
- Monitor impact metrics
- Adjust plan if needed
- Document learnings

### Initiative Lifecycle

**Planned**: Initiative created, not yet started
**In Progress**: Active work happening
**On Hold**: Temporarily paused
**Completed**: Finished, impact measured

### Best Practices

- Create initiatives for recurring problems
- Set clear, measurable targets
- Assign realistic owners
- Update status regularly
- Measure actual impact vs. targets
- Document what worked and what didn''t
- Share learnings with team',
    '/cxo/initiatives',
    1,
    18
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'View Initiatives', 'Review the initiatives registry table', 'initiatives.table', 1, true),
    (lesson_id_var, 'Create Initiative', 'Click "Create Initiative" to start a new improvement program', 'initiatives.createButton', 2, true),
    (lesson_id_var, 'Fill Initiative Form', 'Complete the initiative creation form with problem, plan, and metrics', 'initiatives.createModal', 3, true),
    (lesson_id_var, 'Set Impact Metrics', 'Define target metric, baseline, and target values', 'initiatives.impactMetrics', 4, true);
END $$;

-- Lesson 6.3: Running Incident Management at CXO Level
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'analytics_initiatives';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Running Incident Management at CXO Level',
    'Handle critical incidents effectively',
    '## Incident Management

Incidents are significant events that impact operations and require executive oversight.

### Incident Types

**System Outage**: App or platform down
**Merchant Outage**: Restaurant offline affecting service
**Driver Shortage**: Not enough drivers in area
**Safety**: Safety-related incidents
**Other**: Miscellaneous critical issues

### Severity Levels

**Critical**: 
- System-wide outages
- Safety issues
- Affects many users
- Requires immediate response

**High**:
- Significant impact
- Multiple zones affected
- Requires urgent attention

**Medium**:
- Moderate impact
- Localized issues
- Standard response

**Low**:
- Minor impact
- Limited scope
- Routine handling

### Incident Status

**Open**: Incident reported, not yet addressed
**Mitigating**: Work in progress to resolve
**Resolved**: Issue fixed, verifying
**Closed**: Fully resolved and verified

### Incident Management Workflow

1. **Report**: Incident created with details
2. **Assess**: Determine severity and impact
3. **Mitigate**: Take action to resolve
4. **Resolve**: Issue fixed
5. **Close**: Verify resolution and document

### Creating Incidents

When to create an incident:
- System outages
- Merchant outages affecting service
- Driver shortages in zones
- Safety issues
- Any event requiring executive attention

**Incident Details**:
- Title: Brief description
- Description: Full details
- Type: Category of incident
- Severity: Impact level
- Zone: Affected area (if applicable)

### Managing Incidents

**Update Status**:
- Move through workflow as incident progresses
- Update to "Resolved" when fixed
- Close after verification

**Add Notes**:
- Document actions taken
- Record updates
- Track resolution steps
- Note lessons learned

**Link Tickets**:
- Connect related tickets
- Track all related issues
- Maintain audit trail

### Best Practices

- Create incidents for significant events
- Update status promptly
- Document all actions
- Link related tickets
- Review resolved incidents for patterns
- Use incidents to identify systemic issues
- Create initiatives for recurring incident types',
    '/cxo/incidents',
    1,
    15
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'View Incident Log', 'Review the incident log table', 'incidents.table', 1, true),
    (lesson_id_var, 'Create Incident', 'Click "Create Incident" to report a new incident', 'incidents.createButton', 2, true),
    (lesson_id_var, 'Fill Incident Form', 'Complete incident details including type, severity, and description', 'incidents.createModal', 3, true),
    (lesson_id_var, 'Update Incident Status', 'Change an incident status through the workflow', 'incidents.detail.statusSelect', 4, true),
    (lesson_id_var, 'Add Incident Note', 'Add a note to document actions taken on an incident', 'incidents.detail.addNote', 5, false);
END $$;

-- =====================================================
-- MODULE 7: Executive Reporting
-- =====================================================

-- Lesson 7.1: How to Draft a Daily CXO Report
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'executive_reporting';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'How to Draft a Daily CXO Report',
    'Create effective daily executive summaries',
    '## Daily CXO Reports

Daily reports provide the CEO and leadership team with a concise summary of experience operations.

### Report Structure

Each daily report includes:

**Biggest Issue Today**: The most significant problem you faced
**Fix Deployed**: Solutions you implemented
**Metrics That Moved**: Key metrics that changed (improved or declined)
**Ticket Backlog Status**: Current state of ticket queue
**Recommendation for Tomorrow**: What should be prioritized next

### Writing Effective Reports

**Be Concise**:
- Keep each section brief (1-2 sentences)
- Focus on what matters most
- Avoid unnecessary details

**Be Specific**:
- Use numbers and metrics
- Name specific issues
- Reference concrete actions

**Be Actionable**:
- Recommendations should be clear
- Include next steps
- Prioritize items

**Be Honest**:
- Report problems, not just successes
- Acknowledge when metrics decline
- Explain what you''re doing about it

### Example Daily Report

**Biggest Issue**: West Toledo zone had 15 delayed orders due to driver shortage during lunch rush.

**Fix Deployed**: Contacted Driver Ops to increase driver incentives in that zone. Approved 3 customer credits for late deliveries.

**Metrics That Moved**: CSAT improved 0.3 points. Late delivery rate increased 2% due to West Toledo issue.

**Ticket Backlog Status**: 45 open tickets, 8 requiring approval. Down from 52 yesterday.

**Recommendation for Tomorrow**: Review driver supply in West Toledo zone. Consider creating initiative to address driver shortage patterns.

### Best Practices

- Write reports at end of day
- Review dashboard metrics before writing
- Be consistent with format
- Focus on executive-level insights
- Use data to support statements
- Keep tone professional but conversational',
    '/cxo/reports',
    1,
    12
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Navigate to Reports', 'Go to the Reports section', 'sidebar.reports', 1, true),
    (lesson_id_var, 'Create Daily Report', 'Click "Create Report" and select "Daily" type', 'reports.createButton', 2, true),
    (lesson_id_var, 'Fill Report Fields', 'Complete all sections of the daily report form', 'reports.createModal', 3, true),
    (lesson_id_var, 'Submit Report', 'Save the completed daily report', 'reports.submitButton', 4, true);
END $$;

-- Lesson 7.2: Weekly Summaries for CEO & Board
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'executive_reporting';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Weekly Summaries for CEO & Board',
    'Create comprehensive weekly reports',
    '## Weekly Executive Reports

Weekly reports provide a broader view of experience operations for CEO and Board-level review.

### Weekly Report Structure

Same structure as daily reports, but with weekly perspective:

**Biggest Issue**: Most significant challenge of the week
**Fix Deployed**: Major solutions or improvements implemented
**Metrics That Moved**: Week-over-week metric changes
**Ticket Backlog Status**: Overall ticket health
**Recommendation for Tomorrow**: Strategic priorities for next week

### Weekly Analysis

**Review the Week**:
- Aggregate daily metrics
- Identify trends
- Spot patterns
- Measure initiative impact

**Compare Periods**:
- Week-over-week changes
- Month-over-month trends
- Year-over-year comparisons (if available)

**Strategic Insights**:
- What worked well
- What needs improvement
- Resource needs
- Strategic recommendations

### Example Weekly Report

**Biggest Issue**: Driver shortage in 3 zones during peak hours, affecting 8% of orders.

**Fix Deployed**: Launched driver incentive program in affected zones. Reduced late delivery rate by 3%. Created initiative to improve driver supply forecasting.

**Metrics That Moved**: CSAT improved 0.5 points week-over-week. NPS increased 2 points. Late delivery rate decreased from 6% to 4.5%.

**Ticket Backlog Status**: Reduced from 180 to 145 open tickets. Escalation rate decreased 15%.

**Recommendation for Tomorrow**: Continue driver incentive program. Expand to 2 additional zones. Review merchant prep time initiatives.

### Best Practices

- Review all daily reports from the week
- Analyze analytics trends
- Review completed initiatives
- Include strategic recommendations
- Use visual data when possible
- Keep executive audience in mind
- Focus on business impact',
    '/cxo/reports',
    2,
    10
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Create Weekly Report', 'Create a new report and select "Weekly" type', 'reports.createWeekly', 1, true),
    (lesson_id_var, 'Review Weekly Analytics', 'Check analytics section for week-over-week trends before writing', 'reports.weeklyPrep', 2, true),
    (lesson_id_var, 'Complete Weekly Report', 'Fill out all sections with weekly perspective', 'reports.weeklyForm', 3, true);
END $$;

-- Lesson 7.3: Translating Metrics into Narrative
DO $$
DECLARE
  module_id_var UUID;
  lesson_id_var UUID;
BEGIN
  SELECT id INTO module_id_var FROM public.cxo_training_modules WHERE key = 'executive_reporting';
  
  INSERT INTO public.cxo_training_lessons (module_id, title, subtitle, content_markdown, associated_route, order_index, estimated_minutes)
  VALUES (
    module_id_var,
    'Translating Metrics into Narrative',
    'Tell the story behind the numbers',
    '## Making Metrics Meaningful

Effective reporting translates raw metrics into clear narratives that executives can understand and act on.

### The Art of Narrative Reporting

**Don''t Just Report Numbers**:
- Bad: "CSAT is 4.2"
- Good: "CSAT improved to 4.2, up 0.3 points from last week, driven by faster delivery times in our top 3 zones"

**Explain the Why**:
- What caused metric changes?
- What actions drove improvements?
- What external factors affected results?

**Provide Context**:
- Compare to targets
- Compare to previous periods
- Compare to industry benchmarks (if available)

**Tell the Story**:
- What happened?
- Why did it happen?
- What did you do about it?
- What''s next?

### Narrative Structure

**Opening**: Key takeaway or headline metric
**Context**: Background and comparison
**Analysis**: Why the metric changed
**Actions**: What you did or are doing
**Outlook**: What to expect next

### Example Narratives

**CSAT Improvement**:
"Customer satisfaction improved significantly this week, with CSAT rising from 3.9 to 4.2. This improvement was driven by our driver incentive program in high-delay zones, which reduced average delivery time by 4 minutes. We also resolved 3 systemic merchant prep delay issues that were causing customer complaints. We expect CSAT to continue improving as these initiatives mature."

**Ticket Backlog Reduction**:
"Ticket backlog decreased from 180 to 145 this week, a 19% reduction. This was achieved through improved support agent training on common issues, which reduced average handle time by 2 minutes. We also implemented a new escalation process that routes routine approvals to support managers, freeing up my time for strategic work. We''re on track to reach our target of < 100 open tickets by month-end."

### Best Practices

- Lead with the most important metric
- Use comparisons to provide context
- Explain causality (what caused changes)
- Be honest about challenges
- Connect metrics to business impact
- Use clear, executive-friendly language
- Avoid jargon and technical details
- Focus on actionable insights',
    '/cxo/reports',
    3,
    8
  ) RETURNING id INTO lesson_id_var;

  INSERT INTO public.cxo_training_steps (lesson_id, title, description, related_ui_key, order_index, is_required)
  VALUES
    (lesson_id_var, 'Review Report Archive', 'Look at previous reports to see narrative style', 'reports.archive', 1, true),
    (lesson_id_var, 'Practice Narrative', 'Write a report section that explains a metric change with context', 'reports.narrative', 2, true);
END $$;

-- Add a few quizzes for key lessons
DO $$
DECLARE
  lesson_id_var UUID;
BEGIN
  -- Quiz for Lesson 3.2: Managing Escalated Tickets
  SELECT id INTO lesson_id_var FROM public.cxo_training_lessons 
  WHERE title = 'Managing Escalated Tickets & Approvals' LIMIT 1;
  
  IF lesson_id_var IS NOT NULL THEN
    INSERT INTO public.cxo_training_quizzes (lesson_id, question, question_type, options, correct_answer, order_index)
    VALUES
      (lesson_id_var, 'When should you approve a credit for a customer?', 'multiple_choice', 
       '[{"value": "A", "label": "Always, to keep customers happy"}, {"value": "B", "label": "Only when the issue was clearly our fault and the customer has good history"}, {"value": "C", "label": "Never, credits hurt profitability"}, {"value": "D", "label": "Only for orders over $50"}]'::jsonb,
       '"B"'::jsonb, 1),
      (lesson_id_var, 'Root cause tagging helps identify systemic problems.', 'true_false', NULL, 'true'::jsonb, 2);
  END IF;
  
  -- Quiz for Lesson 6.2: Initiatives
  SELECT id INTO lesson_id_var FROM public.cxo_training_lessons 
  WHERE title = 'Designing and Tracking Experience Initiatives' LIMIT 1;
  
  IF lesson_id_var IS NOT NULL THEN
    INSERT INTO public.cxo_training_quizzes (lesson_id, question, question_type, options, correct_answer, order_index)
    VALUES
      (lesson_id_var, 'What should you include when creating an initiative?', 'multiple_choice',
       '[{"value": "A", "label": "Only the problem statement"}, {"value": "B", "label": "Problem statement, root cause, plan, owner, impact metrics, and timeline"}, {"value": "C", "label": "Just the title"}, {"value": "D", "label": "Problem and solution only"}]'::jsonb,
       '"B"'::jsonb, 1);
  END IF;
END $$;

