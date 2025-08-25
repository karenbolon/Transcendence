import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',        // DOM APIs for your canvas code
    include: ['src/**/*.test.ts'],
    css: true,                   // allow importing CSS in tests if needed
  },
});