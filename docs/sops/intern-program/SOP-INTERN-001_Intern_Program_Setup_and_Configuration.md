---
title: "Intern Program Setup & Configuration"
document_id: "SOP-INTERN-001"
version: "1.0"
effective_date: "2025-12-18"
department: "Human Resources"
category: "INTERN PROGRAM"
process_owner: "HR Director"
review_frequency: "Quarterly"
---

# Intern Program Setup & Configuration

**Document ID:** SOP-INTERN-001  
**Version:** 1.0  
**Effective Date:** December 18, 2025  
**Department:** Human Resources  
**Process Owner:** HR Director  
**Review Frequency:** Quarterly  

---

## 1. PURPOSE

This SOP defines the process for setting up and configuring the Crave'n Intern Program from scratch, including system configuration, role creation, and initial program parameters.

---

## 2. SCOPE

**Applies to:**
- HR Directors
- HR Managers
- Intern Program Administrators
- IT Administrators

**Covers:**
- Initial program setup
- System configuration
- Role and permission setup
- Program parameter definition

---

## 3. DEFINITIONS

| Term | Definition |
|------|------------|
| **Intern Program Admin** | User with full access to configure and manage the intern program |
| **Program Parameters** | Configurable settings that define program rules (duration, evaluation frequency, etc.) |
| **Conversion Pathway** | The process and requirements for converting an intern to a full-time employee |
| **Academic Credit Program** | Partnership with educational institutions to provide course credit |

---

## 4. RESPONSIBILITIES

| Role | Responsibility |
|------|----------------|
| **HR Director** | Approve program parameters and policies |
| **HR Manager** | Configure system settings and manage program |
| **IT Administrator** | Set up technical infrastructure and permissions |
| **Intern Program Admin** | Day-to-day program management and configuration |

---

## 5. PREREQUISITES

Before starting this SOP, ensure:
- [ ] Database migrations have been run (`20251218000001_create_intern_program_tables.sql`)
- [ ] User roles and permissions system is configured
- [ ] HR Portal access is set up
- [ ] Document storage (Supabase Storage) is configured
- [ ] Email notification system is functional

---

## 6. PROCEDURE

### Step 1: Access Intern Program Admin Portal

**Who:** HR Director or IT Administrator  
**When:** Initial setup  
**Time:** 5 minutes

1. Log in to Crave'n platform with admin credentials
2. Navigate to **HR Portal** from the main menu
3. Click on **Intern Program Admin** in the sidebar
4. Verify you have access to all admin tabs:
   - Program Settings
   - Role Tracks & Playlists
   - Test Module Library
   - Promotion Rules Engine
   - Templates
   - Interns Table
   - Reviews Enforcement
   - Roles & Permissions
   - Audit Log

**Expected Result:** All admin tabs are visible and accessible

---

### Step 2: Configure Program Parameters

**Who:** HR Director  
**When:** Initial setup  
**Time:** 30 minutes

1. Navigate to **Program Settings** tab
2. Set the following core parameters:

#### Program Duration Settings
```
Minimum Program Duration: 90 days
Maximum Program Duration: 365 days
Default Program Duration: 180 days
Extension Allowed: Yes
Maximum Extensions: 2
Extension Duration: 90 days each
```

#### Evaluation Settings
```
Onboarding Evaluation: Day 14
Mid-Term Evaluation: Day 45
Final Evaluation: Day 90
Quarterly Reviews: Enabled
Performance Review Frequency: Every 30 days
```

#### Time Tracking Settings
```
Minimum Hours Per Week: 10 hours
Maximum Hours Per Week: 40 hours
Overtime Allowed: No
Time Log Approval Required: Yes
Time Log Approval Deadline: 7 days
```

#### Academic Credit Settings
```
Academic Credit Program Enabled: Yes
Minimum Hours for Credit: 120 hours
Credit Verification Required: Yes
Institution Approval Required: Yes
```

3. Click **Save Program Parameters**
4. Verify settings are saved successfully

**Expected Result:** Program parameters are configured and saved

---

### Step 3: Define Intern Role Tracks

**Who:** HR Manager  
**When:** Initial setup  
**Time:** 45 minutes

1. Navigate to **Role Tracks & Playlists** tab
2. Click **Create New Role Track**
3. For each department, create a role track:

#### Example: Engineering Intern Track

**Track Information:**
```
Track Name: Software Engineering Intern
Department: Engineering
Duration: 180 days
Eligible for Conversion: Yes
Target Position: Junior Software Engineer
```

**Required Skills:**
- Programming fundamentals
- Version control (Git)
- Code review practices
- Testing & debugging
- Documentation

**Learning Modules (Playlist):**
1. Crave'n Engineering Onboarding (Week 1)
2. React & TypeScript Fundamentals (Weeks 2-4)
3. Backend Development with Supabase (Weeks 5-7)
4. Testing & Quality Assurance (Weeks 8-10)
5. Production Deployment (Weeks 11-12)
6. Advanced Topics & Specialization (Weeks 13-24)

**Deliverables:**
- Complete 3 code reviews
- Ship 1 feature to production
- Write technical documentation
- Present at team demo

4. Click **Save Role Track**
5. Repeat for other departments:
   - Operations Intern
   - Marketing Intern
   - Finance Intern
   - Customer Experience Intern
   - HR Intern

**Expected Result:** All role tracks are created and configured

---

### Step 4: Create Test Modules & Assessments

**Who:** HR Manager + Department Heads  
**When:** Initial setup  
**Time:** 2 hours

1. Navigate to **Test Module Library** tab
2. Click **Create New Module**

#### For Each Role Track, Create Modules:

**Module Structure:**
```
Module Name: [Topic] Assessment
Role Track: [Engineering/Operations/etc.]
Module Type: Quiz | Practical | Project
Passing Score: 70%
Attempts Allowed: 3
Time Limit: 60 minutes (if applicable)
```

**Example: Engineering Onboarding Quiz**
```
Module Name: Engineering Onboarding Assessment
Role Track: Software Engineering Intern
Module Type: Quiz
Questions: 20
Passing Score: 80%
Attempts Allowed: 2
Topics Covered:
- Company values & culture
- Engineering workflows
- Code standards
- Security best practices
- Communication protocols
```

3. Add questions to each module:
   - Multiple choice
   - True/False
   - Short answer
   - Code challenges (for technical roles)

4. Set prerequisites (if applicable):
   ```
   Prerequisites: [List required modules]
   Unlock Condition: Complete previous module with 80%+
   ```

5. Click **Save Module**
6. Click **Publish Module** when ready

**Expected Result:** Test module library is populated with assessments for each role track

---

### Step 5: Configure Promotion Rules Engine

**Who:** HR Director  
**When:** Initial setup  
**Time:** 30 minutes

1. Navigate to **Promotion Rules Engine** tab
2. Click **Create New Rule Set**

#### Intern-to-Employee Conversion Rules

**Rule Set Name:** Intern to Full-Time Employee Conversion

**Eligibility Criteria:**
```yaml
Minimum Days Completed: 90
Minimum Performance Score: 4.0 / 5.0
Required Evaluations Completed: 3
Required Modules Passed: All assigned modules
Minimum Attendance Rate: 95%
Disciplinary Actions: None
Manager Recommendation: Required
```

**Approval Workflow:**
```yaml
Step 1: Direct Manager Approval (Required)
Step 2: Department Head Approval (Required)
Step 3: HR Director Approval (Required)
Step 4: Executive Sponsor Approval (Required for positions above entry-level)
Step 5: CEO Approval (Required for leadership track)
```

**Automatic Checks:**
- [ ] All tasks completed
- [ ] All deliverables submitted and approved
- [ ] Time logs approved and up-to-date
- [ ] Exit interview scheduled (if not converting)
- [ ] Performance scores meet threshold

3. Click **Save Rule Set**
4. Click **Activate Rule Set**

**Expected Result:** Promotion rules are configured and active

---

### Step 6: Set Up Document Templates

**Who:** HR Manager  
**When:** Initial setup  
**Time:** 1 hour

1. Navigate to **Templates** tab
2. Click **Create New Template**

#### Required Templates:

**1. Intern Offer Letter**
```
Template Name: Intern Offer Letter
Category: Onboarding
Requires Signature: Yes
Signers: Intern, HR Director
Placeholders:
- {{intern_name}}
- {{start_date}}
- {{end_date}}
- {{role_title}}
- {{department}}
- {{stipend_amount}}
- {{work_schedule}}
```

**2. Learning Agreement (for Academic Credit)**
```
Template Name: Academic Learning Agreement
Category: Academic Credit
Requires Signature: Yes
Signers: Intern, Academic Advisor, Intern Supervisor, HR
Placeholders:
- {{intern_name}}
- {{institution_name}}
- {{course_code}}
- {{credit_hours}}
- {{learning_objectives}}
- {{evaluation_criteria}}
```

**3. Performance Evaluation Form**
```
Template Name: Intern Performance Evaluation
Category: Performance Management
Requires Signature: Yes
Signers: Evaluator, Intern (acknowledgment)
Sections:
- Technical Skills (1-5 rating)
- Communication (1-5 rating)
- Teamwork (1-5 rating)
- Initiative (1-5 rating)
- Quality of Work (1-5 rating)
- Strengths (text)
- Areas for Improvement (text)
- Goals for Next Period (text)
```

**4. Conversion Offer Letter**
```
Template Name: Intern to FTE Conversion Offer
Category: Conversion
Requires Signature: Yes
Signers: Intern, HR Director, CEO
Placeholders:
- {{intern_name}}
- {{new_position_title}}
- {{start_date}}
- {{salary}}
- {{benefits_summary}}
- {{equity_grant}} (if applicable)
```

**5. Exit Interview Form**
```
Template Name: Intern Exit Interview
Category: Offboarding
Requires Signature: No
Sections:
- Overall Experience Rating
- What went well
- What could be improved
- Skills gained
- Future career plans
- Would you recommend this program?
- Additional feedback
```

3. For each template:
   - Upload template file (Word/PDF)
   - Define placeholders
   - Set signature requirements
   - Configure approval workflow
   - Click **Save Template**

**Expected Result:** All required templates are created and available

---

### Step 7: Configure Roles & Permissions

**Who:** IT Administrator  
**When:** Initial setup  
**Time:** 20 minutes

1. Navigate to **Roles & Permissions** tab
2. Verify the following roles exist:

#### Intern Program Roles

| Role | Permissions |
|------|-------------|
| **Intern** | View own data, submit deliverables, log time, view feedback |
| **Intern Manager** | View team interns, assign tasks, provide feedback, approve time logs, conduct evaluations |
| **Intern Program Admin** | Full access to all intern data, configure program settings, manage templates |
| **Executive Sponsor** | View sponsored interns, approve conversion requests, provide strategic feedback |
| **Academic Coordinator** | Manage academic credit, verify learning agreements, submit grades |
| **HR Intern Coordinator** | Manage onboarding/offboarding, track compliance, generate reports |

3. For each role, verify permissions:
   - Click role name
   - Review permission checkboxes
   - Ensure appropriate access levels
   - Click **Save Permissions**

4. Assign roles to users:
   - Navigate to **Interns Table** tab
   - Click **Assign Roles**
   - Select users and assign appropriate roles
   - Click **Save Assignments**

**Expected Result:** All roles are configured with correct permissions

---

### Step 8: Set Up Notification Rules

**Who:** HR Manager  
**When:** Initial setup  
**Time:** 15 minutes

1. Navigate to **Program Settings** > **Notifications**
2. Configure email notifications:

#### Notification Events

```yaml
Intern Onboarding:
  - Welcome email (Day 0)
  - Onboarding checklist reminder (Day 3)
  - First evaluation reminder (Day 12)

Task Management:
  - Task assigned notification (immediate)
  - Task due reminder (2 days before)
  - Task overdue alert (1 day after)

Evaluations:
  - Evaluation scheduled (7 days before)
  - Evaluation reminder (1 day before)
  - Evaluation completed confirmation

Time Logs:
  - Weekly time log reminder (Every Friday)
  - Unapproved time log alert (Manager, every Monday)

Conversion Pathway:
  - Eligibility achieved notification
  - Conversion offer extended
  - Conversion decision reminder (7 days)

Offboarding:
  - Exit interview scheduled
  - Final day reminder (3 days before)
  - Offboarding checklist reminder
```

3. Set notification recipients:
   - Intern (primary)
   - Manager (CC)
   - HR Coordinator (BCC)

4. Click **Save Notification Rules**

**Expected Result:** Automated notifications are configured

---

### Step 9: Create Initial Program Documentation

**Who:** HR Manager  
**When:** Initial setup  
**Time:** 2 hours

1. Navigate to **Company Portal** > **SOP Documents**
2. Create the following SOPs (use this document as a template):
   - [ ] SOP: Intern Program Setup (this document)
   - [ ] SOP: Intern Onboarding Process
   - [ ] SOP: Task Assignment & Tracking
   - [ ] SOP: Performance Reviews
   - [ ] SOP: Academic Credit Management
   - [ ] SOP: Intern-to-Employee Conversion
   - [ ] SOP: Intern Exit Process
   - [ ] SOP: Manager Portal Usage
   - [ ] SOP: Executive Sponsor Workflow

3. For each SOP:
   - Click **Create New SOP**
   - Enter SOP details
   - Upload document
   - Set access permissions
   - Click **Publish**

**Expected Result:** All SOPs are published and accessible

---

### Step 10: Test Program Configuration

**Who:** HR Manager + IT Administrator  
**When:** Initial setup  
**Time:** 1 hour

1. Create a test intern account:
   ```
   Email: test.intern@cravenusa.com
   Name: Test Intern
   Role Track: Software Engineering Intern
   Start Date: Today
   ```

2. Test the following workflows:
   - [ ] Intern can log in
   - [ ] Intern sees onboarding checklist
   - [ ] Manager can assign task
   - [ ] Intern receives task notification
   - [ ] Intern can submit deliverable
   - [ ] Manager can approve deliverable
   - [ ] Intern can log time
   - [ ] Manager can approve time log
   - [ ] Evaluation can be created
   - [ ] Evaluation can be completed
   - [ ] Conversion eligibility is calculated correctly
   - [ ] Offboarding can be initiated

3. Verify data is stored correctly:
   - Check database tables
   - Verify audit logs
   - Confirm notifications sent

4. If any issues found:
   - Document issue
   - Fix configuration
   - Re-test

**Expected Result:** All workflows function correctly

---

### Step 11: Launch Program

**Who:** HR Director  
**When:** After successful testing  
**Time:** 30 minutes

1. Review all configuration settings
2. Verify all SOPs are published
3. Verify all templates are ready
4. Verify all roles and permissions are correct
5. Schedule team training:
   - HR team training
   - Manager training
   - Executive sponsor training

6. Announce program launch:
   - Internal company announcement
   - Update careers page
   - Post on social media (if applicable)

7. Begin accepting intern applications

**Expected Result:** Intern program is live and accepting applications

---

## 7. VERIFICATION & QUALITY CHECKS

After completing setup, verify:

- [ ] All database tables exist and are accessible
- [ ] All role tracks are defined
- [ ] All test modules are created
- [ ] Promotion rules are active
- [ ] Templates are available
- [ ] Notifications are working
- [ ] SOPs are published
- [ ] Test intern workflow completed successfully
- [ ] All stakeholders are trained
- [ ] Program is announced

---

## 8. TROUBLESHOOTING

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Cannot access Intern Program Admin | Missing permissions | Verify user has `intern_program_admin` role |
| Templates not appearing | Not published | Check template status, click "Publish" |
| Notifications not sending | Email service not configured | Verify Supabase edge function for emails |
| Role track not showing | Not saved properly | Re-create role track and verify save |
| Conversion rules not working | Rules not activated | Navigate to Promotion Rules Engine, click "Activate" |

---

## 9. RELATED DOCUMENTS

- SOP-INTERN-002: Intern Onboarding Process
- SOP-INTERN-003: Task Assignment & Tracking
- SOP-INTERN-004: Performance Reviews
- SOP-INTERN-005: Academic Credit Management
- SOP-INTERN-006: Intern-to-Employee Conversion
- SOP-INTERN-007: Intern Exit Process
- SOP-INTERN-008: Manager Portal Usage
- SOP-INTERN-009: Executive Sponsor Workflow

---

## 10. REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-18 | Invero | Initial creation |

---

## 11. APPROVAL

| Role | Name | Signature | Date |
|------|------|-----------|------|
| HR Director | _____________ | _____________ | ______ |
| CTO | _____________ | _____________ | ______ |
| CEO | _____________ | _____________ | ______ |

---

**Document Control:**  
This is a controlled document. Any printed copy is considered uncontrolled. Always refer to the digital version in the Company Portal for the most current version.

**Questions or Feedback:**  
Contact: hr@cravenusa.com

