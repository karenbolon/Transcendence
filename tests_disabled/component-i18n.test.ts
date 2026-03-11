import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { locale, _ } from 'svelte-i18n';
import { get } from 'svelte/store';

// Example component that uses translations
const TestComponent = `
<script>
  import { _ } from 'svelte-i18n';
  export let errorKey = '';
</script>

{#if errorKey}
  <div data-testid="error-message">{$_(errorKey)}</div>
{/if}
`;

describe('Component i18n', () => {
	beforeEach(() => {
		// Reset to default locale before each test
		locale.set('en');
	});

	it('should display English error message', async () => {
		// Set locale to English
		locale.set('en');
		
		const { getByTestId } = render(TestComponent, {
			props: { errorKey: 'errors.not_authenticated' }
		});

		// Wait a bit for translations to load
		await new Promise(resolve => setTimeout(resolve, 100));
		
		const errorElement = getByTestId('error-message');
		expect(errorElement.textContent).toContain('not authenticated'); // or whatever your English translation is
	});

	it('should display French error message', async () => {
		locale.set('fr');
		
		const { getByTestId } = render(TestComponent, {
			props: { errorKey: 'errors.not_authenticated' }
		});

		await new Promise(resolve => setTimeout(resolve, 100));
		
		const errorElement = getByTestId('error-message');
		expect(errorElement.textContent).toContain('authentifié'); // or whatever your French translation is
	});

	it('should display Spanish error message', async () => {
		locale.set('es');
		
		const { getByTestId } = render(TestComponent, {
			props: { errorKey: 'errors.not_authenticated' }
		});

		await new Promise(resolve => setTimeout(resolve, 100));
		
		const errorElement = getByTestId('error-message');
		expect(errorElement.textContent).toContain('autenticado'); // or whatever your Spanish translation is
	});
});