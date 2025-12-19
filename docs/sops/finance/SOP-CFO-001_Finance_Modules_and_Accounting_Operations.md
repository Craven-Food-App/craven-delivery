---
title: "SOP-CFO-001: Finance Modules & Accounting Operations"
document_id: "SOP-CFO-FIN-001"
version: "1.0"
effective_date: "2025-12-18"
department: "Finance"
category: "FINANCE"
process_owner: "CFO"
review_frequency: "Quarterly"
---

# SOP-CFO-001: Finance Modules & Accounting Operations

**Document ID:** SOP-CFO-FIN-001  
**Version:** 1.0  
**Effective Date:** December 18, 2025  
**Department:** Finance / Accounting / Treasury  
**Classification:** Internal - Executive Level

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [Access Requirements](#3-access-requirements)
4. [General Ledger](#4-general-ledger)
5. [Accounts Payable](#5-accounts-payable)
6. [Accounts Receivable](#6-accounts-receivable)
7. [Treasury & Banking](#7-treasury--banking)
8. [Team Management](#8-team-management)
9. [Payroll Management](#9-payroll-management)
10. [Driver Compensation](#10-driver-compensation)
11. [Financial Planning & Analysis](#11-financial-planning--analysis)
12. [Budget Management](#12-budget-management)
13. [Cash Flow Forecast](#13-cash-flow-forecast)
14. [Scenario Planning & Analysis](#14-scenario-planning--analysis)
15. [Audit & Compliance](#15-audit--compliance)
16. [Appendix](#16-appendix)

---

## 1. Purpose

This Standard Operating Procedure establishes guidelines for operating all financial modules within the CFO Portal. It defines processes, controls, and best practices for corporate accounting, treasury operations, payroll management, financial planning, and analysis functions.

---

## 2. Scope

This SOP applies to:
- Chief Financial Officer (CFO)
- Chief Executive Officer (CEO)
- Finance Team Members
- Accounting Staff
- Treasury Operations
- Payroll Administrators

### Systems Covered
- CFO Portal → All Finance Tabs
- General Ledger System
- Accounts Payable/Receivable
- Treasury Management
- Payroll Processing
- FP&A Tools

### Related Database Tables
| Module | Primary Tables |
|--------|---------------|
| General Ledger | `general_ledger`, `journal_entries`, `chart_of_accounts` |
| Accounts Payable | `invoices`, `departments`, `expense_categories` |
| Accounts Receivable | `accounts_receivable`, `receivables` |
| Treasury | `bank_accounts`, `reconciliations`, `intercompany_transfers` |
| Payroll | `employees`, `payroll_runs` |
| Driver Comp | `driver_earnings`, `compensation_config`, `driver_weekly_stats` |
| FP&A | `orders`, `budgets`, `financial_scenarios` |
| Budgets | `budgets`, `departments`, `expense_categories` |

---

## 3. Access Requirements

### 3.1 Authentication
- Valid Craven corporate credentials
- Multi-factor authentication (MFA) enabled
- Executive portal access privileges

### 3.2 Authorization Levels

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| CEO | Full Access | View all, approve all, universal override |
| CFO | Full Access | View all, create/modify all financial records |
| Finance Manager | Operational | Create entries, process payroll, manage budgets |
| Accountant | Limited | View transactions, create journal entries |
| Analyst | Read-Only | View reports and dashboards |

### 3.3 Access Path
```
CFO Portal → Select desired module from sidebar navigation
URL: /cfo-portal → Select tab
```

---

## 4. General Ledger

### 4.1 Overview
The General Ledger (GL) module provides enterprise-grade double-entry accounting capabilities for recording, categorizing, and reporting all financial transactions.

### 4.2 Key Metrics Dashboard

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Total Debits | Sum of all debit entries | Out of balance = Critical |
| Total Credits | Sum of all credit entries | Out of balance = Critical |
| Net Balance | Debits - Credits (should be 0) | ≠ 0 = Investigation required |
| Transaction Count | Number of GL entries | N/A |
| Active Accounts | Chart of accounts in use | N/A |

### 4.3 Core Functions

#### 4.3.1 Viewing Transactions
1. Navigate to **CFO Portal → General Ledger**
2. Use filters:
   - Date range picker
   - Status filter (Posted, Pending, Void)
   - Account filter
   - Search by description/reference
3. Click any row to view transaction details

#### 4.3.2 Creating Journal Entries
1. Click **"New Journal Entry"** button
2. Enter required fields:
   - Transaction Date
   - Description/Memo
   - Reference Number (auto-generated if blank)
3. Add line items:
   - Select Account from Chart of Accounts
   - Enter Debit OR Credit amount
   - Add line description
4. **CRITICAL:** Ensure Debits = Credits before saving
5. Click **"Post Entry"** or **"Save as Draft"**

#### 4.3.3 Chart of Accounts
| Account Type | Code Range | Examples |
|--------------|------------|----------|
| Assets | 1000-1999 | Cash, AR, Inventory |
| Liabilities | 2000-2999 | AP, Accrued Expenses |
| Equity | 3000-3999 | Retained Earnings |
| Revenue | 4000-4999 | Sales, Delivery Fees |
| Expenses | 5000-9999 | Salaries, Rent, Marketing |

### 4.4 Period Close Procedures
1. Review all pending transactions
2. Post or void as appropriate
3. Run trial balance report
4. Verify debits = credits
5. Generate period-end reports
6. Lock period (prevents further entries)

---

## 5. Accounts Payable

### 5.1 Overview
The Accounts Payable (AP) module manages vendor invoices, payment processing, and cash flow optimization for outgoing payments.

### 5.2 Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Total Outstanding | Unpaid invoice total | Monitor cash needs |
| Total Overdue | Past-due amount | < 5% of total |
| Invoice Count | Number of open invoices | N/A |
| Avg Days to Pay | Average payment timing | ≤ Payment terms |
| Cash Flow Impact | 30-day payment forecast | Plan accordingly |

### 5.3 Invoice Lifecycle

```
Invoice Received → Data Entry → Approval Queue → Approved/Rejected
                                                      ↓
                                               Payment Scheduled
                                                      ↓
                                               Payment Processed
                                                      ↓
                                                    Paid
```

### 5.4 Core Functions

#### 5.4.1 Creating Invoices
1. Click **"New Invoice"** button
2. Enter vendor information:
   - Vendor Name
   - Vendor Email
   - Invoice Number
3. Enter financial details:
   - Invoice Date
   - Due Date
   - Amount
   - Tax Amount
4. Assign:
   - Department
   - Expense Category
   - Payment Terms
5. Upload supporting documents (if applicable)
6. Submit for approval

#### 5.4.2 Invoice Approval Workflow
1. Navigate to **"Pending"** tab
2. Review invoice details
3. Verify:
   - Amount accuracy
   - Proper authorization
   - Budget availability
   - Supporting documentation
4. Click **"Approve"** or **"Reject"**
5. Add approval notes if required

#### 5.4.3 Processing Payments
1. Navigate to **"Approved"** tab
2. Select invoices for payment
3. Choose payment method:
   - ACH Transfer
   - Wire Transfer
   - Check
4. Schedule payment date
5. Confirm and process
6. System updates status to **"Paid"**

### 5.5 Aging Report Categories

| Aging Bucket | Status | Action Required |
|--------------|--------|-----------------|
| Current | On-time | Monitor |
| 1-30 Days | Watch | Follow up |
| 31-60 Days | Warning | Prioritize |
| 61-90 Days | Critical | Immediate action |
| 90+ Days | Severe | Escalate to CFO |

---

## 6. Accounts Receivable

### 6.1 Overview
The Accounts Receivable (AR) module tracks customer invoices, manages collections, and monitors cash inflows.

### 6.2 Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Total Receivables | Outstanding customer balances | N/A |
| Total Overdue | Past-due amounts | < 10% of total |
| Collection Rate | Percentage collected | > 95% |
| Avg Days Outstanding | DSO metric | ≤ 30 days |

### 6.3 Invoice Status Flow

```
Created → Sent → Outstanding → Partially Paid/Paid
                      ↓
                  Overdue
                      ↓
              Collections Action
```

### 6.4 Core Functions

#### 6.4.1 Creating AR Invoices
1. Click **"New Invoice"** button
2. Enter customer information:
   - Customer Name
   - Customer Email
3. Enter invoice details:
   - Invoice Date
   - Due Date
   - Total Amount
   - Payment Terms
4. Add line items if applicable
5. Save and send to customer

#### 6.4.2 Recording Payments
1. Select invoice from list
2. Click **"Record Payment"**
3. Enter:
   - Payment Amount
   - Payment Date
   - Payment Method
   - Reference Number
4. Partial payments automatically update outstanding balance
5. Full payment marks invoice as **"Paid"**

#### 6.4.3 Collections Process
For invoices > 30 days overdue:
1. System generates collections alert
2. Send reminder email (automated or manual)
3. Log collection activity
4. Escalate if no response after 60 days
5. Consider write-off after 90 days (requires CFO approval)

### 6.5 AR Aging Dashboard

| View | Filter | Purpose |
|------|--------|---------|
| Outstanding | All open | Current AR snapshot |
| Overdue | Past due date | Collections focus |
| Paid | Settled invoices | Historical reference |
| All | No filter | Complete view |

---

## 7. Treasury & Banking

### 7.1 Overview
The Treasury & Banking module provides comprehensive cash management, bank account administration, reconciliation, and intercompany transfer capabilities.

### 7.2 Key Metrics

| Metric | Description | Alert |
|--------|-------------|-------|
| Total Cash Position | Sum of all accounts | < $100K = Warning |
| Available Balance | Liquid funds | < $50K = Critical |
| Pending Balance | Uncleared items | Monitor |
| Reconciliation Status | Tied vs Open | Open = Action needed |

### 7.3 Module Tabs

| Tab | Purpose |
|-----|---------|
| Accounts | Bank account management |
| Reconciliation | Period reconciliation |
| Cash Flow | Inflow/outflow analysis |
| Transfers | Intercompany movements |

### 7.4 Core Functions

#### 7.4.1 Managing Bank Accounts
1. Navigate to **Accounts** tab
2. To add account:
   - Click **"Add Account"**
   - Enter: Name, Institution, Currency
   - Enter opening balance
   - Save
3. To edit: Click account → Edit details
4. Track balances:
   - Current Balance
   - Available Balance
   - Pending Balance
   - Ledger Balance

#### 7.4.2 Bank Reconciliation Process
1. Navigate to **Reconciliation** tab
2. Click **"New Reconciliation"**
3. Select:
   - Period (YYYY-MM format)
   - Reconciliation Type (Bank, Intercompany, Adjustment)
4. Enter bank statement ending balance
5. Match transactions:
   - Mark cleared items
   - Identify discrepancies
6. Investigate differences
7. Create adjustment entries if needed
8. Mark reconciliation as **"Tied"** when balanced

#### 7.4.3 Intercompany Transfers
1. Navigate to **Transfers** tab
2. Click **"New Transfer"**
3. Select:
   - Source Account
   - Destination Account
4. Enter:
   - Amount
   - Description
   - Transfer Date
5. Submit for approval (if > threshold)
6. Execute transfer

### 7.5 Cash Flow Analysis
The Cash Flow view displays:
- Daily inflows (from receivables)
- Daily outflows (from payables)
- Net cash position
- 90-day historical trend

---

## 8. Team Management

### 8.1 Overview
The Team Management (Manager Console) module provides oversight of finance team operations, role assignments, and departmental KPIs.

### 8.2 Key Metrics Dashboard

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| AP Pending | Invoices awaiting action | > 20 = Review |
| AP Overdue | Past-due payables | > 0 = Action |
| AR Past Due | Overdue receivables ($) | > $10K = Alert |
| Close Tasks Open | Incomplete close items | > 5 = Critical |
| Reconciliations Open | Untied reconciliations | > 0 = Action |

### 8.3 Core Functions

#### 8.3.1 Role Management
1. View current team roles in table
2. To assign role:
   - Click **"Assign Role"**
   - Enter User ID
   - Select Role (CFO, Controller, AP Manager, AR Manager, etc.)
   - Save
3. To remove role:
   - Click trash icon on role row
   - Confirm removal

#### 8.3.2 Available Finance Roles

| Role | Permissions |
|------|-------------|
| CFO | Full access to all modules |
| Controller | GL, Close, Reports |
| AP Manager | Accounts Payable management |
| AR Manager | Accounts Receivable management |
| Treasury | Banking, reconciliation |
| Analyst | Read-only, reports |

### 8.4 Team Performance Monitoring
- Monitor KPI alerts
- Review workload distribution
- Identify bottlenecks
- Escalate critical items

---

## 9. Payroll Management

### 9.1 Overview
The Payroll Management module handles employee compensation processing, tax calculations, and payroll reporting.

### 9.2 Key Metrics

| Metric | Description |
|--------|-------------|
| Gross Payroll | Total pre-tax compensation |
| Employer Taxes | FICA, FUTA, SUTA (7.65% estimate) |
| Total Cost | Gross + Employer Taxes |
| Employee Count | Active employees |

### 9.3 Payroll Schedule
- **Frequency:** Biweekly
- **Pay Periods:** 26 per year
- **Processing Day:** Friday before pay date

### 9.4 Core Functions

#### 9.4.1 Viewing Employee Roster
1. Navigate to **Employees** tab
2. View employee details:
   - Name
   - Position
   - Department
   - Annual Salary
   - Pay Frequency

#### 9.4.2 Processing Payroll
1. Review current period details
2. Verify employee data accuracy
3. Review gross payroll amount
4. Review employer tax obligations
5. Click **"Process Payroll"**
6. System calculates:
   - Per-period amounts (Annual ÷ 26)
   - Tax withholdings
   - Net pay
7. Confirm and submit

#### 9.4.3 Payroll Reports
- Click **"Export Report"** for:
  - Payroll register
  - Tax summary
  - Department breakdown

### 9.5 Compliance Requirements
- Timely tax deposits (941)
- Quarterly tax filings
- Annual W-2 generation
- State compliance (varies)

---

## 10. Driver Compensation

### 10.1 Overview
The Driver Compensation module manages delivery driver earnings, compensation policies, and payout analytics for the gig economy workforce.

### 10.2 Compensation Model

| Component | Default Value | Description |
|-----------|---------------|-------------|
| Base Percentage | 70% | % of delivery fee to driver |
| Minimum per Delivery | $2.00 | Floor payment |
| Tips | 100% | Driver keeps all tips |
| Bonuses | Variable | Peak time, completion bonuses |

### 10.3 Key Performance Indicators

| KPI | Description | Target |
|-----|-------------|--------|
| Avg Hourly Earnings | Driver earnings/hour | > $15/hr |
| Payout vs Revenue | Driver pay ÷ delivery fees | ~70% |
| Profit per Delivery | Net after driver pay | > $1.00 |
| Total Payouts (7-day) | Weekly driver payments | N/A |

### 10.4 Core Functions

#### 10.4.1 Viewing Compensation Metrics
1. Navigate to **Metrics** tab
2. Review KPI cards:
   - Base percentage
   - Minimum per delivery
   - Average hourly earnings
   - Payout ratio
3. Analyze profitability

#### 10.4.2 Adjusting Compensation Config
1. Navigate to Settings (requires CFO approval)
2. Modify:
   - Base percentage
   - Minimum per delivery
   - Bonus thresholds
3. Save changes
4. Changes take effect immediately

#### 10.4.3 Driver Earnings Analysis
- View individual driver earnings
- Analyze earnings by:
  - Time period
  - Geography
  - Order type
- Identify top/bottom performers

### 10.5 Payout Process
- Daily earnings calculated automatically
- Weekly payouts processed
- Direct deposit to driver accounts
- Payout history available in portal

---

## 11. Financial Planning & Analysis

### 11.1 Overview
The FP&A module provides driver-based forecasting, multi-scenario planning, budget variance analysis, and strategic financial insights.

### 11.2 Module Tabs

| Tab | Purpose |
|-----|---------|
| Forecast | Multi-scenario revenue projections |
| Budget | Budget vs actual variance |
| Drivers | Key business driver analysis |

### 11.3 Forecast Scenarios

| Scenario | Probability | Assumptions |
|----------|-------------|-------------|
| Base Case | 50% | Conservative growth (5% MoM) |
| Optimistic | 25% | Strong execution (10% MoM) |
| Pessimistic | 25% | Market headwinds (2% MoM) |

### 11.4 Core Functions

#### 11.4.1 Viewing Forecasts
1. Navigate to **Forecast** tab
2. Review weighted metrics:
   - Weighted Revenue Forecast
   - Weighted Expense Forecast
   - Weighted Profit
3. View scenario comparison chart
4. Analyze probability-weighted outcomes

#### 11.4.2 Creating Scenarios
1. Click **"Create Scenario"**
2. Enter:
   - Scenario Name
   - Description
   - Probability (%)
   - Revenue assumptions
   - Expense assumptions
3. Add detailed assumptions
4. Save scenario

#### 11.4.3 Budget Variance Analysis
1. Navigate to **Budget** tab
2. Review variance by category:
   - Budgeted amount
   - Actual spend
   - Variance ($)
   - Variance (%)
3. Status indicators:
   - 🟢 On Track (< 5% variance)
   - 🟡 At Risk (5-10% variance)
   - 🔴 Over Budget (> 10% variance)

#### 11.4.4 Driver Analysis
1. Navigate to **Drivers** tab
2. Review key drivers:
   - Monthly Active Customers
   - Average Order Value
   - Headcount
   - Customer Acquisition Cost
3. Adjust forecast values
4. See impact on projections

### 11.5 Best Practices
- Update forecasts monthly
- Review actuals vs forecast weekly
- Adjust scenarios quarterly
- Document major assumptions

---

## 12. Budget Management

### 12.1 Overview
The Budget Management module enables creation, tracking, and management of departmental and categorical budgets.

### 12.2 Budget Structure

| Dimension | Description |
|-----------|-------------|
| Year | Fiscal year (e.g., 2025) |
| Quarter | Optional quarterly breakdown |
| Department | Organizational unit |
| Category | Expense classification |

### 12.3 Budget Status Types

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| Draft | In development | Edit, Delete |
| Active | Current budget | Track, Modify |
| Closed | Period ended | View only |
| Suspended | Temporarily paused | Reactivate |

### 12.4 Core Functions

#### 12.4.1 Creating a Budget
1. Click **"Create Budget"**
2. Enter:
   - Budget Name
   - Budget Year
   - Quarter (optional)
   - Department
   - Category
   - Allocated Amount
3. Set initial status (Draft or Active)
4. Save budget

#### 12.4.2 Budget Tracking
The system automatically tracks:
- **Allocated Amount:** Original budget
- **Spent Amount:** Actual expenditures
- **Committed Amount:** Approved but not paid
- **Remaining Amount:** Available balance

#### 12.4.3 Budget Utilization

| Utilization | Status | Color |
|-------------|--------|-------|
| 0-75% | Healthy | 🟢 Green |
| 75-90% | Warning | 🟡 Yellow |
| 90-100% | Critical | 🟠 Orange |
| > 100% | Over Budget | 🔴 Red |

#### 12.4.4 Modifying Budgets
1. Select budget from list
2. Click **"Edit"**
3. Modify allowed fields:
   - Allocated amount (requires approval if active)
   - Status
   - Notes
4. Save changes
5. Changes logged in audit trail

### 12.5 Budget Reports
- Export budget summary
- Department rollup
- Category analysis
- Year-over-year comparison

---

## 13. Cash Flow Forecast

### 13.1 Overview
The Cash Flow Forecast module projects future cash positions based on historical data, revenue forecasts, and expense assumptions.

### 13.2 Forecast Parameters

| Parameter | Default | Adjustable |
|-----------|---------|------------|
| Expense Ratio | 65% | Yes |
| Growth Rate | 5% MoM | Yes |
| Forecast Period | 6 months | No |

### 13.3 Core Functions

#### 13.3.1 Viewing Cash Flow Forecast
1. Review forecast chart showing:
   - Cash position (blue line)
   - Revenue (green bars)
   - Expenses (red bars)
2. View monthly breakdown table
3. Identify cash surplus/deficit periods

#### 13.3.2 Adjusting Assumptions
1. Modify **Expense Ratio** slider:
   - Lower = More optimistic
   - Higher = More conservative
2. Modify **Growth Rate** slider:
   - Affects revenue projections
3. Chart updates in real-time

#### 13.3.3 Forecast Methodology
The forecast uses:
1. Historical revenue data (trailing 12 months)
2. Most recent month's revenue as baseline
3. Applied growth rate for projections
4. Expense ratio for cost estimation
5. Cumulative cash calculation

### 13.4 Forecast Table Columns

| Column | Description |
|--------|-------------|
| Period | Month (YYYY-MM) |
| Projected Revenue | Based on growth rate |
| Projected Expenses | Revenue × Expense ratio |
| Net Cash Flow | Revenue - Expenses |
| Cumulative Cash | Running total |

### 13.5 Action Items
- Review forecast monthly
- Adjust assumptions quarterly
- Plan for deficit periods
- Identify investment opportunities during surplus

---

## 14. Scenario Planning & Analysis

### 14.1 Overview
The Scenario Planning module enables what-if analysis with base, optimistic, and pessimistic financial scenarios.

### 14.2 Scenario Definitions

| Scenario | Revenue Multiplier | Expense Multiplier | Probability |
|----------|-------------------|-------------------|-------------|
| Base | 1.0x | 1.0x | 50% |
| Optimistic | 1.3x | 1.1x | 25% |
| Pessimistic | 0.7x | 0.95x | 25% |

### 14.3 Key Metrics Per Scenario

| Metric | Calculation |
|--------|-------------|
| Profit | Revenue - Expenses |
| Margin | (Profit ÷ Revenue) × 100 |
| Runway | Cash Reserve ÷ Monthly Expenses |

### 14.4 Core Functions

#### 14.4.1 Setting Base Values
1. Enter **Base Revenue** amount
2. Enter **Base Expenses** amount
3. System auto-calculates:
   - Base scenario metrics
   - Optimistic scenario (130% revenue, 110% expenses)
   - Pessimistic scenario (70% revenue, 95% expenses)

#### 14.4.2 Analyzing Scenarios
1. Review three scenario cards:
   - **Base Case:** Most likely outcome
   - **Optimistic:** Best case
   - **Pessimistic:** Downside protection
2. Compare metrics:
   - Profit/Loss
   - Margin percentage
   - Cash runway (months)

#### 14.4.3 Saving Scenarios
1. Click **"Save Scenario"**
2. Scenario saved to database
3. Accessible for future comparison
4. Audit trail maintained

### 14.5 Strategic Use Cases
- Board presentations
- Investor discussions
- Budget planning
- Risk assessment
- Capital allocation decisions

---

## 15. Audit & Compliance

### 15.1 Data Retention
All financial data is retained per the following schedule:

| Data Type | Retention Period |
|-----------|-----------------|
| GL Transactions | 7 years |
| Invoices | 7 years |
| Payroll Records | 7 years |
| Bank Statements | 7 years |
| Audit Logs | Indefinite |

### 15.2 Audit Trail
All modules capture:
- User ID
- Action performed
- Timestamp
- Before/after values
- IP address

### 15.3 Internal Controls
- Segregation of duties
- Approval workflows
- Dollar thresholds
- Period locks
- Access logging

### 15.4 Compliance Requirements
| Requirement | Module | Frequency |
|-------------|--------|-----------|
| GL Reconciliation | General Ledger | Monthly |
| Bank Reconciliation | Treasury | Monthly |
| Payroll Tax Filing | Payroll | Quarterly |
| AR Aging Review | Accounts Receivable | Weekly |
| AP Aging Review | Accounts Payable | Weekly |

---

## 16. Appendix

### 16.1 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Refresh Data | F5 or Ctrl+R |
| New Entry | Ctrl+N |
| Save | Ctrl+S |
| Export | Ctrl+E |

### 16.2 Common Error Messages

| Error | Resolution |
|-------|------------|
| "Balance Error" | Ensure Debits = Credits |
| "Period Locked" | Contact Controller to unlock |
| "Approval Required" | Submit for approval workflow |
| "Insufficient Permissions" | Contact Finance Manager |

### 16.3 Support Contacts

| Issue | Contact |
|-------|---------|
| System Access | IT Help Desk |
| Process Questions | Finance Manager |
| Policy Exceptions | CFO |
| Technical Bugs | CTO Portal |

### 16.4 Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 18, 2025 | Finance Operations | Initial release |

---

**Document Owner:** Chief Financial Officer  
**Review Frequency:** Quarterly  
**Next Review:** March 18, 2026

---

*This document is confidential and intended for internal use only. Unauthorized distribution is prohibited.*

