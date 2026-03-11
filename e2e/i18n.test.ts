import { test, expect } from '@playwright/test';

test.describe('Language Switching', () => {
	test.beforeEach(async ({ page }) => {
		// Start with a fresh page
		await page.goto('/');
	});

	test('should switch language to French', async ({ page }) => {
		// Look for language selector (adjust selector based on your UI)
		const languageSelector = page.locator('[data-testid="language-selector"]');
		
		// Select French
		await languageSelector.selectOption('fr');
		
		// Wait a moment for translations to load
		await page.waitForTimeout(500);
		
		// Check that some text has changed to French
		// Replace these with actual elements and French text from your app
		await expect(page.locator('nav')).toContainText('Accueil'); // "Home" in French
		await expect(page.locator('h1')).toContainText('Bienvenue'); // "Welcome" in French
	});

	test('should switch language to Spanish', async ({ page }) => {
		const languageSelector = page.locator('[data-testid="language-selector"]');
		
		await languageSelector.selectOption('es');
		await page.waitForTimeout(500);
		
		// Check Spanish translations
		await expect(page.locator('nav')).toContainText('Inicio'); // "Home" in Spanish
		await expect(page.locator('h1')).toContainText('Bienvenido'); // "Welcome" in Spanish
	});

	test('should persist language after page reload', async ({ page }) => {
		// Change to French
		await page.locator('[data-testid="language-selector"]').selectOption('fr');
		await page.waitForTimeout(500);
		
		// Reload the page
		await page.reload();
		await page.waitForTimeout(500);
		
		// Should still be in French
		await expect(page.locator('nav')).toContainText('Accueil');
	});

	test('should show error messages in selected language', async ({ page }) => {
		// Switch to German
		await page.locator('[data-testid="language-selector"]').selectOption('de');
		await page.waitForTimeout(500);
		
		// Try to trigger an error (e.g., invalid login)
		await page.goto('/login');
		await page.fill('[data-testid="username"]', 'invalid');
		await page.fill('[data-testid="password"]', 'invalid');
		await page.click('[data-testid="login-button"]');
		
		// Check that error message is in German
		await expect(page.locator('[data-testid="error-message"]'))
			.toContainText('authentifiziert'); // or whatever German error text you have
	});
});

test.describe('API Response Translation Keys', () => {
	test('should return proper error keys from API', async ({ page }) => {
		// Make an API request that should return an error
		const response = await page.request.post('/api/friends/accept', {
			data: { friendId: 'invalid' }
		});
		
		const data = await response.json();
		
		expect(response.status()).toBe(401);
		expect(data.errorKey).toBe('errors.not_authenticated');
	});
});