# Order Financial Breakdown – Craven Delivery Platform

**Date:** December 23, 2025  
**Prepared For:** CFO & Finance Leadership  
**Scope:** End-to-end financial breakdown for a single customer order  

---

## 1. Purpose and Scope

This document provides a **detailed, line-by-line financial breakdown of a single order** on the Craven Delivery platform. It is intended to give the CFO a clear understanding of:

- How the **customer’s payment** is composed and which party receives each component.  
- How much **revenue the platform earns per order**, and from which sources.  
- How much is paid to **restaurants (merchants)** and **drivers (couriers)**.  
- How **payment processing costs (Moov)** and other adjustments impact net economics.  
- How special cases (e.g., **tips, discounts, refunds**) change the per-order breakdown.  

All numbers in this document are **illustrative** but aligned with the fee and pricing structures used elsewhere in the system.

---

## 2. Standard Order – Baseline Scenario

### 2.1 Assumptions

Baseline assumptions for the standard order scenario:

- Order type: Food delivery  
- Food subtotal (before taxes): **$30.00**  
- Restaurant commission tier: **Silver** (15% commission on food subtotal)  
- Customer service fee: **10%** of food subtotal  
- Delivery fee charged to customer: **$2.99 base + $0.50 × 3 miles = $4.49**  
- Customer tip to driver: **$5.00**  
- Sales tax: Excluded from platform revenue (assume passed through to restaurant/tax authority)  
- Payment method: **Card** via Moov  
  - Modeled processing cost: **2.7%** of total customer payment (effective, all-in)  

### 2.2 Customer-Facing Breakdown

What the customer sees and pays at checkout:

| Line Item       | Calculation                        | Amount  | Notes                                            |
|-----------------|------------------------------------|---------|--------------------------------------------------|
| Food Subtotal   | Given                               | $30.00  | Restaurant menu prices                           |
| Service Fee     | $30.00 × 10%                       | $3.00   | Platform fee, retained by platform               |
| Delivery Fee    | $2.99 + ($0.50 × 3 miles)         | $4.49   | Platform fee, retained by platform               |
| Driver Tip      | Given                               | $5.00   | 100% passed to driver                            |
| **Total Charge**| $30.00 + $3.00 + $4.49 + $5.00     | $42.49  | Excluding sales tax for simplicity               |

For internal economics, we focus on the components **excluding tips**, because tips are passed through to drivers.

---

## 3. Platform vs. Restaurant vs. Driver – Economic Split

### 3.1 Platform Revenue Components

From the platform’s perspective, per order:

| Component           | Calculation              | Amount  | Recipient     |
|---------------------|--------------------------|---------|---------------|
| Commission Revenue  | $30.00 × 15%            | $4.50   | Platform      |
| Service Fee         | $30.00 × 10%            | $3.00   | Platform      |
| Delivery Fee        | Given                    | $4.49   | Platform      |
| **Platform Gross Revenue (per order)** | $4.50 + $3.00 + $4.49 | **$11.99** | **Platform** |

### 3.2 Restaurant Economics

The restaurant’s view of the same order:

| Item                        | Calculation              | Amount  |
|----------------------------|--------------------------|---------|
| Gross Food Sales           | Given                    | $30.00  |
| Less: Commission (15%)     | $30.00 × 15%            | -$4.50  |
| **Net Proceeds to Restaurant** | $30.00 − $4.50          | **$25.50** |

The restaurant does **not** participate in the service fee or delivery fee, unless separately negotiated.

### 3.3 Driver Economics

Driver earnings per order:

| Item                       | Calculation                      | Amount  |
|---------------------------|----------------------------------|---------|
| Base Pay (delivery share) | $4.49 × 70%                     | $3.14   |
| Customer Tip              | Given                           | $5.00   |
| **Total Driver Earnings** | $3.14 + $5.00                   | **$8.14** |

Base pay is driven by the delivery fee; tips are a direct pass-through from the customer.

---

## 4. Payment Processing Costs (Moov) and Net Platform Revenue

### 4.1 Modeled Processing Cost

Moov processing costs are modeled on the **total amount processed** (excluding tip for platform margin analysis if desired). For clarity, we break out both approaches:

1. **On core transaction (excluding tip):**
   - Total core charge (food + service + delivery): $30.00 + $3.00 + $4.49 = **$37.49**
   - Modeled processing fee: $37.49 × 2.7% ≈ **$1.01**

2. **On full amount including tip (if modeled that way):**
   - Total with tip: $42.49
   - 2.7% of $42.49 ≈ $1.15  
   - For simplicity in this document, we use **$1.01** (core charge only) for platform unit economics.

### 4.2 Net Platform Revenue and Profit

Using the modeled processing cost of **$1.01**:

| Metric                       | Calculation                 | Amount    |
|------------------------------|-----------------------------|-----------|
| Platform Gross Revenue       | From section 3.1            | $11.99    |
| Less: Processing Fees (Moov) | ≈ 2.7% × $37.49            | -$1.01    |
| **Net Revenue (post-processing)** | $11.99 − $1.01              | **$10.98** |
| Less: Driver Base Pay        | $4.49 × 70%                | -$3.14    |
| **Gross Profit (pre-overhead)** | $10.98 − $3.14              | **$7.84** |

If we treat **driver tip** as fully pass-through and **not** part of platform gross revenue or cost, this $7.84 is the per-order contribution **before corporate overhead** (engineering, support, marketing, etc.).

Note: The CFO Financial System report uses a slightly more conservative framing that combines certain cost allocations and states **$2.46–$2.84 profit per order**, depending on which costs are included as “COGS” vs “operating expenses.” This document isolates the **pure transaction-level split**.

---

## 5. Alternative Scenarios

To understand sensitivity, we show several variant scenarios.

### 5.1 High-Tip Order (Customer Tips $10)

Changes from baseline:

- Tip increases from $5.00 to **$10.00**.
- All other assumptions remain the same.

Impacts:

- Customer total increases to **$47.49**.  
- Driver earnings increase to **$13.14** (base $3.14 + $10.00 tip).  
- Platform gross revenue **unchanged at $11.99**.  
- Processing fees increase slightly if modeled on full amount; if modeled on core charge, they remain **$1.01**.  

Economic takeaway: **Tips improve driver earnings but do not affect platform revenue or restaurant proceeds.**

### 5.2 Discounted Order (Promo Code)

Assumptions:

- Platform runs a promotion: **$5.00 off** the customer’s total (funded by platform).  
- Discount is applied proportionally across components (or against service/delivery fees), depending on implementation.  

Illustrative case – $5.00 applied against **service and delivery fees** first:

- Original service + delivery = $3.00 + $4.49 = $7.49.  
- Post-discount: $7.49 − $5.00 = $2.49.  
- Revised service fee: $1.00; revised delivery fee: $1.49 (for example).  

New platform gross revenue:

- Commission: $4.50 (unchanged).  
- Service + delivery: $1.00 + $1.49 = $2.49.  
- **New platform gross revenue:** $4.50 + $2.49 = **$6.99** (down from $11.99).  

Processing costs also fall modestly because the customer pays less, but the main impact is a **direct reduction in platform gross revenue** driven by the promotion.

### 5.3 ACH “Pay by Bank” Instead of Card

Assumptions:

- Customer uses ACH instead of card.  
- Moov ACH fee: **$0.25** or **$0.40** per transaction (depending on next-day vs same-day).  

Impacts:

- Platform gross revenue **unchanged at $11.99**.  
- Processing cost drops from **$1.01** (card, modeled 2.7%) to **$0.25–$0.40**.  
- Net revenue post-processing increases by roughly **$0.60–$0.75** per order compared to card.  

Economic takeaway: **Pay-by-bank improves per-order margin** without changing customer prices or restaurant/driver economics.

### 5.4 Partial Refund (Food Issue)

Assumptions:

- $10.00 of the food is refunded to the customer (e.g., missing item).  
- Commission and restaurant share are adjusted accordingly.  

Financial impacts:

- Customer refund: $10.00 (plus associated taxes as applicable).  
- Restaurant gross food sales reduced from $30.00 to **$20.00**.  
- Commission recalculated: $20.00 × 15% = **$3.00** (vs. original $4.50).  
- Restaurant net proceeds: $20.00 − $3.00 = **$17.00**.  

Platform revenue adjustments:

- Commission revenue reduced by **$1.50**.  
- Depending on policy, service and delivery fees may be partially or fully refunded:
  - If fully refunded: platform loses the $3.00 service and $4.49 delivery revenue on the refunded portion.  
  - If partially refunded: only a portion of those fees is reversed.  

### 5.5 Chargeback / Dispute

Assumptions:

- Full order amount is disputed and chargeback is lost.  
- The entire transaction is effectively reversed.  

Impacts:

- Platform returns the disputed funds via Moov.  
- Platform reverses its commission, service, and delivery revenue.  
- If the restaurant and driver were already paid:
  - Restaurant and/or driver balances are **debited on future payouts** to recover their portions, according to policy and terms.  
  - Any residual loss (e.g., if the platform chooses to absorb some or all of the restaurant/driver loss) is recognized as a **chargeback expense**.

Economic takeaway: Chargebacks can impact **all three parties** (platform, restaurant, driver) depending on contractual allocation of risk.

---

## 6. Summary Tables

### 6.1 Baseline Per-Order Summary (Card, No Discount, $5 Tip)

| Party        | Component                     | Amount  |
|-------------|-------------------------------|---------|
| Customer     | Total paid                    | $42.49  |
| Restaurant   | Net proceeds                  | $25.50  |
| Driver       | Base pay                      | $3.14   |
| Driver       | Tip                           | $5.00   |
| Platform     | Gross revenue (commission + fees) | $11.99 |
| Moov / Processing | Modeled fee (2.7% of $37.49) | $1.01   |

### 6.2 Platform View – Income Statement Style (Per Order)

| Line Item                   | Amount  | Notes                                         |
|----------------------------|---------|-----------------------------------------------|
| Gross Revenue              | $11.99  | Commission + service + delivery               |
| Less: Processing Fees      | $1.01   | Moov modeled 2.7%                             |
| Net Revenue                | $10.98  | After processing, before fulfillment costs    |
| Less: Driver Base Pay      | $3.14   | 70% of delivery fee                           |
| Gross Profit (pre-overhead)| $7.84   | Before corporate overhead and fixed expenses  |

The CFO can adjust this framing to classify **driver base pay** and part of processing as **COGS** and treat the remainder as **gross margin**, aligning with the company’s financial statement presentation.

---

## 7. Key CFO Takeaways

- Each order has a clear, **deterministic financial breakdown** across customer, restaurant, driver, platform, and processor.  
- Platform revenue is primarily driven by **commission, service, and delivery fees**, while **tips** are pass-through to drivers.  
- Payment method choice (**card vs. ACH**) meaningfully changes **processing cost per order** and therefore margin.  
- Discounts, refunds, and chargebacks directly affect per-order economics and must be **modeled carefully** in pricing and promotion strategies.  
- The system’s per-order design aligns with the broader CFO Financial System report and the Merchant/Restaurant Financial Flow document, ensuring consistency across unit economics and aggregate reporting.

---

**End of Document**


