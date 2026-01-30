# Merchant / Restaurant Financial Flow – End-to-End Overview

**Date:** December 23, 2025  
**Prepared For:** CFO & Finance Leadership  
**Scope:** Merchant / Restaurant Financial Lifecycle (Craven Delivery Platform)  

---

## 1. Overview

This document provides an end-to-end view of the **financial flow for merchants/restaurants** on the Craven Delivery platform, from onboarding and pricing through order processing, settlement, payouts, adjustments, and reconciliation. It is designed for CFO-level understanding and assumes Moov is the underlying payment processor.

Key objectives:

- Explain how restaurants are **onboarded, verified, and configured** financially.  
- Show, step by step, how **money moves** on a typical order involving a restaurant.  
- Clarify the **commission, fee, and payout calculations** that determine restaurant net proceeds.  
- Describe how **refunds, chargebacks, and disputes** are handled for restaurants.  
- Outline the **reporting and reconciliation** available to Finance.  

---

## 2. Merchant Onboarding and Financial Configuration

### 2.1 Business Verification and Account Setup

When a new restaurant joins the platform, the following financial setup occurs:

1. **Restaurant Profile Creation**
   - Legal entity details (name, EIN, address) captured.
   - Banking details collected for payouts (routing, account number, account type).
   - Tax profile configured (e.g., 1099-K recipient if applicable).

2. **Compliance and Risk Checks (via Moov)**
   - **KYB (Know Your Business):** Business identity is verified.  
   - **Beneficial owners / control persons** collected and run through KYC as needed.  
   - Bank account ownership is validated (instant bank verification or micro-deposits).  
   - Results drive approval, additional documentation, or rejection.

3. **Moov Merchant Account Creation**
   - A Moov merchant account is created and linked to the restaurant record.
   - Payout channels (ACH, optional RTP / instant push-to-card) are enabled based on risk and configuration.

4. **Financial Defaults Applied**
   - Commission tier (Bronze/Silver/Gold/Platinum/Elite) or custom override assigned.
   - Payout schedule defaulted to **daily** with standard ACH.
   - Currency and settlement preferences set (USD, T+1 settlement, etc.).

### 2.2 Commission and Fee Configuration

Commission and fee configuration for each restaurant is defined as follows (aligned with the existing 5-tier system):

| Setting                         | Description                                              | Example Default            |
|---------------------------------|----------------------------------------------------------|----------------------------|
| Base Commission Rate            | Percentage of food subtotal retained by platform         | 15% (Silver tier)          |
| Tiered Commission Structure     | Volume-based commission tiers                            | 8%–18% depending on tier   |
| Service Fee                     | Customer-facing fee on order subtotal                    | 10%                        |
| Delivery Fee                    | Base + per-mile fee charged to customer                  | $2.99 + $0.50/mile         |
| Geographic Adjustments          | Market-specific overrides by zone                        | Higher in dense urban core |
| Promotional/Override Rates      | Temporary or contract-based commission rates             | e.g., 8% for 90 days       |

These settings determine how much of each order’s value flows to the restaurant versus the platform.

---

## 3. Order Lifecycle – Merchant Financial View

### 3.1 High-Level Flow

At a high level, the merchant-related financial flow for a paid order is:

1. Customer places an order and pays via card or “pay by bank” (ACH) using Moov.
2. Platform collects funds into a Moov-controlled balance.  
3. System books platform revenue (commission, service fee, delivery fee).  
4. Restaurant’s **gross order amount** is tracked as payable to the restaurant.  
5. At payout time, restaurant receives **net of commission and adjustments**.  

### 3.2 Per-Order Amounts (Illustrative)

Assumptions (restaurant-side example):

- Food subtotal: **$30.00**  
- Restaurant tier: **Silver** (15% commission)  
- Service fee to customer: **10%** of subtotal = **$3.00**  
- Delivery fee to customer: **$4.49**  
- Customer payment method: Card via Moov (effective 2.7% processing cost modeled on total customer payment)  

**Customer Bill:**

- Food: $30.00  
- Service fee: $3.00  
- Delivery fee: $4.49  
- **Total paid by customer:** $37.49  

**Platform Revenue Components:**

- Restaurant commission: $30.00 × 15% = **$4.50**  
- Service fee: **$3.00**  
- Delivery fee: **$4.49**  
- **Total platform gross revenue:** **$11.99**  

**Restaurant Financial Position (Per Order):**

- Gross food sales (restaurant subtotal): **$30.00**  
- Less: Commission (15%): **$4.50**  
- **Restaurant net proceeds before any other adjustments:** **$25.50**  

The platform retains the service fee and delivery fee; these amounts do not pass through to the restaurant.

---

## 4. Settlement and Payout Mechanics

### 4.1 Settlement at the Platform Level (Moov)

Once the customer payment is successfully processed:

1. **Funds Settlement to Platform Balance**
   - Moov settles the processed amount (net of Moov processing fees) into the platform’s Moov balance.
   - Processing cost (modeled ~2.7% for cards, ~0.5% for ACH) is treated as a platform-level cost, not a per-restaurant line item.

2. **Internal Allocation**
   - Commission, service fee, and delivery fee are booked as platform revenue.
   - Restaurant’s share is recorded as a payable (liability) to that restaurant.

3. **Timing**
   - Settlement timelines depend on payment rail:
     - Card: typically T+1/T+2 settlement into platform balance.
     - ACH: depends on next-day vs same-day configuration.

### 4.2 Restaurant Payout Calculation

Payouts to restaurants are calculated on a **batch basis** (e.g., daily).

For each restaurant and each batch window:

1. Start with **Sum of eligible order subtotals** (e.g., all completed orders in the period).  
2. Subtract **platform commission** (tier, override, and geographic rules applied).  
3. Apply **adjustments**:
   - Refund reversals where the restaurant’s share is clawed back.  
   - Chargeback/dispute outcomes that impact the restaurant share (if applicable under policy).  
   - Manual adjustments (promotions, service recoveries, etc.).  
4. Resulting amount becomes the **payout amount** sent via Moov to the restaurant’s bank account.  

**Payout Formula (Per Period):**

```text
Restaurant Payout (period) =
  Σ(Eligible Order Subtotals)
  − Σ(Commission on those orders)
  − Σ(Restaurant-side adjustments: refunds, chargebacks, manual debits)
  + Σ(Restaurant-side credits: promos, incentives, manual credits)
```

### 4.3 Payout Frequency and Methods

- **Frequency:** Default daily automated payouts.  
- **Method:**  
  - Standard ACH (next-day or same-day, depending on configuration).  
  - Optional instant payout methods (RTP or push to card) for special programs.  
- **Minimum Thresholds:**  
  - Default: No minimum payout threshold (e.g., payout even for small balances).  
  - Can be configured per restaurant, if desired, to reduce micro-payouts.  

### 4.4 Example Payout Batch (Daily)

Assume Restaurant A has the following on a given day:

- 40 completed orders.  
- Total food subtotal: **$1,200.00**  
- Commission rate: **15%** → Commission: **$180.00**  
- No restaurant-side refunds or chargebacks during the day.  

**Daily Payout Calculation:**

- Gross restaurant sales: $1,200.00  
- Less platform commission: $180.00  
- No other adjustments  
- **Payout to restaurant:** **$1,020.00** via Moov ACH.  

Platform retains:

- Commission revenue: $180.00  
- Service fees and delivery fees for those orders (recorded separately, not part of restaurant payout).  

---

## 5. Refunds, Chargebacks, and Adjustments

### 5.1 Customer Refunds

When a customer refund is processed:

1. **Refund Initiation**
   - Full or partial refund initiated through the platform (e.g., due to order issues, cancellations, or service recovery).

2. **Financial Impact**
   - The customer’s payment is refunded via Moov.
   - The platform reverses its own revenue components (commission, service fee, delivery fee) in line with policy:
     - Typically, commission on refunded items is **not kept**; it is reversed.
     - Service and delivery fees may be fully or partially refunded depending on the scenario.

3. **Restaurant Share Adjustment**
   - If the restaurant had already received payout for the refunded order, the restaurant account is debited for the refunded food portion on the **next payout run** (netted against that batch).  
   - If payout has not yet occurred, the restaurant’s payable is reduced before payout.

### 5.2 Chargebacks and Payment Disputes

Chargebacks occur when the cardholder disputes a transaction with their bank.

1. **Dispute Creation**
   - Card issuer opens a dispute; Moov notifies the platform via webhook.

2. **Temporary Reversal**
   - Disputed amount is debited from the platform’s balance.
   - The disputed portion of the restaurant’s revenue is flagged.

3. **Restaurant Impact**
   - If the original order was already included in a restaurant payout:
     - The restaurant’s future payouts are reduced by the disputed amount (according to policy).
   - If the dispute is lost:
     - The restaurant permanently loses its share on that order, consistent with terms.  
   - If the dispute is won:
     - Funds are returned and the restaurant’s share is restored in a subsequent payout.

4. **Fees**
   - Moov’s dispute/chargeback fees (if any at the platform level) are treated as platform operating expenses and are not itemized in the restaurant’s payout report, unless the business chooses to pass through a portion as a “chargeback fee” to the restaurant.

### 5.3 Manual Adjustments

Finance or operations can apply manual adjustments to restaurant balances, such as:

- Credits for goodwill or promotions funded by the platform.  
- Debits for non-payment, fraud, or contract-related clawbacks.  

All manual adjustments are:

- Logged with reason, amount, and user who created the adjustment.  
- Included in payout detail reports so restaurants can reconcile net payouts against gross sales.

---

## 6. Reporting for Merchants and CFO

### 6.1 Restaurant-Facing Reports

Each restaurant can access a financial view showing:

- Daily, weekly, and monthly **gross sales** (food subtotal).  
- Platform **commission withheld**.  
- Net payout amounts and payout dates.  
- Detail per order: order ID, date, subtotal, commission amount, net to restaurant.  
- Adjustments: refunds, chargebacks, manual credits/debits.

Typical restaurant-side report columns:

| Date       | Order ID | Subtotal | Commission | Adjustments | Net to Restaurant | Payout Batch ID | Payout Date |
|------------|----------|----------|------------|-------------|-------------------|-----------------|------------|
| 2025-12-01 | 12345    | $30.00   | $4.50      | $0.00       | $25.50            | PB-2025-12-02   | 2025-12-02 |

### 6.2 CFO / Finance Reporting

From the CFO perspective, the system provides:

- **Aggregate restaurant performance:**
  - Total GMV by restaurant, tier, geography.
  - Commission revenue by restaurant, tier, and period.
- **Liability tracking:**
  - Outstanding payables to restaurants by payout date.
  - Aging of unpaid restaurant balances (if any).  
- **Payout monitoring:**
  - Total payouts per day/week/month.
  - Payout success/failure rates and exception handling.  
- **Exception and risk monitoring:**
  - Refund and chargeback rates by restaurant.
  - Top restaurants by chargeback ratio or adjustment volume.

These metrics feed directly into:

- Monthly close process (revenue, COGS where applicable, liabilities).  
- Cash flow forecasts (expected restaurant payout cash outflows).  
- Profitability analysis by restaurant segment or geography.  

---

## 7. Reconciliation and Controls

### 7.1 Reconciliation Layers

Craven’s reconciliation for merchant/restaurant flows operates at three layers:

1. **Moov vs. Platform Records**
   - Reconcile Moov transactions and payouts against internal ledgers:
     - Processed payments per day.
     - Settlements to platform balance.
     - Payouts to restaurant bank accounts.

2. **Platform vs. Restaurant Payouts**
   - Ensure that for each payout batch:
     - Sum of net restaurant payouts equals the debits from platform balance.  
     - Each restaurant’s payout detail ties to orders, commissions, and adjustments.  

3. **Reporting vs. General Ledger**
   - Map internal tables (orders, payouts, adjustments) to GL accounts:
     - Restaurant payable accounts.
     - Commission revenue.
     - Processing fee expense.
     - Cash and settlement accounts.

### 7.2 Key Controls

- **Segregation of duties:**  
  - Different roles for configuring commission rates, initiating payouts, and approving adjustments.  
- **Dual approval on large adjustments:**  
  - High-value manual debits/credits to restaurant balances require multi-level approval.  
- **Audit trail:**  
  - Every commission change, payout run, and manual adjustment is logged with before/after values and user IDs.  
- **Regular access review:**  
  - Quarterly review of who can adjust restaurant financials or trigger payouts.  

---

## 8. Summary for CFO

From the merchant/restaurant perspective, the Craven Delivery platform provides:

- A clear and predictable **economic model** (tiered commissions, fixed service and delivery fee structure).  
- Automated **calculation and payout of restaurant earnings**, with transparent line-item detail.  
- Robust **handling of refunds, disputes, and adjustments**, with impacts clearly visible to both restaurants and Finance.  
- Strong **reconciliation and control framework**, aligning Moov transactions, internal ledgers, and GL accounts.

This design ensures that the CFO can:

- Reliably forecast platform commission revenue and restaurant payout obligations.  
- Understand the impact of commission changes or new pricing strategies on restaurant economics.  
- Have confidence that merchant/restaurant financial flows are controlled, auditable, and scalable as the business grows.  

---

**End of Document**


