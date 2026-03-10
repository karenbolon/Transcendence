import { locale } from 'svelte-i18n';
import { fetchJSON } from '$lib/utils/format_utils';

export async function setUserLanguage(lang: string, saveToDatabase: boolean = true): Promise<boolean> {
	try {
		// Always update the UI immediately
		locale.set(lang);
		localStorage.setItem('locale', lang);

		// Save to database if user is logged in and saveToDatabase is true
		if (saveToDatabase && typeof window !== 'undefined') {
			await fetchJSON('/api/settings/language', 'PUT', { language: lang });
		}
		
		return true;
	} catch (error) {
		console.error('Failed to save language preference:', error);
		return false;
	}
}