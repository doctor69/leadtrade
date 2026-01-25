// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react({
      // Use React 19 compatible settings
      include: ['**/react/*'],
      // Ensure compatibility with React 19
      experimentalReactChildren: false,
    })
  ],
  output: 'static', // Pure static output for CDN deployment
  build: {
    assets: 'assets',
    // Ensure proper routing for static sites
    format: 'directory',
    // PWA optimization settings
    inlineStylesheets: 'auto',
    // Enable asset optimization for PWA
    assetsPrefix: undefined,
  },
  // Add trailing slash for better static hosting compatibility
  trailingSlash: 'ignore',
  // PWA-specific site configuration
  site: process.env.PUBLIC_APP_URL || 'https://leadtrade.app',
  base: '/',
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['@supabase/supabase-js'],
    },
    build: {
      // PWA build optimizations
      rollupOptions: {
        output: {
          // Optimize chunk splitting for PWA caching
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
            'vendor-charts': ['recharts'],
            'vendor-table': ['@tanstack/react-table'],
            'trading-components': [
              'src/components/trading/TradingDashboard.tsx',
              'src/components/trading/TradeForm.tsx',
              'src/components/trading/Leaderboard.tsx'
            ]
          }
        }
      },
      // Service worker and PWA asset optimization
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: true,
        },
        mangle: {
          safari10: true,
        },
      },
      // Optimize for mobile devices
      cssCodeSplit: true,
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    // PWA development optimizations
    server: {
      headers: {
        // Enable service worker in development
        'Service-Worker-Allowed': '/',
      },
    },
  },
});