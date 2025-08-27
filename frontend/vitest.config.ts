import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss()
  ],
  test: {
    environment: 'jsdom',        // DOM APIs for your canvas code
    include: ['src/**/*.test.ts'],
    css: true,                   // allow importing CSS in tests if needed
  },
});