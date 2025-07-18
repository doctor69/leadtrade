import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_DnSWe8L0.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/alpaca/account.astro.mjs');
const _page2 = () => import('./pages/api/alpaca/assets.astro.mjs');
const _page3 = () => import('./pages/api/alpaca/market-data/bars.astro.mjs');
const _page4 = () => import('./pages/api/alpaca/market-data/quotes.astro.mjs');
const _page5 = () => import('./pages/api/alpaca/open-account.astro.mjs');
const _page6 = () => import('./pages/api/alpaca/options/chain.astro.mjs');
const _page7 = () => import('./pages/api/alpaca/orders.astro.mjs');
const _page8 = () => import('./pages/api/alpaca/portfolio-history.astro.mjs');
const _page9 = () => import('./pages/api/alpaca/positions.astro.mjs');
const _page10 = () => import('./pages/api/auth/signin.astro.mjs');
const _page11 = () => import('./pages/api/auth/signout.astro.mjs');
const _page12 = () => import('./pages/api/auth/signup.astro.mjs');
const _page13 = () => import('./pages/api/copy-trading/execute-trade.astro.mjs');
const _page14 = () => import('./pages/api/copy-trading/subscriptions.astro.mjs');
const _page15 = () => import('./pages/api/leaderboard.astro.mjs');
const _page16 = () => import('./pages/api/rollback-user.astro.mjs');
const _page17 = () => import('./pages/api/user/profile.astro.mjs');
const _page18 = () => import('./pages/api/user/trading-mode.astro.mjs');
const _page19 = () => import('./pages/api-demo.astro.mjs');
const _page20 = () => import('./pages/dashboard.astro.mjs');
const _page21 = () => import('./pages/leaderboard.astro.mjs');
const _page22 = () => import('./pages/settings.astro.mjs');
const _page23 = () => import('./pages/signin.astro.mjs');
const _page24 = () => import('./pages/signup.astro.mjs');
const _page25 = () => import('./pages/trade.astro.mjs');
const _page26 = () => import('./pages/websocket-demo.astro.mjs');
const _page27 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/alpaca/account.ts", _page1],
    ["src/pages/api/alpaca/assets.ts", _page2],
    ["src/pages/api/alpaca/market-data/bars.ts", _page3],
    ["src/pages/api/alpaca/market-data/quotes.ts", _page4],
    ["src/pages/api/alpaca/open-account.astro", _page5],
    ["src/pages/api/alpaca/options/chain.ts", _page6],
    ["src/pages/api/alpaca/orders.ts", _page7],
    ["src/pages/api/alpaca/portfolio-history.ts", _page8],
    ["src/pages/api/alpaca/positions.ts", _page9],
    ["src/pages/api/auth/signin.ts", _page10],
    ["src/pages/api/auth/signout.ts", _page11],
    ["src/pages/api/auth/signup.ts", _page12],
    ["src/pages/api/copy-trading/execute-trade.ts", _page13],
    ["src/pages/api/copy-trading/subscriptions.ts", _page14],
    ["src/pages/api/leaderboard.ts", _page15],
    ["src/pages/api/rollback-user.ts", _page16],
    ["src/pages/api/user/profile.ts", _page17],
    ["src/pages/api/user/trading-mode.ts", _page18],
    ["src/pages/api-demo.astro", _page19],
    ["src/pages/dashboard.astro", _page20],
    ["src/pages/leaderboard.astro", _page21],
    ["src/pages/settings.astro", _page22],
    ["src/pages/signin.astro", _page23],
    ["src/pages/signup.astro", _page24],
    ["src/pages/trade.astro", _page25],
    ["src/pages/websocket-demo.astro", _page26],
    ["src/pages/index.astro", _page27]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "4d19016b-ff4b-4ae0-9f74-dda4e3972bc3"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
