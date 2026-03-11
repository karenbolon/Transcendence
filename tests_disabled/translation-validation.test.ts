import { describe, it, expect } from 'vitest';
import { TranslationTestHelper, ERROR_KEYS, MESSAGE_KEYS } from './translation-helper';

describe('Translation Validation', () => {
	it('should have translations for all error keys in all languages', async () => {
		// This will throw if any translations are missing
		const results = await TranslationTestHelper.validateAllErrorKeys(ERROR_KEYS);
		
		// Verify we got results for all keys and languages
		expect(Object.keys(results)).toEqual(ERROR_KEYS);
		
		for (const key of ERROR_KEYS) {
			const languages = TranslationTestHelper.getAvailableLanguages();
			expect(Object.keys(results[key])).toEqual(languages);
		}
	});

	it('should have different translations for different languages', async () => {
		const key = 'errors.not_authenticated';
		
		const results = await TranslationTestHelper.testTranslationKey(key, {
			'en': 'authenticated', // should contain this word in English
			'fr': 'authentifié',  // should contain this in French
			'es': 'autenticado',  // should contain this in Spanish
		});

		// Verify they're actually different
		const values = Object.values(results);
		const uniqueValues = [...new Set(values)];
		
		expect(uniqueValues.length).toBeGreaterThan(1);
		expect(results.en).not.toBe(results.fr);
		expect(results.en).not.toBe(results.es);
	});

	it('should translate success messages', async () => {
		for (const key of MESSAGE_KEYS) {
			const results = await TranslationTestHelper.testTranslationKey(key, {});
			
			// Just verify we get different translations
			const values = Object.values(results);
			const uniqueValues = [...new Set(values)];
			expect(uniqueValues.length).toBeGreaterThan(1);
		}
	});

	it('should handle missing translation keys gracefully', async () => {
		await TranslationTestHelper.initForTesting('en');
		
		// Test with a key that doesn't exist
		const nonExistentKey = 'this.key.does.not.exist';
		// This should return the key itself or a fallback
		// Adjust expectation based on your i18n setup
	});
});