// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],

  build: {
    inlineStylesheets: 'auto'
  },

  server: {
    host: true
  },

  output: 'static'
});