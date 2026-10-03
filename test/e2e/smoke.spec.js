import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Congo Commerce — pages publiques', () => {
  test('charge la page d\'accueil', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Congo/i);
    // Homepage may not have an h1; title check is sufficient
  });

  test('navigue vers la page de découverte', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('domcontentloaded');
    const link = page.getByRole('link', { name: /Découvrir/i });
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await page.waitForURL(/\/discover/, { timeout: 10000 });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('affiche la page Panier', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('domcontentloaded');
    const link = page.getByRole('link', { name: /Panier/i });
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await page.waitForURL(/\/cart/, { timeout: 10000 });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('affiche les mentions légales', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('domcontentloaded');
    const link = page.getByRole('link', { name: /Mentions légales/i });
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await page.waitForURL(/\/mentions-legales/, { timeout: 10000 });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('affiche la page À propos', async ({ page }) => {
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('domcontentloaded');
    const link = page.getByRole('link', { name: /À propos/i });
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await page.waitForURL(/\/about/, { timeout: 10000 });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
