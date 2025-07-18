// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

import netlify from '@astrojs/netlify';

export default defineConfig({
  integrations: [react(), tailwind()],

  build: {
    inlineStylesheets: 'auto',
    assets: '_astro'
  },

  server: {
    host: true
  },

  output: 'static',

  // Ensure all pages are prerendered for static deployment

  vite: {
    build: {
      rollupOptions: {
        external: []
      }
    }
  },

  adapter: netlify()
});