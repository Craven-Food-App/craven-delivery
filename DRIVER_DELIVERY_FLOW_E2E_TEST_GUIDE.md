# Driver Delivery Flow - End-to-End Testing Guide

This guide explains how to run and maintain the end-to-end tests for the driver delivery flow.

## Overview

The E2E tests cover the complete driver delivery journey from going online to completing a delivery:

1. **Driver goes online** - Driver activates and enters "searching" state
2. **Order assignment** - Driver receives an order assignment notification
3. **Order acceptance** - Driver accepts or declines the order
4. **Navigate to restaurant** - Driver navigates to pickup location
5. **Arrive at restaurant** - Driver confirms arrival
6. **Pickup verification** - Driver verifies order and takes pickup photo
7. **Navigate to customer** - Driver navigates to delivery location
8. **Arrive at customer** - Driver confirms arrival at customer location
9. **Delivery completion** - Driver takes delivery photo and completes order
10. **Return to searching** - Driver returns to searching for next order

## Test Files

- **`src/__tests__/e2e/driver-delivery-flow.e2e.ts`** - Main E2E test file
- **`src/__tests__/e2e/helpers/test-setup.ts`** - Helper utilities for test setup

## Prerequisites

1. **Playwright installed**: The project uses Playwright for E2E testing
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Test environment setup**:
   - Supabase test project or local instance
   - Test driver account (or use test creation script)
   - Test restaurant data
   - Test order creation capability

3. **Environment variables**:
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
   - Test credentials for driver account

## Running the Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run specific test file:
```bash
npx playwright test src/__tests__/e2e/driver-delivery-flow.e2e.ts
```

### Run in headed mode (see browser):
```bash
npx playwright test src/__tests__/e2e/driver-delivery-flow.e2e.ts --headed
```

### Run in debug mode:
```bash
npx playwright test src/__tests__/e2e/driver-delivery-flow.e2e.ts --debug
```

### Run specific test:
```bash
npx playwright test src/__tests__/e2e/driver-delivery-flow.e2e.ts -g "Complete driver delivery flow"
```

## Test Structure

### Main Test: "Complete driver delivery flow from order assignment to completion"

This test covers the full journey:

```typescript
test('Complete driver delivery flow from order assignment to completion', async ({ page }) => {
  // Step 1: Driver goes online
  // Step 2: Simulate receiving an order assignment
  // Step 3: Wait for and verify order assignment modal appears
  // Step 4: Accept the order
  // Step 5: Verify delivery flow started
  // Step 6: Simulate arriving at restaurant
  // Step 7: Verify pickup and take pickup photo
  // Step 8: Navigate to customer
  // Step 9: Simulate arriving at customer location
  // Step 10: Take delivery photo
  // Step 11: Verify delivery completion
});
```

### Additional Tests

- **Order decline test** - Verifies driver can decline orders
- **Pause during delivery** - Tests pausing functionality (if available)

## Test Data Setup

### Option 1: Use Existing Test Driver

If you have a test driver account already set up:

1. Log in with test credentials
2. Ensure driver profile is active
3. Run tests

### Option 2: Create Test Driver Programmatically

Use the helper function to create a test driver:

```typescript
import { createTestDriver, loginAsDriver } from './helpers/test-setup';

const driver = await createTestDriver();
await loginAsDriver(page, driver);
```

### Option 3: Use Test Order Creation

The test simulates order assignments via browser events. For more realistic testing, you can:

1. Use the `create-test-order` Supabase edge function
2. Set up test orders via API
3. Use database fixtures

## Test Helpers

The `test-setup.ts` file provides helper functions:

- `createTestDriver()` - Create a test driver account
- `loginAsDriver()` - Login as a test driver
- `createTestOrderViaAPI()` - Create a test order
- `sendOrderAssignment()` - Send order assignment notification
- `acceptOrder()` - Accept an order assignment
- `declineOrder()` - Decline an order assignment
- `goOnline()` - Make driver go online
- `verifyOnlineState()` - Verify driver is online
- `verifyDeliveryFlowStarted()` - Verify delivery flow has started

## Troubleshooting

### Test fails at login

**Issue**: Test can't log in or find login elements

**Solutions**:
- Ensure test driver account exists
- Check authentication flow hasn't changed
- Verify login page selectors are correct
- Use `--headed` mode to see what's happening

### Order assignment modal doesn't appear

**Issue**: Test can't find order assignment modal

**Solutions**:
- Verify order assignment event is being dispatched correctly
- Check if realtime subscriptions are working
- Ensure driver is actually online
- Check browser console for errors
- Verify modal selectors match current UI

### Delivery flow doesn't start

**Issue**: After accepting order, delivery flow doesn't appear

**Solutions**:
- Check if order was actually created in database
- Verify order assignment was accepted
- Check for JavaScript errors in console
- Ensure delivery flow component is rendering
- Verify test order has all required fields

### Photo capture fails

**Issue**: Camera or photo capture doesn't work in tests

**Solutions**:
- Camera access may be blocked in test environment
- Use mock camera or test images
- Skip photo steps if not critical for test
- Use `page.setInputFiles()` if file input is used

### Timeout errors

**Issue**: Tests timeout waiting for elements

**Solutions**:
- Increase timeout values for slow operations
- Check if app is actually loading
- Verify network requests are completing
- Check for infinite loading states
- Use `page.waitForLoadState('networkidle')` before assertions

## Best Practices

1. **Use data-testid attributes**: Add `data-testid` attributes to key UI elements for more reliable selectors
2. **Wait for network idle**: Use `waitForLoadState('networkidle')` before critical assertions
3. **Use meaningful timeouts**: Set appropriate timeouts for different operations
4. **Clean up test data**: Clean up test orders and assignments after tests
5. **Isolate tests**: Each test should be independent and not rely on previous test state
6. **Mock external services**: Mock payment processing, GPS, etc. in tests
7. **Use fixtures**: Set up reusable test data fixtures

## Adding Test IDs

To make tests more reliable, add `data-testid` attributes to key components:

```tsx
// In MobileDriverDashboard.tsx
<button data-testid="crave-now-button" onClick={handleGoOnline}>
  CRAVE NOW
</button>

// In OrderAssignmentModal.tsx
<div data-testid="order-assignment-modal" role="dialog">
  ...
  <button data-testid="accept-order-button">Accept</button>
  <button data-testid="decline-order-button">Decline</button>
</div>

// In CravenDeliveryFlow.tsx
<div data-testid="delivery-flow">
  ...
  <button data-testid="arrived-at-restaurant-button">I'm Here</button>
  <button data-testid="verify-pickup-button">Verify Pickup</button>
  ...
</div>
```

## Continuous Integration

To run these tests in CI:

```yaml
# Example GitHub Actions workflow
- name: Run E2E tests
  run: |
    npm run test:e2e
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Next Steps

1. **Add more test coverage**:
   - Multiple order handling
   - Route optimization
   - Earnings calculation
   - Rating system
   - Pause/resume functionality

2. **Improve test reliability**:
   - Add more test IDs
   - Use more specific selectors
   - Add retry logic for flaky tests
   - Mock external dependencies

3. **Performance testing**:
   - Measure delivery flow performance
   - Test with slow network
   - Test with multiple concurrent orders

4. **Visual regression testing**:
   - Screenshot comparisons
   - UI component testing

## Support

For issues or questions:
- Check Playwright documentation: https://playwright.dev
- Review test logs and browser console
- Check Supabase edge function logs
- Review component code for selector changes

