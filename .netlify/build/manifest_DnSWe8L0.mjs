import 'kleur/colors';
import { n as NOOP_MIDDLEWARE_HEADER, o as decodeKey } from './chunks/astro/server_DLJBK80m.mjs';
import 'clsx';
import 'cookie';
import 'es-module-lexer';
import 'html-escaper';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

const codeToStatusMap = {
  // Implemented from IANA HTTP Status Code Registry
  // https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  CONTENT_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_CONTENT: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NETWORK_AUTHENTICATION_REQUIRED: 511
};
Object.entries(codeToStatusMap).reduce(
  // reverse the key-value pairs
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/saketsharma/Projects/leadtrade/","cacheDir":"file:///Users/saketsharma/Projects/leadtrade/node_modules/.astro/","outDir":"file:///Users/saketsharma/Projects/leadtrade/dist/","srcDir":"file:///Users/saketsharma/Projects/leadtrade/src/","publicDir":"file:///Users/saketsharma/Projects/leadtrade/public/","buildClientDir":"file:///Users/saketsharma/Projects/leadtrade/dist/","buildServerDir":"file:///Users/saketsharma/Projects/leadtrade/.netlify/build/","adapterName":"@astrojs/netlify","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/account","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/account","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/account\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"account","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/account.ts","pathname":"/api/alpaca/account","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/assets","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/assets","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/assets\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"assets","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/assets.ts","pathname":"/api/alpaca/assets","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/market-data/bars","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/market-data/bars","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/market-data\\/bars\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"market-data","dynamic":false,"spread":false}],[{"content":"bars","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/market-data/bars.ts","pathname":"/api/alpaca/market-data/bars","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/market-data/quotes","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/market-data/quotes","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/market-data\\/quotes\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"market-data","dynamic":false,"spread":false}],[{"content":"quotes","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/market-data/quotes.ts","pathname":"/api/alpaca/market-data/quotes","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/open-account/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/open-account","isIndex":false,"type":"page","pattern":"^\\/api\\/alpaca\\/open-account\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"open-account","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/open-account.astro","pathname":"/api/alpaca/open-account","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/options/chain","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/options/chain","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/options\\/chain\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"options","dynamic":false,"spread":false}],[{"content":"chain","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/options/chain.ts","pathname":"/api/alpaca/options/chain","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/orders","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/orders","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/orders\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"orders","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/orders.ts","pathname":"/api/alpaca/orders","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/portfolio-history","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/portfolio-history","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/portfolio-history\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"portfolio-history","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/portfolio-history.ts","pathname":"/api/alpaca/portfolio-history","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/alpaca/positions","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/alpaca/positions","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/alpaca\\/positions\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"alpaca","dynamic":false,"spread":false}],[{"content":"positions","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/alpaca/positions.ts","pathname":"/api/alpaca/positions","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/auth/signin","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/signin","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/signin\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"signin","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/signin.ts","pathname":"/api/auth/signin","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/auth/signout","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/signout","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/signout\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"signout","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/signout.ts","pathname":"/api/auth/signout","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/auth/signup","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/signup","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/signup\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"signup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/signup.ts","pathname":"/api/auth/signup","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/copy-trading/execute-trade","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/copy-trading/execute-trade","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/copy-trading\\/execute-trade\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"copy-trading","dynamic":false,"spread":false}],[{"content":"execute-trade","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/copy-trading/execute-trade.ts","pathname":"/api/copy-trading/execute-trade","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/copy-trading/subscriptions","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/copy-trading/subscriptions","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/copy-trading\\/subscriptions\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"copy-trading","dynamic":false,"spread":false}],[{"content":"subscriptions","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/copy-trading/subscriptions.ts","pathname":"/api/copy-trading/subscriptions","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/leaderboard","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/leaderboard","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/leaderboard\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"leaderboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/leaderboard.ts","pathname":"/api/leaderboard","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api/rollback-user","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/rollback-user","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/rollback-user\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"rollback-user","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/rollback-user.ts","pathname":"/api/rollback-user","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"api-demo/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api-demo","isIndex":false,"type":"page","pattern":"^\\/api-demo\\/?$","segments":[[{"content":"api-demo","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api-demo.astro","pathname":"/api-demo","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"dashboard/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/dashboard","isIndex":false,"type":"page","pattern":"^\\/dashboard\\/?$","segments":[[{"content":"dashboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/dashboard.astro","pathname":"/dashboard","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"leaderboard/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/leaderboard","isIndex":false,"type":"page","pattern":"^\\/leaderboard\\/?$","segments":[[{"content":"leaderboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/leaderboard.astro","pathname":"/leaderboard","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"settings/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/settings","isIndex":false,"type":"page","pattern":"^\\/settings\\/?$","segments":[[{"content":"settings","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/settings.astro","pathname":"/settings","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"signin/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/signin","isIndex":false,"type":"page","pattern":"^\\/signin\\/?$","segments":[[{"content":"signin","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/signin.astro","pathname":"/signin","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"signup/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/signup","isIndex":false,"type":"page","pattern":"^\\/signup\\/?$","segments":[[{"content":"signup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/signup.astro","pathname":"/signup","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"trade/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/trade","isIndex":false,"type":"page","pattern":"^\\/trade\\/?$","segments":[[{"content":"trade","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/trade.astro","pathname":"/trade","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"websocket-demo/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/websocket-demo","isIndex":false,"type":"page","pattern":"^\\/websocket-demo\\/?$","segments":[[{"content":"websocket-demo","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/websocket-demo.astro","pathname":"/websocket-demo","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/user/profile","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/user\\/profile\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"user","dynamic":false,"spread":false}],[{"content":"profile","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/user/profile.ts","pathname":"/api/user/profile","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/user/trading-mode","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/user\\/trading-mode\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"user","dynamic":false,"spread":false}],[{"content":"trading-mode","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/user/trading-mode.ts","pathname":"/api/user/trading-mode","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/saketsharma/Projects/leadtrade/src/pages/api-demo.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/api/alpaca/open-account.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/dashboard.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/leaderboard.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/settings.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/signin.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/signup.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/trade.astro",{"propagation":"none","containsHead":true}],["/Users/saketsharma/Projects/leadtrade/src/pages/websocket-demo.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000noop-actions":"_noop-actions.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/account@_@ts":"pages/api/alpaca/account.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/assets@_@ts":"pages/api/alpaca/assets.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/market-data/bars@_@ts":"pages/api/alpaca/market-data/bars.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/market-data/quotes@_@ts":"pages/api/alpaca/market-data/quotes.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/open-account@_@astro":"pages/api/alpaca/open-account.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/options/chain@_@ts":"pages/api/alpaca/options/chain.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/orders@_@ts":"pages/api/alpaca/orders.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/portfolio-history@_@ts":"pages/api/alpaca/portfolio-history.astro.mjs","\u0000@astro-page:src/pages/api/alpaca/positions@_@ts":"pages/api/alpaca/positions.astro.mjs","\u0000@astro-page:src/pages/api/auth/signin@_@ts":"pages/api/auth/signin.astro.mjs","\u0000@astro-page:src/pages/api/auth/signout@_@ts":"pages/api/auth/signout.astro.mjs","\u0000@astro-page:src/pages/api/auth/signup@_@ts":"pages/api/auth/signup.astro.mjs","\u0000@astro-page:src/pages/api/copy-trading/execute-trade@_@ts":"pages/api/copy-trading/execute-trade.astro.mjs","\u0000@astro-page:src/pages/api/copy-trading/subscriptions@_@ts":"pages/api/copy-trading/subscriptions.astro.mjs","\u0000@astro-page:src/pages/api/leaderboard@_@ts":"pages/api/leaderboard.astro.mjs","\u0000@astro-page:src/pages/api/rollback-user@_@ts":"pages/api/rollback-user.astro.mjs","\u0000@astro-page:src/pages/api/user/profile@_@ts":"pages/api/user/profile.astro.mjs","\u0000@astro-page:src/pages/api/user/trading-mode@_@ts":"pages/api/user/trading-mode.astro.mjs","\u0000@astro-page:src/pages/api-demo@_@astro":"pages/api-demo.astro.mjs","\u0000@astro-page:src/pages/dashboard@_@astro":"pages/dashboard.astro.mjs","\u0000@astro-page:src/pages/leaderboard@_@astro":"pages/leaderboard.astro.mjs","\u0000@astro-page:src/pages/settings@_@astro":"pages/settings.astro.mjs","\u0000@astro-page:src/pages/signin@_@astro":"pages/signin.astro.mjs","\u0000@astro-page:src/pages/signup@_@astro":"pages/signup.astro.mjs","\u0000@astro-page:src/pages/trade@_@astro":"pages/trade.astro.mjs","\u0000@astro-page:src/pages/websocket-demo@_@astro":"pages/websocket-demo.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_DnSWe8L0.mjs","/Users/saketsharma/Projects/leadtrade/src/lib/supabase.ts":"_astro/supabase.Bot2cxS1.js","/Users/saketsharma/Projects/leadtrade/node_modules/unstorage/drivers/netlify-blobs.mjs":"chunks/netlify-blobs_DM36vZAS.mjs","@/components/ProtectedRoute":"_astro/ProtectedRoute.PIjH8-8V.js","@/components/trading/TradingDashboard":"_astro/TradingDashboard.2UUyBxW_.js","@/components/trading/Leaderboard":"_astro/Leaderboard.D2C-u33I.js","@/components/ui/UserSettings":"_astro/UserSettings.Nx74zJW2.js","@/components/SignInForm":"_astro/SignInForm.BZ0yIjVn.js","@/components/ui/trade/AccountCreationForm":"_astro/AccountCreationForm.Cxe9oLGF.js","@/components/trading/TradingInterface":"_astro/TradingInterface.DLeJQypK.js","@/components/trading/SmartMarketData":"_astro/SmartMarketData.B86xu7e1.js","@/components/ui/navbar":"_astro/navbar.BzCmPLpm.js","@/components/ui/trade/open-account":"_astro/open-account.C9gZuo1f.js","@astrojs/react/client.js":"_astro/client.DOE8aRX6.js","/Users/saketsharma/Projects/leadtrade/src/pages/api-demo.astro?astro&type=script&index=0&lang.ts":"_astro/api-demo.astro_astro_type_script_index_0_lang.VS6kFiWv.js","/Users/saketsharma/Projects/leadtrade/src/pages/websocket-demo.astro?astro&type=script&index=0&lang.ts":"_astro/websocket-demo.astro_astro_type_script_index_0_lang.iBBRzQDQ.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/api-demo.BgQZfmNK.css","/config.js","/favicon.svg","/_astro/AccountCreationForm.Cxe9oLGF.js","/_astro/AccountPositions.W-cTbd8M.js","/_astro/Leaderboard.D2C-u33I.js","/_astro/PortfolioChart.B2FOIrF9.js","/_astro/ProtectedRoute.PIjH8-8V.js","/_astro/RealTimeMarketData.DQnrTW3J.js","/_astro/SignInForm.BZ0yIjVn.js","/_astro/SmartMarketData.B86xu7e1.js","/_astro/TradingDashboard.2UUyBxW_.js","/_astro/TradingInterface.DLeJQypK.js","/_astro/UserSettings.Nx74zJW2.js","/_astro/api-demo.astro_astro_type_script_index_0_lang.VS6kFiWv.js","/_astro/apiService.BrfffWLO.js","/_astro/badge.DqeXQtR6.js","/_astro/browser.D07ArKRc.js","/_astro/card.DWl6YHCl.js","/_astro/check.Dya53I1o.js","/_astro/checkbox.BManyjuF.js","/_astro/circle-alert.DW0tYE1m.js","/_astro/circle-check-big.L1igMGTo.js","/_astro/client.DMASqsBT.js","/_astro/client.DOE8aRX6.js","/_astro/createLucideIcon.DyRQfJW3.js","/_astro/dollar-sign.DSsgyDbd.js","/_astro/encryption.B5EI-zXs.js","/_astro/index.B2ZQCgON.js","/_astro/index.BHdNwite.js","/_astro/index.BdQq_4o_.js","/_astro/index.C0sM4f78.js","/_astro/index.Cso-QPtg.js","/_astro/index.CtUhTCcM.js","/_astro/index.DO2KyY4f.js","/_astro/index.eHSaNxSx.js","/_astro/input.Bsk66KpO.js","/_astro/jsx-runtime.D_zvdyIk.js","/_astro/navbar.BzCmPLpm.js","/_astro/open-account.C9gZuo1f.js","/_astro/search.C0YJEj9R.js","/_astro/select.BX7waL8-.js","/_astro/supabase.Bot2cxS1.js","/_astro/table.Dus_fWa3.js","/_astro/tabs.DLgjXoce.js","/_astro/trading-config.DQU9v5lt.js","/_astro/trending-down.Bubt0UGK.js","/_astro/trending-up.Cbts1KTP.js","/_astro/useAlpacaWebSocket.pD-zj8YH.js","/_astro/websocket-demo.astro_astro_type_script_index_0_lang.iBBRzQDQ.js","/_astro/x.6QvzUrNL.js","/api/alpaca/account","/api/alpaca/assets","/api/alpaca/market-data/bars","/api/alpaca/market-data/quotes","/api/alpaca/open-account/index.html","/api/alpaca/options/chain","/api/alpaca/orders","/api/alpaca/portfolio-history","/api/alpaca/positions","/api/auth/signin","/api/auth/signout","/api/auth/signup","/api/copy-trading/execute-trade","/api/copy-trading/subscriptions","/api/leaderboard","/api/rollback-user","/api-demo/index.html","/dashboard/index.html","/leaderboard/index.html","/settings/index.html","/signin/index.html","/signup/index.html","/trade/index.html","/websocket-demo/index.html","/index.html"],"buildFormat":"directory","checkOrigin":true,"serverIslandNameMap":[],"key":"Dc74B7XRU+5zXZX5vKwZxSzmibmtaKXYVDcqsG6e+Do=","sessionConfig":{"driver":"netlify-blobs","options":{"name":"astro-sessions","consistency":"strong"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/netlify-blobs_DM36vZAS.mjs');

export { manifest };
