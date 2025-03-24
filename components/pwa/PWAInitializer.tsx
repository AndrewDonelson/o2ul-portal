// file: /components/pwa/PWAInitializer.tsx
// feature: PWA - Component for initializing PWA features

"use client";

import { useEffect, useState } from 'react';
import { useToast } from "@/components/ui/use-toast";

interface PWAInitializerProps {
  enableServiceWorker?: boolean;
}

/**
 * Component that initializes PWA features including service worker registration
 * @param enableServiceWorker Whether to enable service worker registration (defaults to true)
 */
export default function PWAInitializer({ 
  enableServiceWorker = true 
}: PWAInitializerProps) {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Register service worker if enabled
    if (!enableServiceWorker || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Handle messages from service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        console.log('[PWA] Service worker activated:', event.data.version);
        
        // Check for preloaded but unused resources
        if (window.performance && window.performance.getEntriesByType) {
          const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
          const preloadedResources = resources.filter(r => 
            r.initiatorType === 'link' && 
            r.name.includes('/static/')
          );
          
          const preloadedButUnused = preloadedResources.some(r => {
            // Check if there was no matching resource fetch
            const matchingFetch = resources.find(fetchResource => 
              fetchResource.initiatorType !== 'link' && 
              fetchResource.name === r.name
            );
            return !matchingFetch;
          });
          
          if (preloadedButUnused) {
            console.log('[PWA] Detected preloaded but unused resources, refreshing page');
            window.location.reload();
          }
        }
      }
    };

    // Register the service worker
    const registerServiceWorker = async () => {
      try {
        console.log('[PWA] Registering service worker');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        
        setSwRegistration(registration);
        console.log('[PWA] Service worker registered successfully');
        
        // Cache stylesheets when the service worker is active
        if (registration.active) {
          registration.active.postMessage({
            type: 'CACHE_STYLESHEETS'
          });
        }
        
        // Immediately activate any waiting service worker
        if (registration.waiting) {
          console.log('[PWA] Found waiting service worker, activating it');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Handle updates automatically
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          console.log('[PWA] Service worker controller changed, reloading page');
          window.location.reload();
        });
        
        // Handle update detection
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          
          console.log('[PWA] New service worker found, monitoring state');
          newWorker.addEventListener('statechange', () => {
            console.log('[PWA] Service worker state changed to:', newWorker.state);
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed but waiting to activate
              console.log('[PWA] New service worker installed, activating it');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Cache stylesheets when the service worker becomes active
            if (newWorker.state === 'activated') {
              newWorker.postMessage({
                type: 'CACHE_STYLESHEETS'
              });
            }
          });
        });
        
        // Set up periodic service worker checks
        const checkInterval = setInterval(() => {
          console.log('[PWA] Checking for service worker updates');
          registration.update().catch(error => {
            console.error('[PWA] Service worker update check failed:', error);
          });
        }, 60 * 60 * 1000); // Check every hour
        
        return () => clearInterval(checkInterval);
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };
    
    // Add service worker message listener
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    // Register service worker
    registerServiceWorker();
    
    // Track connection state changes
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      document.documentElement.setAttribute('data-connection', isOnline ? 'online' : 'offline');
      
      // Notify when app goes offline
      if (!isOnline && !window.offlineNotified) {
        window.offlineNotified = true;
        
        // Show toast notification
        toast({
          title: "You're offline",
          description: "App will continue to work with limited functionality",
          duration: 5000,
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[PWA] Application is offline');
        }
      } else if (isOnline && window.offlineNotified) {
        window.offlineNotified = false;
        
        // Show toast notification
        toast({
          title: "You're back online",
          description: "Full functionality has been restored",
          duration: 3000,
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[PWA] Application is back online');
        }
      }
    };
    
    // Initial check
    updateOnlineStatus();
    
    // Add event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Save current page for potential offline fallback
    try {
      const currentPath = window.location.pathname;
      if (currentPath !== '/offline' && currentPath !== '/signin' && !currentPath.startsWith('/api')) {
        sessionStorage.setItem('lastPath', currentPath);
      }
    } catch (e) {
      // Ignore storage errors
    }
    
    // Cache critical CSS for offline use
    const cacheCriticalCSS = () => {
      if (navigator.serviceWorker.controller) {
        const stylesheets = Array.from(
          document.querySelectorAll('link[rel="stylesheet"]')
        ).map((link) => (link as HTMLLinkElement).href);
          
        if (stylesheets.length > 0) {
          console.log('[PWA] Requesting service worker to cache stylesheets:', stylesheets);
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_STYLESHEETS'
          });
        }
      }
    };
    
    // Cache CSS when online
    if (navigator.onLine) {
      // Wait for page load to ensure all stylesheets are loaded
      window.addEventListener('load', cacheCriticalCSS, { once: true });
    }
    
    // App performance metrics
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        // Mark when the app shell has loaded
        window.performance.mark('app-shell-loaded');
        
        // Listen for full load event
        window.addEventListener('load', () => {
          window.performance.mark('app-fully-loaded');
          
          // Get timing measurements
          const shellPerformance = window.performance.getEntriesByName('app-shell-loaded');
          const fullPerformance = window.performance.getEntriesByName('app-fully-loaded');
          
          if (shellPerformance.length > 0 && fullPerformance.length > 0) {
            const shellTime = shellPerformance[0].startTime;
            const fullTime = fullPerformance[0].startTime;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[PWA] Shell loaded in ${shellTime.toFixed(2)}ms, fully loaded in ${fullTime.toFixed(2)}ms`);
            }
          }
        });
      } catch (e) {
        // Ignore performance API errors
      }
    }
    
    // Cleanup function
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('load', cacheCriticalCSS);
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [enableServiceWorker, toast]);

  // This component doesn't render anything visible
  return null;
}

// Add TypeScript type extension for window object
declare global {
  interface Window {
    offlineNotified?: boolean;
  }
}