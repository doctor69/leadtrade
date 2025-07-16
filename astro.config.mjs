// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    css: {
      preprocessorOptions: {
        css: {
          charset: false
        }
      }
    }
  },
  build: {
    inlineStylesheets: 'auto'
  },
  server: {
    host: true
  },
  output: 'static'
});