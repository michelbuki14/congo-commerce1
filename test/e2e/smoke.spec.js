import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * E2E smoke tests — Congo Commerce 1
 *
 * Ces tests vérifient que les pages publiques de l'app se rendent sans erreur
 * JavaScript. Ils nécessitent que l'app soit servie (BASE_URL, défaut : http://localhost:5173).
 *
 * Prérequis : l'app démarrée avec `npm run dev` ou `base44 dev` sur le port 5173.
 * Lancer : npx playwright test
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

function goto(page, path) {
  return page.goto(`${BASE_URL}${path}`).then(() => page.waitForLoadState('domcontentloaded'));
}

describe('Congo Commerce — pages publiques', () => {
  it('charge la page d\'accueil sans erreur console', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await goto(page, '/');
    const title = await page.title();
    assert.ok(title.includes('Congo'), `titre inattendu : ${title}`);
    const hero = await page.locator('text=Congo Commerce').first();
    assert.ok(await hero.isVisible({ timeout: 10000 }), 'héro non visible');
    const jsErrors = errors.filter((e) => !e.includes('favicon'));
    assert.equal(jsErrors.length, 0, `erreurs JS : ${jsErrors.join('; ')}`);
  });

  it('navigue vers la page de découverte', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('link', { name: /Découvrir/i }).click();
    await page.waitForURL(/\/discover/, { timeout: 10000 });
    const h1 = page.locator('h1');
    assert.ok(await h1.isVisible({ timeout: 5000 }), 'h1 discover non visible');
  });

  it('affiche la page Panier', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('link', { name: /Panier/i }).click();
    await page.waitForURL(/\/cart/, { timeout: 10000 });
    const h1 = page.locator('h1');
    assert.ok(await h1.isVisible({ timeout: 5000 }), 'h1 cart non visible');
  });

  it('affiche la page de paiement', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('link', { name: /Panier/i }).first().click();
    await page.waitForURL(/\/cart/, { timeout: 10000 });
    const checkoutBtn = page.getByRole('link', { name: /Commander/i }).first();
    if (await checkoutBtn.isVisible({ timeout: 5000 })) {
      await checkoutBtn.click();
      await page.waitForURL(/\/checkout/, { timeout: 10000 });
      const h1 = page.locator('h1');
      assert.ok(await h1.isVisible({ timeout: 5000 }), 'h1 checkout non visible');
    }
  });

  it('affiche les mentions légales', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('link', { name: /Mentions légales/i }).click();
    await page.waitForURL(/\/mentions-legales/, { timeout: 10000 });
    const h1 = page.locator('h1');
    assert.ok(await h1.isVisible({ timeout: 5000 }), 'h1 mentions légales non visible');
  });

  it('affiche la page À propos', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('link', { name: /À propos/i }).click();
    await page.waitForURL(/\/about/, { timeout: 10000 });
    const h1 = page.locator('h1');
    assert.ok(await h1.isVisible({ timeout: 5000 }), 'h1 about non visible');
  });

  it('affiche la page de suivi de commande', async ({ page }) => {
    await goto(page, '/');
    await page.getByRole('link', { name: /Suivi/i }).click();
    await page.waitForURL(/\/track/, { timeout: 10000 });
    const h1 = page.locator('h1');
    assert.ok(await h1.isVisible({ timeout: 5000 }), 'h1 track non visible');
  });
});
