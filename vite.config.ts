import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [tailwindcss(), sveltekit()],

	test: {
		env: loadEnv('test', process.cwd(), ''),
		// Setup files are now conditional per project
		fileParallelism: false,

		expect: { requireAssertions: true },

		projects: [
			// {
			// 	extends: './vite.config.ts',

			// 	test: {
			// 		name: 'client',

			// 		browser: {
			// 			enabled: true,
			// 			provider: playwright(),
			// 			instances: [{ browser: 'chromium', headless: true }]
			// 		},

			// 		include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
			// 		exclude: ['src/lib/server/**']
			// 	}
			// },

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					// Only setup database for tests that import from db
					setupFiles: ['src/lib/server/db/test_db/vitest.setup.ts'],
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						'src/lib/component/**/*.{test,spec}.{js,ts}' // Game engine tests don't need DB
					]
				}
			},
			{
				extends: './vite.config.ts',

				test: {
					name: 'component',
					environment: 'node',
					// No database setup for component tests
					include: ['src/lib/component/**/*.{test,spec}.{js,ts}'],
					exclude: []
				}
			}
		]
	}
}));
