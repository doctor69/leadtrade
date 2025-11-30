# Chrome Debug Steps

## Check These in Chrome DevTools

1. **Open DevTools** (F12)
2. **Console Tab** - Look for errors (red text)
3. **Network Tab** - Check if files are loading
4. **Application Tab** → Service Workers - Check if old SW is registered

## What to Look For

### Console Errors
- JavaScript errors?
- Failed to load resources?
- CORS errors?
- Service worker errors?

### Network Tab
- Is `index.html` loading? (Status 200?)
- Are JS/CSS files loading?
- Any 404 errors?

### Service Workers
- Any service workers registered?
- If yes, click "Unregister"

## Quick Fix for Chrome

Try this in Chrome DevTools Console:

```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('Unregistered', registrations.length, 'service workers');
});

// Clear all caches
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
  console.log('Cleared', keys.length, 'caches');
});

// Then hard refresh
location.reload(true);
```

## If Still Not Working

Share the error message from Console tab.
