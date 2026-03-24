# Merchant / Restaurant Financial Flow – End-to-End Overview

**Last updated:** March 25, 2026  
**Organization:** Crave’n Inc.  
**Prepared for:** CFO & Finance Leadership; Chief Partnership Officer (Jason Parcell)  
**Scope:** Merchant pricing strategy (vs competitors), Stripe-only money movement, order economics, payouts, reconciliation.

**Canonical file path (repo):** `docs/MERCHANT_RESTAURANT_FINANCIAL_FLOW.md`

**Payments and banking:** **Stripe only** — customer charges (e.g. PaymentIntents) and restaurant payouts (**Stripe Connect**). No Moov or other merchant banking rail for this flow.

**Related:** Driver pay from delivery fees — [`DRIVER_PAY_SYSTEM_REDESIGN.md`](./DRIVER_PAY_SYSTEM_REDESIGN.md) (70% of delivery fees default, $2.50 base floor, 100% tips, 0% food subtotal).

---

## Table of contents

1. [Overview](#1-overview)  
2. [Merchant commission strategy (Crave’n vs DoorDash)](#2-merchant-commission-strategy-crave’n-vs-doordash)  
3. [Merchant onboarding and financial configuration](#3-merchant-onboarding-and-financial-configuration)  
4. [Order lifecycle – merchant financial view](#4-order-lifecycle--merchant-financial-view)  
5. [Settlement and payout mechanics](#5-settlement-and-payout-mechanics)  
6. [Refunds, chargebacks, and adjustments](#6-refunds-chargebacks-and-adjustments)  
7. [Reporting for merchants and CFO](#7-reporting-for-merchants-and-cfo)  
8. [Reconciliation and controls](#8-reconciliation-and-controls)  
9. [Summary](#9-summary)

---

## 1. Overview

This document defines:

- **Commercial policy:** Crave’n’s **15% commission cap**, **10%–15%** merchant bands, **0%** pickup and **0%** first-party web commission (processing only), and positioning vs **DoorDash-style** high tiers.  
- **Operations:** How money flows on a delivery marketplace order, how **delivery fees** divide between **driver** and **platform**, and how restaurants are paid through **Stripe Connect**.  
- **Controls:** Refunds/disputes in **Stripe**, and Finance reconciliation.

---

## 2. Merchant commission strategy (Crave’n vs DoorDash)

**Purpose.** Explain Crave’n’s merchant pricing and how it **competes with** the **DoorDash** merchant model while holding a firm **15% commission cap**. Goal: **more profit for restaurants**, **transparency**, and **fair structure**, with a sustainable marketplace.

### 2.1 DoorDash merchant model (reference)

DoorDash commonly uses **tiered commissions** so restaurants pay more for visibility, customers, and radius.

| Plan (illustrative) | Commission | Positioning |
|---------------------|------------|-------------|
| Basic | **15%** | Standard listing, smaller radius, basic support |
| Plus | **25%** | Expanded radius, DashPass, better discovery |
| Premier | **30%** | Top visibility, priority search, promos, perks (e.g. photo credit) |

**Other fees (illustrative):**

- **Pickup:** ~**6%** commission.  
- **Online ordering (storefront):** **0%** commission; **~2.9% + $0.30** processing.  
- **Hardware:** Tablet rental roughly **~$6/week** after trial.  
- **Drive / API:** Per-order delivery fee by distance.

**Takeaway:** Restaurants often pay **higher commission** to **compete** for reach and placement.

### 2.2 Crave’n counter

- **No** DoorDash-style **25%–30%** commission tiers.  
- **Maximum merchant commission: 15%.** No merchant pays **more than 15%** platform commission on covered delivery marketplace orders under this policy.  
- **10%–15%** standard range; benefits scale **inside** that band—not by jumping above 15%.

### 2.3 Crave’n bands (within the cap)

| Rate | What the merchant gets |
|------|-------------------------|
| **10%** | Full marketplace access, standard discovery, normal delivery radius, dashboard and analytics. |
| **12%** | Enhanced discovery, stronger category exposure, more placement opportunity. |
| **15%** (ceiling) | Featured opportunities, promotional banner eligibility, top category placement opportunities. |

**Distinction:** Merchants are **not** forced to **25%–30%** to compete. **Top Crave’n rate = 15%.**

### 2.4 Pickup

| | DoorDash (reference) | Crave’n |
|---|----------------------|---------|
| Platform commission | ~**6%** | **0%** |
| Merchant pays | Commission + processing | **Stripe / standard processing only** |

### 2.5 Online ordering (merchant website / first-party)

| | DoorDash (reference) | Crave’n |
|---|----------------------|---------|
| Platform commission | **0%** | **0%** |
| Processing | ~2.9% + $0.30 | **Standard processor fees only** — **no extra platform %** |

### 2.6 Hardware

| | DoorDash (reference) | Crave’n |
|---|----------------------|---------|
| Equipment | Mandatory tablet program ~**$6/week** | **No required Crave’n hardware** — existing POS, tablet, phone, or web |

### 2.7 Delivery radius

| | DoorDash (reference) | Crave’n |
|---|----------------------|---------|
| Radius vs rate | Wider radius often tied to **higher** commission tier | Radius from **driver supply**, **demand**, **optimization** — **not** “pay higher commission to expand reach” |

### 2.8 Marketing and promotions

| | DoorDash (reference) | Crave’n |
|---|----------------------|---------|
| Promos | Can bundle with top commission tier | **Optional** tools; promos **without** a permanent rate above **15%** |

### 2.9 Driver economics vs merchant commission

Merchant commission (**≤15%** on the agreed base, e.g. food subtotal) is **separate** from the **delivery fee**:

| Party | Delivery fee (default story) |
|-------|------------------------------|
| **Driver** | **70%** of customer delivery fee + **100%** of tip |
| **Platform** | **Remainder** of delivery fee (about **30%** when `70%` applies and the **$2.50 base floor** does not override the fee share — see [`DRIVER_PAY_SYSTEM_REDESIGN.md`](./DRIVER_PAY_SYSTEM_REDESIGN.md) for `max(base, 70% of fees) + tip`) |

**Drivers get 0% of food subtotal.**

### 2.10 Illustrative comparison (high competitor tier)

Order value **$40** (commission base = **$40** for illustration).

| | DoorDash Premier **30%** (reference) | Crave’n max **15%** |
|---|---------------------------------------|---------------------|
| Commission | **$12** | **$6** |
| Restaurant after commission | **$28** | **$34** |
| **Per-order benefit** | | **+$6** to restaurant |

**1,000 orders:** **$12,000** vs **$6,000** commission → merchant keeps **$6,000** more on Crave’n in this example.

### 2.11 Positioning summary

- **DoorDash-style:** Pay more commission to **buy** rank and radius.  
- **Crave’n:** **Capped** rates; success tied to **ratings**, **reliability**, **demand**, **volume**, **delivery performance** — not endless commission escalation.

**Key advantages:** **15% cap**, no forced **25–30%** tiers, **0%** pickup / first-party commission (processing only), **no** mandatory tablet rent, **optional** marketing, **clear** driver-vs-platform split on delivery fees.

---

## 3. Merchant onboarding and financial configuration

### 3.1 Verification and Connect

1. Restaurant profile — legal entity, address, EIN, tax posture (e.g. 1099-K when applicable).  
2. **Stripe Connect** — hosted or embedded onboarding; **Stripe** runs KYB/KYC and bank verification; store **Connect account id**.  
3. Payouts — **Stripe** payout schedule to verified bank.

### 3.2 Rates and fees (summary)

| Item | Policy |
|------|--------|
| Delivery marketplace commission | **10%–15%**, **never above 15%** on covered orders |
| Pickup / first-party web | **0%** platform commission; **processing only** |
| Service fee (if product charges) | Customer-facing; confirm live product (e.g. illustrative 10% on subtotal in examples) |
| Delivery fee | Priced to customer; split **driver / platform** per §2.9 |
| Overrides | Geographic or contract; must respect **15%** cap unless separately approved in writing |

---

## 4. Order lifecycle – merchant financial view

### 4.1 Flow

1. Customer pays **Stripe**.  
2. Funds settle to platform (net **Stripe** fees).  
3. Recognize **commission**, **service fee** (if any), **platform share of delivery fees**.  
4. Restaurant **payable** = agreed base **minus commission** (± adjustments).  
5. Pay restaurant via **Stripe Connect**.

### 4.2 Illustrative delivery order

- Food subtotal **$30**; commission **15%**; service fee **10%** → **$3**; delivery fee **$4.49**.  
- Driver: **70%** of **$4.49** = **$3.14** (above **$2.50** floor) → platform delivery slice **$1.35** (no tip in example).

**Customer total:** $30 + $3 + $4.49 = **$37.49**

**Platform revenue (before Stripe fees, simplified):** commission **$4.50** + service **$3.00** + delivery margin **$1.35** = **$8.85**

**Restaurant net:** $30 − $4.50 = **$25.50**

Tips → **100%** driver; not platform revenue.

---

## 5. Settlement and payout mechanics

### 5.1 Stripe settlement

Charges, refunds, disputes, **Connect** transfers and payouts — all **Stripe**. Book processing cost as **platform expense**.

### 5.2 Restaurant batch payout

```text
Payout = Σ(Eligible subtotals or agreed base)
       − Σ(Commission at contracted rate, ≤ 15% on covered orders)
       − Σ(Debits) + Σ(Credits)
```

### 5.3 Example day

Subtotal **$1,200**, **15%** → **$180** commission → **$1,020** to restaurant via **Connect**; platform also keeps **service fees** and **delivery margin** for those orders.

---

## 6. Refunds, chargebacks, and adjustments

- **Refunds:** Issue in **Stripe**; reverse commission per policy; net restaurant on later payout if already paid.  
- **Chargebacks:** **Stripe** dispute flow; restaurant food share per policy; dispute fees usually **platform** unless passed through by contract.  
- **Manual adjustments:** Audited credits/debits with reason and operator.

---

## 7. Reporting for merchants and CFO

**Restaurant:** Gross sales, commission % (**≤15%**), net payout, **Stripe** payout id/date, adjustments.

**CFO:** GMV, commission by band (10 / 12 / 15), liabilities, **Stripe** reconciliation, refunds/disputes, delivery margin vs driver ledger.

---

## 8. Reconciliation and controls

1. **Stripe** ledger vs internal (payments, refunds, disputes, Connect payouts).  
2. Internal batches vs orders/commissions/adjustments.  
3. **GL** mapping: restaurant payables, commission revenue, processing expense, cash.

**Controls:** Separation of duties, dual approval on large adjustments, full audit trail, periodic access review.

---

## 9. Summary

- **One file to use:** `docs/MERCHANT_RESTAURANT_FINANCIAL_FLOW.md`  
- **Strategy:** **15% cap**, **10–15%** bands, **0%** pickup/first-party commission (processing only), no mandatory hardware fee, radius/promos not tied to **>15%** rates.  
- Stack: **Stripe + Connect**; driver economics in **`DRIVER_PAY_SYSTEM_REDESIGN.md`**.

---

**End of document**
