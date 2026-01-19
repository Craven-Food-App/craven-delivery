All financial data must be:
- Explicitly modeled
- Auditable
- Immutable where appropriate

Guidelines:
- Never silently mutate payment records
- Use idempotency for payment-related operations
- Separate operational data from financial ledgers

When touching payments, fees, or payouts:
- State assumptions clearly
- Flag edge cases
- Default to conservative behavior
---
alwaysApply: true
---















































