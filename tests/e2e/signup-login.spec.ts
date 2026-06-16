import { test, expect } from '@playwright/test';

// Note: ensure the dev server is running at http://localhost:5173 before running this test
// Start dev: `npm run dev` in another terminal

test('signup -> phone -> verify -> redirected to dashboard', async ({ page }) => {
  const unique = Math.random().toString(36).slice(2, 8);
  const email = `e2e+${unique}@example.com`;

  await page.goto('/signup');

  // Fill details step
  await page.fill('#fullName', 'E2E User');
  await page.fill('#email', email);
  await page.fill('#password', 'password');
  await page.click('text=Continue');

  // Wait for phone step
  await page.waitForSelector('#phone');
  await page.fill('#phone', '0241234567');
  await page.click('text=Send Code');

  // Wait for otp step
  await page.waitForSelector('#otp');
  await page.fill('#otp', '123456');
  await page.click('text=Verify & Continue');

  // Expect navigation to dashboard (mock client routes to /dashboard after success)
  await page.waitForURL('**/dashboard', { timeout: 5000 });
  expect(page.url()).toContain('/dashboard');
});
