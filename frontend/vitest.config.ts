import { defineConfig } from 'vitest/config';

export default defineConfig({
  // No plugins needed for Tailwind; handled via PostCSS
  test: {
    environment: 'jsdom',        // DOM APIs for your canvas code
    include: ['src/**/*.test.ts'],
    css: true,                   // allow importing CSS in tests if needed
  },
});