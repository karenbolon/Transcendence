import { locale, _, init, getLocaleFromNavigator } from 'svelte-i18n';
import { get } from 'svelte/store';

/**
 * Helper utilities for testing i18n functionality
 */

export class TranslationTestHelper {
	/**
	 * Initialize i18n for testing with a specific locale
	 */
	static async initForTesting(testLocale: string = 'en') {
		await init({
			fallbackLocale: 'en',
			initialLocale: testLocale
		});
		locale.set(testLocale);
		// Wait for translations to load
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	/**
	 * Test that a translation key returns different values for different locales
	 */
	static async testTranslationKey(
		key: string, 
		expectedTranslations: Record<string, string>
	) {
		const results: Record<string, string> = {};
		
		for (const [lang, expectedText] of Object.entries(expectedTranslations)) {
			await this.initForTesting(lang);
			const translated = get(_)(key);
			results[lang] = translated;
			
			// Basic assertion that it's translated (not just the key)
			if (translated === key) {
				throw new Error(`Translation missing for key "${key}" in language "${lang}"`);
			}
			
			// If expected text provided, check it matches
			if (expectedText && !translated.toLowerCase().includes(expectedText.toLowerCase())) {
				throw new Error(
					`Translation for "${key}" in "${lang}" doesn't contain expected text "${expectedText}". Got: "${translated}"`
				);
			}
		}
		
		return results;
	}

	/**
	 * Get all available languages from your i18n setup
	 */
	static getAvailableLanguages(): string[] {
		// Adjust this based on your actual language setup
		return ['en', 'fr', 'es', 'de', 'it', 'pt'];
	}

	/**
	 * Test that all error keys are translated in all languages
	 */
	static async validateAllErrorKeys(errorKeys: string[]) {
		const languages = this.getAvailableLanguages();
		const results: Record<string, Record<string, string>> = {};
		
		for (const key of errorKeys) {
			results[key] = {};
			
			for (const lang of languages) {
				await this.initForTesting(lang);
				const translated = get(_)(key);
				
				if (translated === key) {
					throw new Error(`Missing translation for "${key}" in language "${lang}"`);
				}
				
				results[key][lang] = translated;
			}
		}
		
		return results;
	}
}

/**
 * Common error keys used in your API endpoints
 */
export const ERROR_KEYS = [
	'errors.not_authenticated',
	'errors.invalid_json_body',
	'errors.friendId',
	'errors.noPending'
];

/**
 * Common success message keys
 */
export const MESSAGE_KEYS = [
	'friend.acceptedDesc'
];