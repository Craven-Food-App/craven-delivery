# Crave'n CFO System Access Governance & Data Ownership Map

**Document Key:** cfo_system_access_governance_v1

**Classification:** Systems, Security, Data Governance

**Effective Date:** {{effective_date}}

---

## 1. Purpose Of This Document

This document outlines the CFO's authority, responsibilities, and obligations related to financial systems, treasury platforms, reporting tools, and data governance. It establishes how financial data must be accessed, secured, managed, and audited inside Crave'n. It ensures a Fortune 500–level standard for financial data integrity, system access control, separation of duties, and security compliance.

---

## 2. System Ownership Overview

Crave'n recognizes the following systems as mission-critical financial platforms:

- **Accounting System:** (e.g., QuickBooks, NetSuite)
- **Treasury / Banking Portals:** (Bank dashboards, ACH, Wire portals)
- **Payroll System:** (e.g., Gusto, Rippling)
- **Financial Reporting Tools:** Internal dashboards, analytics tools
- **Vendor Management:** (e.g., Bill.com, Stripe Issuing)
- **Corporate Documents & Archives:** Supabase storage / legal repository

---

## 3. Data Source of Truth (Financial)

- **Accounting System:** Primary source of truth for financial statements
- **Bank Portals:** Primary source for cash balances and external transactions
- **Payroll System:** Primary source for employment payments and tax obligations
- **Vendor Systems:** Primary source for vendor obligations and AP/AR cycles
- **Internal Dashboards:** Must reconcile to accounting system before use

---

## 4. CFO System Access Responsibilities

The CFO is fully responsible for:

- Approving user access for all financial systems
- Ensuring permissions reflect separation of duties
- Maintaining audit logs for all financial actions
- Monitoring changes to vendor and banking credentials
- Ensuring MFA is enforced across systems
- Quarterly access review with CEO

---

## 5. CTO System Responsibilities Related to Finance

- Maintaining system uptime for internal financial dashboards
- Managing API security for data syncing
- Maintaining encryption, backups, and data integrity
- Implementing access controls technically (not approving them)
- Monitoring attempted security breaches

**Important:** CTO maintains the infrastructure, not the data authority.

---

## 6. Access Level Matrix

| System | CFO | CEO | CTO | COO | Finance Staff |
|--------|-----|-----|-----|-----|---------------|
| Banking/Treasury Portals | Full Access | Full Access | No Access | View Only (Optional) | No Access |
| Accounting System | Full Access | View Only | Admin (Technical Only) | View Only | Restricted (AP/AR Roles) |
| Payroll System | Full Access | View Reports | Technical Support Only | No Access | Restricted Payroll Roles |
| Vendor Platforms | Full Access | View Only | Technical Support Only | AP Support (Option) | Restricted |
| Internal Dashboards | Full | Full | Admin | Full | View |

---

## 7. Separation Of Duties Requirements

- The same person cannot create and approve vendor payments
- The same person cannot process and approve payroll
- The same person cannot manage both banking and accounting systems alone
- All payments above threshold require CFO + CEO approval

---

## 8. Audit Logging & Monitoring Requirements

- All financial systems must have audit logs enabled
- Logs must be retained for 7 years
- CFO must review logs quarterly
- Any unusual activity must be escalated immediately

---

## 9. Data Integrity Rules

- All financial data must reconcile to the accounting system
- Dashboards must not use unvalidated or incomplete datasets
- Manual data must have documented sources
- Forecasts must be version controlled with source files archived

---

## 10. Data Ownership Map

**The CFO owns:**

- Financial statements
- Forecasting models
- Treasury data
- Tax documents
- Budget files
- Investor financial documents
- Vendor payment records

**The CTO owns:**

- Infrastructure housing the data
- API connections
- Encryption and cybersecurity
- Access provisioning (once CFO approves)

---

## 11. Access Review Cadence

- Monthly — CFO self-review
- Quarterly — CFO + CTO joint review
- Annually — CFO + CEO complete organizational access audit

---

## 12. Acknowledgment

I acknowledge that I have read and understand this governance document.

**CFO Name:** ____________________________

**Signature:** _______________________________

**Date:** ____ / ____ / ______

