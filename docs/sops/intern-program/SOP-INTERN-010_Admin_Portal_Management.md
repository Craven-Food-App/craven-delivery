---
title: "SOP-INTERN-010: Admin Portal for Intern Program Management"
document_id: "SOP-INTERN-ADMIN-001"
version: "1.0"
effective_date: "2025-02-18"
department: "Human Resources"
category: "INTERN PROGRAM"
process_owner: "HR Director"
review_frequency: "Quarterly"
---

# SOP-INTERN-010: Admin Portal for Intern Program Management

**Version:** 1.0  
**Last Updated:** February 18, 2025  
**Owner:** Intern Program Administration

---

## Table of Contents

1. [Overview](#overview)
2. [Access & Permissions](#access--permissions)
3. [Portal Navigation](#portal-navigation)
4. [Dashboard](#dashboard)
5. [Interns Management](#interns-management)
6. [Test Module Library](#test-module-library)
7. [Role Tracks & Playlists](#role-tracks--playlists)
8. [Promotion Rules Engine](#promotion-rules-engine)
9. [Reviews & Enforcement](#reviews--enforcement)
10. [Roles & Permissions](#roles--permissions)
11. [Templates Management](#templates-management)
12. [Audit Log](#audit-log)
13. [Common Workflows](#common-workflows)
14. [Best Practices](#best-practices)
15. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The Intern Program Admin Portal is the governance authority for the internship program. It provides comprehensive tools to:

- Manage intern enrollment and progression
- Define and assign competency tests
- Configure role tracks and advancement paths
- Enforce promotion rules and review requirements
- Maintain audit trails for all program actions
- Manage program roles and permissions

### Key Principles

1. **Auditability**: All actions are logged and traceable
2. **Fairness**: Rules are consistently applied to all interns
3. **Governance**: Program Admin defines standards, not individual managers
4. **Automation**: Promotion rules enforce standards automatically
5. **Transparency**: Interns can see their progress and requirements

---

## Access & Permissions

### Required Role

- **Role**: `INTERN_PROGRAM_ADMIN`
- **Access Level**: Full program operations and admin access

### How to Obtain Access

1. Navigate to **Roles & Permissions** in the portal
2. An existing Program Admin must assign the `INTERN_PROGRAM_ADMIN` role to your user account
3. You must have an existing user account in the system (auth.users)
4. After assignment, log out and log back in to refresh permissions

### Access Restrictions

- **Interns** (`INTERN` role): Cannot access this portal
- **Intern Managers** (`INTERN_MANAGER` role): Cannot access this portal
- **Executive Sponsors** (`INTERN_SPONSOR` role): Cannot access this portal
- **Only Program Admins** have full access

---

## Portal Navigation

### Main Navigation Structure

The portal has 9 main sections accessible via the left sidebar:

1. **Dashboard** - Overview and KPIs
2. **Interns** - Manage intern records and oversight
3. **Test Module Library** - Create and manage competency tests
4. **Role Tracks & Playlists** - Define tracks and recommended tests
5. **Promotion Rules** - Configure advancement logic
6. **Reviews & Enforcement** - Monitor compliance and take action
7. **Roles & Permissions** - Manage program access
8. **Templates** - Manage letter templates
9. **Audit Log** - View all administrative actions

### Navigation Tips

- Click any menu item to navigate
- The active page is highlighted in orange
- Use the browser back button to return to previous pages
- All pages maintain state during navigation

---

## Dashboard

### Purpose

Provides a high-level overview of the intern program's health and status.

### Key Metrics (KPI Cards)

1. **Active Interns**
   - Count of interns with `role_state = 'INTERN_ACTIVE'`
   - Excludes exited, revoked, or applied-only interns

2. **Pending Reviews**
   - Count of overdue or upcoming reviews
   - Includes manager reviews, test reviews, and promotion reviews

3. **Tests Assigned**
   - Total number of test assignments across all interns
   - Includes pending, in-progress, and completed tests

4. **Promotions This Month**
   - Count of role state changes to `ACTING_EXECUTIVE` or `EXECUTIVE_OFFICER`
   - Tracked within the current calendar month

### Pipeline Funnel

Visual representation of intern progression:

- **Applied** → **Intern Active** → **Acting Executive** → **Executive Officer**
- Shows count at each stage
- Highlights bottlenecks in the pipeline

### Alerts Panel

Displays critical items requiring attention:

- Overdue reviews
- Failed tests requiring action
- Interns approaching promotion eligibility
- System errors or warnings

### Actions

- Click any metric card to drill down to detailed views
- Click alerts to navigate to relevant pages
- Use filters to adjust time ranges (if available)

---

## Interns Management

### Purpose

View and manage all intern records, track progress, and perform oversight actions.

### Interns Table

**Columns:**
- **Name**: Intern's full name
- **Email**: Contact email
- **Track**: Role track (Technology, Strategy/Ops, Operations, Marketing)
- **Role State**: Current state (INTERN_ACTIVE, ACTING_EXECUTIVE, etc.)
- **Tests Completed**: Count of passed tests
- **Last Review**: Date of most recent review
- **Actions**: Dropdown menu for oversight actions

### Filters

- **Track**: Filter by role track
- **Role State**: Filter by current state
- **Search**: Search by name or email

### Oversight Actions

Available via the Actions dropdown:

1. **View Details**
   - Full intern profile
   - Test history and results
   - Review history
   - Promotion eligibility status

2. **Assign Test**
   - Manually assign a test module
   - Override auto-assignment if needed
   - Set due dates

3. **Force Review**
   - Trigger a review outside normal schedule
   - Useful for performance issues or special circumstances

4. **Change Role State**
   - Manually adjust role state (with audit log)
   - Use sparingly - prefer promotion rules
   - Requires justification

5. **View Audit Trail**
   - See all actions taken for this intern
   - Review history of state changes

### Best Practices

- Review interns regularly (weekly recommended)
- Use filters to focus on specific cohorts
- Document reasons for manual interventions
- Check audit trail before making changes

---

## Test Module Library

### Purpose

Create, manage, and configure competency test modules that interns must complete.

### Test Module Types

1. **Quiz**: Multiple choice or short answer questions
2. **Scenario**: Situational judgment test
3. **Artifact**: Deliverable (document, code, analysis)
4. **Build**: Functional project or tool
5. **Memo**: Written executive communication

### Module Categories

- **Onboarding**: Initial requirements (Culture, Role Understanding, Safety)
- **Ops**: Operations and process competency
- **Tech**: Technical and engineering skills
- **Compliance**: Regulatory and safety requirements
- **Leadership**: Executive judgment and communication
- **Quality**: Process design and risk management

### Module Levels

- **L1**: Entry-level, foundational
- **L2**: Intermediate, operational competency
- **L3**: Advanced, executive-level

### Creating a Test Module

1. Click **"New Module"** button
2. Fill in required fields:
   - **Name**: Descriptive title
   - **Description**: What the test evaluates
   - **Category**: Onboarding, Ops, Tech, etc.
   - **Level**: L1, L2, or L3
   - **Test Type**: Quiz, Scenario, Artifact, Build, or Memo
   - **Pass Threshold**: Minimum score (0-100)
   - **Time Limit**: Optional, in minutes
   - **Retake Limit**: How many attempts allowed
   - **Reviewer Type**: Auto, Manager, or Executive
   - **Artifact Required**: Check if deliverable needed
   - **Counts Toward Promotion**: Check if required for advancement
   - **Allowed Role States**: Which states can take this test
3. Add **Competency Tags**: Skills this test evaluates
4. Add **Instructions**: What the intern needs to do
5. Add **Content**: Questions, scenarios, or requirements (JSON format)
6. Click **"Create Module"**

### Editing a Module

1. Find the module in the table
2. Click the **Edit** icon
3. Modify fields as needed
4. Click **"Update Module"**

### Archiving a Module

- Click **Archive** to hide from active use
- Archived modules remain in history
- Can be unarchived if needed

### Auto-Assignment

- **Onboarding modules**: Automatically assigned when intern enrolls
- **Other modules**: Must be manually assigned or via promotion rules
- Check **"Auto-assign to new interns"** during creation if needed

### Promotion Logic

- Only modules with **"Counts Toward Promotion"** checked affect eligibility
- Academic modules (reflection, learning objectives) do NOT count
- Core competency modules (L3 tests) typically count toward promotion

### Best Practices

- Use clear, descriptive names
- Set appropriate pass thresholds (typically 70-85%)
- Include detailed instructions
- Tag competencies accurately
- Archive obsolete modules instead of deleting
- Test modules before making them required

---

## Role Tracks & Playlists

### Purpose

Define role tracks (e.g., Technology, Operations) and recommend test modules for each track.

### Important Note

**Playlists are recommendations only** - they do NOT automatically assign tests. Tests must be:
- Manually assigned, OR
- Assigned via Promotion Rules Engine

### Creating a Role Track

1. Click **"New Track"** button
2. Fill in:
   - **Track Name**: e.g., "Founder's Office – Technology"
   - **Description**: Track focus and requirements
   - **Minimum Test Level**: L1, L2, or L3
   - **Leadership Required**: Check if leadership competency needed
   - **Required Competency Tags**: Skills required for this track
   - **Recommended Test Modules**: Select modules for the playlist
   - **Active**: Check to enable the track
3. Click **"Create Track"**

### Recommended Test Modules (Playlist)

- Select modules that align with the track
- These appear as recommendations when assigning tests
- Interns can see recommended modules in their portal
- Does NOT auto-assign - manual or rule-based assignment required

### Track Requirements

- **Minimum Test Level**: Lowest level test required (e.g., L2)
- **Leadership Required**: If checked, leadership tests are mandatory
- **Required Competency Tags**: Skills that must be demonstrated

### Editing a Track

1. Click the **Edit** icon on a track card
2. Modify fields
3. Click **"Update Track"**

### Viewing Playlist

- Click the expand icon (chevron) on a track card
- See all recommended modules in a grid
- Modules show name, category, and level

### Best Practices

- Keep playlists focused and relevant
- Update playlists as new modules are created
- Align tracks with actual role requirements
- Review playlists quarterly

---

## Promotion Rules Engine

### Purpose

Define automated rules that govern intern advancement and role state changes.

### Rule Types

1. **Automatic Promotion**: Promote when criteria met
2. **Review Required**: Flag for review when criteria met
3. **Test Assignment**: Auto-assign tests based on state/conditions
4. **Reversion**: Revert to previous state if criteria not met

### Creating a Promotion Rule

1. Click **"New Rule"** button
2. Configure:
   - **Rule Name**: Descriptive name
   - **Trigger Condition**: When rule activates
     - Role state change
     - Test completion
     - Time-based (days in state)
     - Review completion
   - **Target Role State**: State to promote/revert to
   - **Required Tests**: Tests that must be passed
   - **Required Competencies**: Tags that must be demonstrated
   - **Minimum Test Level**: Lowest level test required
   - **Leadership Required**: If leadership tests needed
   - **Time in State**: Minimum days required
   - **Active**: Enable/disable rule
3. Click **"Create Rule"**

### Rule Priority

- Rules are evaluated in order (top to bottom)
- First matching rule executes
- Reorder rules by dragging (if available)

### Rule Conditions

**State-Based:**
- "When intern reaches INTERN_ACTIVE for 30 days"
- "When intern completes all L2 tests"

**Test-Based:**
- "When intern passes Platform Systems Audit"
- "When intern fails Safety & Compliance test"

**Review-Based:**
- "When manager review is submitted"
- "When executive review is overdue"

### Automatic Actions

When rule triggers:

1. **Promote**: Change role state (e.g., INTERN_ACTIVE → ACTING_EXECUTIVE)
2. **Assign Tests**: Auto-assign required modules
3. **Lock Tests**: Prevent access to non-eligible tests
4. **Send Notifications**: Alert intern and manager
5. **Log Action**: Create audit log entry

### Testing Rules

- Use test intern accounts to verify rules
- Check audit log after rule execution
- Monitor for unintended promotions

### Best Practices

- Start with simple rules, add complexity gradually
- Document rule logic clearly
- Test rules before activating
- Review rule effectiveness quarterly
- Keep rules aligned with business needs

---

## Reviews & Enforcement

### Purpose

Monitor review compliance, failed tests, and take enforcement actions.

### Overdue Reviews Panel

Lists reviews that are past due:

- **Manager Reviews**: Performance reviews not submitted
- **Test Reviews**: Test submissions awaiting review
- **Promotion Reviews**: Reviews required before promotion

**Actions:**
- Click to view details
- Send reminder notifications
- Escalate to manager's manager

### Failed Tests Panel

Shows tests that interns have failed:

- **Test Name**: Which test failed
- **Intern**: Who failed
- **Attempts**: How many times attempted
- **Last Attempt**: Date of most recent failure
- **Action Required**: What needs to happen

**Actions:**
- Review failure reasons
- Assign remediation
- Allow retake (if within limit)
- Consider alternative assessment

### Enforcement Actions

Available actions for non-compliance:

1. **Warning Letter**
   - Send formal warning
   - Document in audit log
   - Use template from Templates page

2. **Suspend Test Access**
   - Temporarily block test assignments
   - Requires remediation before re-enabling

3. **Revert Role State**
   - Move intern back to previous state
   - Requires justification
   - Logged in audit trail

4. **Exit from Program**
   - Remove intern from program
   - Change role state to EXITED
   - Send exit letter (from Templates)

### Review Workflow

1. System flags overdue review
2. Admin reviews circumstances
3. Admin sends reminder or takes action
4. Action logged in audit trail
5. Follow up to ensure compliance

### Best Practices

- Review overdue items weekly
- Document all enforcement actions
- Use progressive discipline (warning → suspend → exit)
- Maintain fairness and consistency
- Consider individual circumstances

---

## Roles & Permissions

### Purpose

Manage who has access to the Intern Program Admin portal and what roles interns can have.

### Required Role States

Reference guide showing all possible intern role states:

- **APPLIED**: Initial application state
- **INTERN_ACTIVE**: Active intern in program
- **ACTING_EXECUTIVE**: Temporary executive role
- **EXECUTIVE_OFFICER**: Full executive with expanded permissions
- **EXITED**: No longer in program
- **REVOKED**: Authority revoked for cause

### Program Roles

Reference guide showing intern program roles:

1. **Intern** (`INTERN`)
   - Portal user with read-only access
   - Can view own progress and complete assigned tests

2. **Intern Manager** (`INTERN_MANAGER`)
   - Manager for one or more interns
   - Can view assigned interns, submit reviews, assign tests, recommend promotion

3. **Executive Sponsor** (`INTERN_SPONSOR`)
   - Executive sponsor for intern conversion
   - Can approve conversions, override reviews, view all sponsored interns

4. **Program Admin** (`INTERN_PROGRAM_ADMIN`)
   - Full program operations and admin access
   - Can create/edit tests, define rules, take enforcement actions, access audit log

### Assigning Roles

1. Click **"Assign Role"** button
2. Enter **User Email** (must exist in system)
3. Select **Role** from dropdown
4. Click **"Assign Role"**
5. System validates user exists and assigns role
6. Action logged in audit trail

### Removing Roles

1. Find user in **User Role Assignments** table
2. Click **Remove** icon (X)
3. Confirm removal
4. Role removed and logged

### User Lookup

- System checks:
  1. `employees` table (if user is an employee)
  2. `auth.users` table (all authenticated users)
- If user not found, ensure they have an account in Supabase Auth
- Executive emails (e.g., CEO) should be findable if they can log in

### Best Practices

- Only assign Program Admin to trusted users
- Verify user email before assigning
- Remove roles when users leave organization
- Document role assignments in audit log
- Review role assignments quarterly

---

## Templates Management

### Purpose

Manage letter templates used for intern communications (warnings, promotions, exits, etc.).

### Template Types

1. **Warning Letter**: Formal warnings for non-compliance
2. **Promotion Letter**: Congratulations on advancement
3. **Exit Letter**: Program exit notification
4. **Review Reminder**: Reminder for overdue reviews
5. **Test Assignment**: Notification of new test assignment

### Creating a Template

1. Click **"New Template"** button
2. Fill in:
   - **Template Name**: Descriptive name
   - **Type**: Warning, Promotion, Exit, etc.
   - **Subject**: Email subject line
   - **Body**: Letter content (supports variables)
3. Click **"Create Template"**

### Template Variables

Use variables that are replaced with actual data:

- `{{intern_name}}`: Intern's full name
- `{{intern_email}}`: Intern's email
- `{{track}}`: Role track
- `{{role_state}}`: Current role state
- `{{test_name}}`: Test module name
- `{{manager_name}}`: Manager's name
- `{{date}}`: Current date

### Editing Templates

1. Find template in list
2. Click **Edit** icon
3. Modify content
4. Click **"Update Template"**

### Using Templates

- Templates are used automatically by the system
- Can be manually selected when sending letters
- Preview before sending
- All uses logged in audit trail

### Best Practices

- Keep templates professional and clear
- Test variables before using
- Update templates as program evolves
- Maintain consistent tone
- Review templates annually

---

## Audit Log

### Purpose

View chronological log of all administrative actions for compliance and troubleshooting.

### Log Entries

Each entry contains:

- **Timestamp**: When action occurred
- **Actor**: Who performed the action (user email/ID)
- **Action**: What was done (CREATE_TEST, ASSIGN_ROLE, etc.)
- **Entity Type**: What was affected (test_module, user_role, etc.)
- **Entity ID**: ID of affected record
- **Affected User**: Intern or user affected (if applicable)
- **Reason**: Justification or description
- **Source**: Where action originated (MANUAL, SYSTEM, HR_HANDOFF)

### Filtering

- **Date Range**: Filter by time period
- **Actor**: Filter by who performed action
- **Action Type**: Filter by action category
- **Entity Type**: Filter by what was affected
- **Search**: Search by reason or affected user

### Export

- Export logs to CSV for external analysis
- Use for compliance reporting
- Archive logs quarterly

### Common Actions Logged

- Test module creation/editing
- Role assignments/removals
- Test assignments
- Promotion rule changes
- Enforcement actions
- Role state changes
- Template updates

### Best Practices

- Review audit log regularly
- Investigate unusual patterns
- Use for troubleshooting issues
- Maintain for compliance
- Export for long-term storage

---

## Common Workflows

### Workflow 1: Enrolling a New Intern

**Prerequisites:**
- Intern candidate exists in HR system
- HR status = "Accepted"
- Start date is set

**Steps:**
1. HR creates candidate in HR Portal → Intern Candidates
2. HR sets status to "Accepted" and sets start date
3. System automatically:
   - Creates/updates person record
   - Creates `intern_program_enrollment`
   - Sets `role_state = INTERN_ACTIVE`
   - Assigns mandatory onboarding tests
   - Grants Intern Portal access
   - Sends enrollment email
   - Creates audit log entry
4. Intern appears in **Interns** table
5. Intern receives portal access email

**Manual Override (if needed):**
- Not recommended - use HR handoff system
- If manual enrollment required, use edge cases only
- Document reason in audit log

### Workflow 2: Creating and Assigning a Test

**Steps:**
1. Navigate to **Test Module Library**
2. Click **"New Module"**
3. Fill in module details (see Test Module Library section)
4. Click **"Create Module"**
5. Navigate to **Interns** table
6. Find intern who needs the test
7. Click **Actions** → **Assign Test**
8. Select the test module
9. Set due date (optional)
10. Click **"Assign"**
11. Intern receives notification
12. Action logged in audit trail

**Alternative: Auto-Assignment via Promotion Rules**
- Configure promotion rule to auto-assign test
- Rule triggers based on conditions
- No manual assignment needed

### Workflow 3: Promoting an Intern

**Automatic Promotion (Recommended):**
1. Intern completes required tests
2. Intern meets time-in-state requirement
3. Promotion rule evaluates criteria
4. System automatically:
   - Changes role state (e.g., INTERN_ACTIVE → ACTING_EXECUTIVE)
   - Assigns new tests for next level
   - Sends promotion notification
   - Creates audit log entry
5. Intern and manager notified

**Manual Promotion (If Needed):**
1. Navigate to **Interns** table
2. Find intern
3. Click **Actions** → **Change Role State**
4. Select new state
5. Enter justification
6. Click **"Change State"**
7. Action logged in audit trail

### Workflow 4: Handling a Failed Test

**Steps:**
1. Navigate to **Reviews & Enforcement**
2. Review **Failed Tests** panel
3. Click on failed test to view details
4. Review failure reasons and attempts
5. Decide action:
   - **Allow Retake**: If within retake limit
   - **Assign Remediation**: Additional training or review
   - **Consider Alternative**: Different assessment method
6. Take action via **Interns** → **Actions**
7. Document in audit log
8. Follow up to ensure resolution

### Workflow 5: Exiting an Intern from Program

**Steps:**
1. Navigate to **Interns** table
2. Find intern to exit
3. Click **Actions** → **Change Role State**
4. Select **EXITED**
5. Enter reason for exit
6. Navigate to **Templates**
7. Select **Exit Letter** template
8. Review and customize if needed
9. Send exit letter
10. Action logged in audit trail
11. Intern loses portal access (automatic)

---

## Best Practices

### General

1. **Document Everything**: All actions are logged, but add clear reasons
2. **Test Before Production**: Use test accounts to verify changes
3. **Review Regularly**: Check dashboard and alerts weekly
4. **Maintain Consistency**: Apply rules fairly to all interns
5. **Communicate Changes**: Notify team when rules or tests change

### Test Modules

1. **Clear Instructions**: Write detailed, unambiguous instructions
2. **Appropriate Difficulty**: Match level to intern's stage
3. **Fair Assessment**: Tests should measure competency, not trick interns
4. **Regular Updates**: Review and update tests quarterly
5. **Archive, Don't Delete**: Keep history by archiving obsolete tests

### Promotion Rules

1. **Start Simple**: Begin with basic rules, add complexity gradually
2. **Test Thoroughly**: Verify rules work before activating
3. **Document Logic**: Explain why rules exist
4. **Review Quarterly**: Ensure rules still align with business needs
5. **Monitor Impact**: Check if rules are achieving desired outcomes

### Role Management

1. **Least Privilege**: Only assign necessary roles
2. **Verify Users**: Ensure user exists before assigning role
3. **Remove Promptly**: Remove roles when users leave
4. **Regular Audits**: Review role assignments quarterly
5. **Document Assignments**: Note why roles were assigned

### Enforcement

1. **Progressive Discipline**: Warning → Suspend → Exit
2. **Consider Context**: Individual circumstances matter
3. **Document Actions**: Clear records of all enforcement
4. **Fair Application**: Apply consistently across all interns
5. **Follow Up**: Ensure actions are effective

---

## Troubleshooting

### Issue: Cannot Access Portal

**Symptoms:**
- Portal shows "Access Denied"
- Navigation items not visible

**Solutions:**
1. Verify you have `INTERN_PROGRAM_ADMIN` role
2. Check **Roles & Permissions** page
3. Log out and log back in to refresh permissions
4. Contact existing Program Admin to assign role

### Issue: User Not Found When Assigning Role

**Symptoms:**
- Error: "User not found with that email"

**Solutions:**
1. Verify user exists in Supabase Auth (they must be able to log in)
2. Check if email is correct (case-insensitive)
3. If executive email, ensure they have auth account
4. Try using different email format if user has multiple emails
5. Check **Audit Log** for lookup errors

### Issue: Test Module Not Appearing

**Symptoms:**
- Created module doesn't show in library

**Solutions:**
1. Check if module is archived (uncheck "Show Archived")
2. Verify filters (category, level) are correct
3. Refresh page
4. Check **Audit Log** for creation errors
5. Verify RLS policies allow viewing

### Issue: Promotion Rule Not Triggering

**Symptoms:**
- Intern meets criteria but not promoted

**Solutions:**
1. Check rule is **Active**
2. Verify rule conditions match intern's state
3. Check **Audit Log** for rule evaluation
4. Ensure no higher-priority rule is blocking
5. Test rule with test intern account

### Issue: Intern Not Receiving Notifications

**Symptoms:**
- Test assigned but intern not notified

**Solutions:**
1. Verify intern's email is correct
2. Check email service is functioning
3. Review **Audit Log** for notification errors
4. Check spam folder
5. Verify intern has portal access

### Issue: Cannot Assign Test

**Symptoms:**
- Error when trying to assign test

**Solutions:**
1. Verify test module is **Active** (not archived)
2. Check intern's role state allows test (see "Allowed Role States")
3. Verify intern hasn't exceeded retake limit
4. Check **Audit Log** for assignment errors
5. Ensure test is not already assigned

### Issue: Audit Log Missing Entries

**Symptoms:**
- Action performed but not logged

**Solutions:**
1. Check **Audit Log** filters (date range, action type)
2. Verify `log_intern_program_action` function exists
3. Check database logs for function errors
4. Ensure RLS policies allow viewing audit log
5. Contact database administrator if persistent

---

## Support & Escalation

### Internal Support

- **Technical Issues**: Contact development team
- **Process Questions**: Contact Program Admin lead
- **Access Issues**: Contact existing Program Admin

### Documentation

- This SOP: `docs/SOP-INTERN-PROGRAM-ADMIN.md`
- Database Schema: `supabase/migrations/`
- Code Documentation: Inline code comments

### Updates

- This SOP is updated as the portal evolves
- Check version number at top of document
- Review "Last Updated" date

---

## Appendix

### Role States Reference

| State | Description | Permissions |
|-------|-------------|-------------|
| APPLIED | Initial application | None (pre-enrollment) |
| INTERN_ACTIVE | Active intern | Intern Portal access, test completion |
| ACTING_EXECUTIVE | Temporary executive | Limited executive permissions |
| EXECUTIVE_OFFICER | Full executive | Expanded executive permissions |
| EXITED | Left program | No access |
| REVOKED | Authority revoked | No access |

### Test Module Categories

- **Onboarding**: Initial requirements
- **Ops**: Operations competency
- **Tech**: Technical skills
- **Compliance**: Regulatory requirements
- **Leadership**: Executive judgment
- **Quality**: Process design

### Test Module Levels

- **L1**: Entry-level, foundational
- **L2**: Intermediate, operational
- **L3**: Advanced, executive-level

### Program Roles

- **INTERN**: Read-only portal access
- **INTERN_MANAGER**: Manage assigned interns
- **INTERN_SPONSOR**: Approve conversions
- **INTERN_PROGRAM_ADMIN**: Full admin access

---

**End of SOP**


