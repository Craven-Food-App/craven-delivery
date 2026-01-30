# Bulk Fix Guide for Notifications

## Pattern to Fix
All instances of:
```typescript
notifications.show({
  title: "...",
  color: "..."
})
```

Should become:
```typescript
notifications.show({
  title: "...",
  message: "",
  color: "..."
})
```

## Files Affected (in order of priority):
1. src/components/mobile/AppSettingsSection.tsx - line 155
2. src/components/mobile/FeederAccountPage.tsx - lines 245, 252, 484, 574, 591
3. src/components/mobile/FeederPromotionsTab.tsx - lines 138, 218, 235
4. src/components/mobile/FeederRatingsTab.tsx - lines 170, 224, 241
5. src/components/mobile/FeederScheduleTab.tsx - lines 110, 302, 317, 324, 337, 365, 372, 479, 503, 513, 578, 595
6. src/components/mobile/PaymentMethodsSection.tsx - lines 123, 129, 155, 161
7. src/components/mobile/ProfileDetailsPage.tsx - lines 114, 128, 137, 156, 183, 222, 231

## Other Issues to Fix:
- Duplicate `style` attributes: AppSettingsSection.tsx:71, EarningsSection.tsx:338, PaymentMethodsSection.tsx:202
- Invalid `size` prop on Group/Grid: FeederPromotionsTab.tsx:327, 409, OfferCard.tsx:88, OrderAssignmentModal.tsx:437
- Invalid `bar` in Progress styles: FeederPromotionsTab.tsx:422, FeederRatingsTab.tsx:351
- Database type issue: CravenDeliveryFlow.tsx:383 (status field)
