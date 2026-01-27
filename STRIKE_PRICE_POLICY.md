# Strike Price Policy - Crave'n Inc.

## Par Value vs Strike Price

### Par Value: $0.0001 per share
- **Legal nominal value** of each share
- Required by Delaware corporate law
- **NEVER CHANGES** regardless of equity grants
- Applies to ALL shares universally

### Strike Price: Varies by Grant Type
- **Price at which shares can be purchased/exercised**
- Different from par value
- Set based on grant type and timing

## Current Strike Price Structure

| Shareholder | Shares | Strike Price | Rationale |
|------------|--------|--------------|-----------|
| **Invero, Inc.** (Holding Company) | 40,600,000 | $0.00 | Founding entity, no purchase required |
| **Torrance Stroman** (Founder) | 10,500,000 | $0.00 | Founder shares, no purchase required |
| **Justin Sweet** (CFO) | 4,200,000 | **$2.00** | Employee equity grant at market price |

## Strike Price Rules

### $0.00 Strike Price (No Cost Equity)
- **Holding Company** (Invero, Inc.)
- **Founders** (Torrance Stroman)
- Any equity issued for IP, services, or founding contributions

### $2.00 Strike Price (Priced Equity)
- **Employee grants** post-company formation
- **Advisor grants** (if applicable)
- **Consultant equity** (if applicable)
- Future equity pool allocations to employees

### Future Price Increases
As company valuation grows, strike price for new grants may increase to:
- $5.00 per share
- $10.00 per share
- Fair Market Value (FMV) at time of grant

## Technical Implementation

- Par value remains $0.0001 in `cap_tables.par_value`
- Strike price stored in `employee_equity.strike_price` and `equity_ledger.price_per_share`
- Each grant can have different strike price
- Strike price does NOT affect cap table calculations (percentages, total shares, etc.)

## For Future Grants

When issuing new equity:
1. Determine if recipient is founder/holding company (→ $0.00) or employee (→ $2.00+)
2. Set strike price in both `employee_equity` and `equity_ledger`
3. Document in grant agreement
4. Update notes field to include strike price

## 409A Valuation Note

As the company grows, obtain a 409A valuation to set Fair Market Value (FMV) for future employee grants. This protects against IRS penalties for underpriced equity.

