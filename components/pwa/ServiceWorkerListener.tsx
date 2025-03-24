// file: /lib/registerServiceWorker.ts
// feature: PWA - Service worker registration utility

/**
 * Register the service worker for PWA functionality
 */
export default async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    // Immediately activate any waiting service worker
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Handle updates automatically
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('Service worker controller changed, reloading page');
      window.location.reload();
    });

    // Handle update detection
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker is installed but waiting to activate
          // Immediately activate it without asking the user
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Set up periodic service worker checks every 60 minutes
    setInterval(() => {
      registration.update().catch(error => {
        console.error('Service worker update check failed:', error);
      });
    }, 60 * 60 * 1000);

    console.log('Service worker registered successfully');
    return true;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return false;
  }
}