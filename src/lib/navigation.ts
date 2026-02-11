/**
 * Navigation utilities for static site routing
 */

export const navigateTo = (href: string, options?: { replace?: boolean }) => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Validate the href
    if (!href || typeof href !== 'string') {
      console.error('Invalid navigation href:', href);
      return;
    }

    // Handle relative URLs
    const url = href.startsWith('/') ? href : `/${href}`;

    // For Astro static sites, we need to use window.location for navigation
    // but we can try to prevent unnecessary refreshes by checking current location
    if (window.location.pathname === url) {
      console.log('Already on target page:', url);
      return;
    }

    // Use replace or assign based on options
    if (options?.replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback: try to navigate anyway
    try {
      window.location.href = href;
    } catch (fallbackError) {
      console.error('Fallback navigation failed:', fallbackError);
    }
  }
};

export const isValidRoute = (href: string): boolean => {
  const validRoutes = [
    '/',
    '/dashboard',
    '/trade',
    '/funding',
    '/leaderboard',
    '/settings',
    '/signin',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ];

  // Check if the base path (without query parameters) is valid
  const basePath = href.split('?')[0];
  return validRoutes.includes(basePath);
};

export const safeNavigate = (href: string, options?: { replace?: boolean }) => {
  if (isValidRoute(href)) {
    navigateTo(href, options);
  } else {
    console.warn('Attempting to navigate to invalid route:', href);
    // Navigate to home as fallback
    navigateTo('/', options);
  }
};