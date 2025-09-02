// postcss.config.ts
<<<<<<< HEAD

export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
=======
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss,
    autoprefixer,
  ],
>>>>>>> origin/devops
};