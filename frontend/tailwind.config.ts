//tailwind.config.ts
/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class', // Use 'class' strategy for dark mode
  content: [
    './frontend/index.html',
    './frontend/src/**/*.{js,ts,jsx,tsx,html}',
  ],
  theme: { extend: {} },
  plugins: [],
};
