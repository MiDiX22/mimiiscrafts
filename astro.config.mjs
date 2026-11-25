// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// La web és estàtica. Només /admin i /api/admin/* s'executen al servidor
// (marcats amb `export const prerender = false`).
export default defineConfig({
  adapter: vercel(),
  env: {
    schema: {
      ADMIN_USER: envField.string({ context: 'server', access: 'secret', optional: true }),
      ADMIN_PASSWORD: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_REPO: envField.string({ context: 'server', access: 'secret', default: 'MiDiX22/mimiiscrafts' }),
      GITHUB_BRANCH: envField.string({ context: 'server', access: 'secret', default: 'main' })
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
