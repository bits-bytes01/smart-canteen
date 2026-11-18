const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const homePage = pathToFileURL(path.resolve(__dirname, '../../client/index.html')).href;

test('home page loads its content and navigates to student login', async ({ page }) => {
  await page.goto(homePage);

  await expect(page).toHaveTitle('Smart Canteen');
  await expect(page.getByRole('heading', { name: 'Order now. Skip the line.' })).toBeVisible();

  // Check that the shared stylesheet is applied in the browser.
  const bodyFont = await page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily);
  expect(bodyFont).toContain('DM Sans');

  await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', 'login.html');
  await page.getByRole('link', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Email or USN')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('home page fits a mobile viewport without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(homePage);

  const dimensions = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));

  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});
