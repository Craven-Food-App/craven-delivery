import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LogEntry {
  timestamp: string;
  type: 'console' | 'network' | 'navigation' | 'error' | 'screenshot';
  message: string;
  data?: any;
}

const logEntries: LogEntry[] = [];

function log(type: LogEntry['type'], message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    data
  };
  logEntries.push(entry);
  console.log(`[${entry.timestamp}] [${type}] ${message}`, data || '');
}

test.describe('Foundational Invites Portal Navigation', () => {
  let page: Page;
  const logFile = path.join(__dirname, 'foundational-invites-navigation-log.json');

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Capture all console messages
    page.on('console', (msg) => {
      const text = msg.text();
      log('console', `Console [${msg.type()}]: ${text}`, {
        type: msg.type(),
        text,
        location: msg.location()
      });
    });

    // Capture all network requests
    page.on('request', (request) => {
      log('network', `Request: ${request.method()} ${request.url()}`, {
        method: request.method(),
        url: request.url(),
        headers: request.headers()
      });
    });

    // Capture all network responses
    page.on('response', (response) => {
      log('network', `Response: ${response.status()} ${response.url()}`, {
        status: response.status(),
        url: response.url(),
        headers: response.headers()
      });
    });

    // Capture navigation events
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        log('navigation', `Navigated to: ${frame.url()}`, {
          url: frame.url()
        });
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      log('error', `Page Error: ${error.message}`, {
        message: error.message,
        stack: error.stack
      });
    });

    // Capture request failures
    page.on('requestfailed', (request) => {
      log('error', `Request Failed: ${request.method()} ${request.url()}`, {
        method: request.method(),
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });
  });

  test.afterEach(async () => {
    // Write log file
    fs.writeFileSync(logFile, JSON.stringify(logEntries, null, 2));
    console.log(`\n✅ Log file written to: ${logFile}`);
    console.log(`📊 Total log entries: ${logEntries.length}`);
  });

  test('Navigate to Foundational Invites Portal and capture flow', async ({ page, context }) => {
    log('navigation', 'Starting test: Navigate to Foundational Invites Portal');

    // Step 1: Navigate directly to /hub (assuming user is already logged in via browser storage)
    // If not logged in, this will redirect to /auth, which we'll capture
    log('navigation', 'Step 1: Navigating directly to http://localhost:8080/hub');
    await page.goto('http://localhost:8080/hub', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait a bit for any redirects
    await page.waitForTimeout(2000);
    
    const initialUrl = page.url();
    log('navigation', `URL after initial navigation: ${initialUrl}`);
    await page.screenshot({ path: 'tests/screenshots/01-initial-hub.png', fullPage: true });
    log('screenshot', 'Screenshot: Initial hub page', { path: 'tests/screenshots/01-initial-hub.png' });

    // If we got redirected to auth, log it and stop
    if (initialUrl.includes('/auth') || initialUrl.includes('/business-auth')) {
      log('error', '❌ Redirected to auth page - user not logged in. Please log in manually first.');
      log('console', 'To test with login, please:');
      log('console', '1. Open browser and log in to http://localhost:8080/hub');
      log('console', '2. Copy browser cookies/storage');
      log('console', '3. Re-run test with authentication context');
      return;
    }

    // Step 2: Wait for Main Hub to load
    log('navigation', 'Step 2: Waiting for Main Hub to load');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      log('error', 'Network idle timeout - continuing anyway');
    });

    // Step 4: Wait for Main Hub to load and find Foundational Invites tile
    log('navigation', 'Step 4: Looking for Foundational Invites portal tile');
    
    // Wait for portal tiles to load
    await page.waitForSelector('[data-testid="foundational-invites"], .ant-card, [class*="portal"]', { timeout: 10000 });
    
    // Try multiple selectors to find the Foundational Invites tile
    const selectors = [
      'text=Foundational Invites',
      '[data-testid="foundational-invites"]',
      'button:has-text("Foundational Invites")',
      '.ant-card:has-text("Foundational Invites")',
      'div:has-text("Foundational Invites")'
    ];

    let foundTile = false;
    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          log('console', `Found Foundational Invites tile using selector: ${selector}`);
          
          // Get element info
          const boundingBox = await element.boundingBox();
          const text = await element.textContent();
          log('console', 'Tile info', { selector, text, boundingBox });
          
          // Scroll into view
          await element.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          
          await page.screenshot({ path: 'tests/screenshots/04-before-click.png', fullPage: true });
          log('screenshot', 'Screenshot: Before clicking tile', { path: 'tests/screenshots/04-before-click.png' });
          
          // Click the tile
          log('navigation', 'Step 5: Clicking Foundational Invites tile');
          await element.click({ timeout: 5000 });
          foundTile = true;
          break;
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!foundTile) {
      log('error', 'Could not find Foundational Invites tile');
      // Take screenshot of what we see
      await page.screenshot({ path: 'tests/screenshots/04-tile-not-found.png', fullPage: true });
      log('screenshot', 'Screenshot: Tile not found', { path: 'tests/screenshots/04-tile-not-found.png' });
      
      // Log all visible text to help debug
      const bodyText = await page.locator('body').textContent();
      log('console', 'Page body text (first 1000 chars)', { text: bodyText?.substring(0, 1000) });
    }

    // Step 5: Wait for navigation and capture what happens
    log('navigation', 'Step 6: Waiting for navigation after click');
    
    // Wait a bit for any navigation
    await page.waitForTimeout(2000);
    
    // Check current URL
    const urlAfterClick = page.url();
    log('navigation', `URL after click: ${urlAfterClick}`);
    
    // Check if we're on the right page
    if (urlAfterClick.includes('/hub/foundational/invites')) {
      log('navigation', '✅ Successfully navigated to /hub/foundational/invites');
      await page.screenshot({ path: 'tests/screenshots/05-success-on-portal.png', fullPage: true });
      log('screenshot', 'Screenshot: Successfully on portal', { path: 'tests/screenshots/05-success-on-portal.png' });
    } else {
      log('error', `❌ Did not navigate to /hub/foundational/invites. Current URL: ${urlAfterClick}`);
      await page.screenshot({ path: 'tests/screenshots/05-wrong-page.png', fullPage: true });
      log('screenshot', 'Screenshot: Wrong page after click', { path: 'tests/screenshots/05-wrong-page.png' });
      
      // Check if we were redirected
      const pageTitle = await page.title();
      const pageText = await page.locator('body').textContent();
      log('console', 'Page info after redirect', {
        url: urlAfterClick,
        title: pageTitle,
        textPreview: pageText?.substring(0, 500)
      });
    }

    // Step 6: Wait a bit more to see if there are delayed redirects
    log('navigation', 'Step 7: Waiting for delayed redirects');
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    log('navigation', `Final URL after waiting: ${finalUrl}`);
    
    if (finalUrl !== urlAfterClick) {
      log('error', `⚠️ URL changed from ${urlAfterClick} to ${finalUrl}`);
      await page.screenshot({ path: 'tests/screenshots/06-final-redirect.png', fullPage: true });
      log('screenshot', 'Screenshot: Final redirect', { path: 'tests/screenshots/06-final-redirect.png' });
    }

    // Summary
    log('console', 'Test Summary', {
      initialUrl: currentUrl,
      urlAfterClick,
      finalUrl,
      expectedUrl: 'http://localhost:8080/hub/foundational/invites',
      success: finalUrl.includes('/hub/foundational/invites')
    });
  });
});

