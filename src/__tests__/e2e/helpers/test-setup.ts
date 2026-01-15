/**
 * Test Helper Utilities for E2E Testing
 * 
 * This file contains helper functions for setting up test data
 * and managing test environment for driver delivery flow tests
 */

import { Page } from '@playwright/test';

export interface TestDriver {
  email: string;
  password: string;
  userId?: string;
}

export interface TestOrder {
  orderId: string;
  restaurantId: string;
  customerId: string;
  driverId: string;
  assignmentId: string;
}

/**
 * Create a test driver account
 * Note: This would typically call your API or use Supabase admin client
 */
export async function createTestDriver(): Promise<TestDriver> {
  const timestamp = Date.now();
  const email = `test-driver-${timestamp}@craven-test.com`;
  const password = 'TestDriver123!';
  
  // In a real implementation, you would:
  // 1. Create auth user via Supabase admin
  // 2. Create driver profile in database
  // 3. Set up driver permissions/roles
  
  return {
    email,
    password,
  };
}

/**
 * Login as a test driver
 */
export async function loginAsDriver(page: Page, driver: TestDriver): Promise<void> {
  await page.goto('/mobile');
  
  // Check if already logged in
  const isLoggedIn = await page.locator('text=CRAVE NOW').isVisible().catch(() => false);
  if (isLoggedIn) {
    return;
  }
  
  // Navigate to login if needed
  await page.goto('/driver/auth');
  
  // Fill in login form
  await page.fill('input[type="email"]', driver.email);
  await page.fill('input[type="password"]', driver.password);
  await page.click('button:has-text("Sign In")').or(
    page.click('button[type="submit"]')
  );
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/mobile', { timeout: 10000 });
}

/**
 * Create a test order via Supabase function
 */
export async function createTestOrderViaAPI(
  driverId: string,
  restaurantId?: string
): Promise<TestOrder> {
  // This would call your create-test-order edge function
  // For now, returns mock data structure
  
  return {
    orderId: `test-order-${Date.now()}`,
    restaurantId: restaurantId || 'test-restaurant-id',
    customerId: 'test-customer-id',
    driverId,
    assignmentId: `test-assignment-${Date.now()}`,
  };
}

/**
 * Send order assignment notification to driver
 */
export async function sendOrderAssignment(
  page: Page,
  assignment: {
    assignment_id: string;
    order_id: string;
    restaurant_name: string;
    payout_cents: number;
    distance_km: number;
    estimated_time: number;
  }
): Promise<void> {
  await page.evaluate((assignmentData) => {
    const event = new CustomEvent('orderAssignment', {
      detail: assignmentData
    });
    window.dispatchEvent(event);
  }, assignment);
}

/**
 * Wait for order assignment modal to appear
 */
export async function waitForOrderAssignmentModal(page: Page, timeout = 10000): Promise<void> {
  const modal = page.locator('[role="dialog"]').filter({ hasText: 'Restaurant' }).or(
    page.locator('text=/Restaurant|Order|Accept|Decline/')
  );
  await modal.first().waitFor({ state: 'visible', timeout });
}

/**
 * Accept an order assignment
 */
export async function acceptOrder(page: Page): Promise<void> {
  const acceptButton = page.locator('button:has-text("Accept")').or(
    page.locator('button:has-text("Accept Order")')
  );
  await acceptButton.first().waitFor({ state: 'visible', timeout: 5000 });
  await acceptButton.first().click();
  await page.waitForTimeout(2000); // Wait for state transition
}

/**
 * Decline an order assignment
 */
export async function declineOrder(page: Page): Promise<void> {
  const declineButton = page.locator('button:has-text("Decline")').or(
    page.locator('button:has-text("No Thanks")')
  );
  await declineButton.first().waitFor({ state: 'visible', timeout: 5000 });
  await declineButton.first().click();
  await page.waitForTimeout(1000);
}

/**
 * Go online as driver
 */
export async function goOnline(page: Page): Promise<void> {
  const craveNowButton = page.locator('text=CRAVE NOW').or(
    page.locator('button:has-text("CRAVE NOW")')
  );
  await expect(craveNowButton).toBeVisible({ timeout: 10000 });
  await craveNowButton.click();
  await page.waitForTimeout(2000); // Wait for state transition
}

/**
 * Verify driver is in online/searching state
 */
export async function verifyOnlineState(page: Page): Promise<void> {
  const searchingIndicators = [
    page.locator('text=Still searching'),
    page.locator('text=Searching'),
    page.locator('text=Looking for orders')
  ];
  
  let isOnline = false;
  for (const indicator of searchingIndicators) {
    if (await indicator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      isOnline = true;
      break;
    }
  }
  
  if (!isOnline) {
    throw new Error('Driver is not in online/searching state');
  }
}

/**
 * Verify delivery flow has started
 */
export async function verifyDeliveryFlowStarted(page: Page): Promise<void> {
  const flowIndicators = [
    page.locator('text=Routing to Kitchen'),
    page.locator('text=Navigate to Restaurant'),
    page.locator('text=Restaurant')
  ];
  
  let flowStarted = false;
  for (const indicator of flowIndicators) {
    if (await indicator.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      flowStarted = true;
      break;
    }
  }
  
  if (!flowStarted) {
    throw new Error('Delivery flow did not start');
  }
}

// Note: Import expect from @playwright/test in your test files

