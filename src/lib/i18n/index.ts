import { register, init, getLocaleFromNavigator, locale } from 'svelte-i18n';

export const SUPPORTED_LOCALES = ['en', 'de', 'es', 'fr'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const FALLBACK_LOCALE: SupportedLocale = 'en';

//had to explicitly pull languages in as Vite was hiccupping
register('en', () => import('./en.json'));
register('de', () => import('./de.json'));
register('es', () => import('./es.json'));
register('fr', () => import('./fr.json'));
register('pt', () => import('./pt.json'));

export function normaliseLocale(input?: string | null): SupportedLocale {
	if (!input)
		return FALLBACK_LOCALE;
	const short = input.split('-')[0] as SupportedLocale;
	return (SUPPORTED_LOCALES as readonly string[]).includes(short) ? short : FALLBACK_LOCALE;
}

export function detectInitialLocale(preferred?: string | null): SupportedLocale {
	//preferred can be from server (cookie/header) or localStorage
	if (preferred)
		return normaliseLocale(preferred);

	//navigator only exists in browser
	if (typeof window !== 'undefined') {
		const nav = getLocaleFromNavigator();
		return normaliseLocale(nav);
	}
	return FALLBACK_LOCALE;
}

let initialised = false;

export function initI18n(initialLocale: SupportedLocale) {
	if (initialised)
		return;
	initialised = true;

	init({
		fallbackLocale: FALLBACK_LOCALE, initialLocale
	});

	//localStorage in the browser only
	if (typeof window !== 'undefined') {
		locale.subscribe((l) => {
			if (l)
				localStorage.setItem('locale', l);
		});
	}
}