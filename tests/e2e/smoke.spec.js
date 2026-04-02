const { test, expect } = require('@playwright/test');

test('homepage loads and exits loading state', async ({ page }) => {
  await page.goto('/');

  const loadingText = page.getByText('Loading your flight training data...');
  await expect(loadingText).toBeVisible();
  await expect(loadingText).toBeHidden({ timeout: 15000 });

  await expect(page.getByAltText('CoPi')).toBeVisible();
  await expect(page.getByText('Your flight training companion')).toBeVisible();
});

test('backend health endpoint is reachable', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:8787/api/health');
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.ok).toBeTruthy();
});