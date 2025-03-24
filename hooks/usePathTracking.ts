// file: /hooks/usePathTracking.ts
// feature: PWA - Hook for tracking the user's current path for offline fallback

"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A hook that tracks the user's current path and stores it in sessionStorage
 * This helps improve the offline experience by allowing the service worker
 * to redirect back to the last viewed page when coming back online
 */
export function usePathTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    
    // Skip tracking for certain paths
    const excludedPaths = ['/offline', '/signin', '/api'];
    if (excludedPaths.some(path => pathname.startsWith(path))) {
      return;
    }
    
    try {
      // Store the current path in sessionStorage
      sessionStorage.setItem('lastPath', pathname);
    } catch (e) {
      // Ignore storage errors
      console.error('Failed to store path in sessionStorage', e);
    }
  }, [pathname]);

  // No need to return anything as this is a side-effect only hook
  return null;
}

/**
 * Utility function to get the last visited path
 * Can be used in components without the hook
 */
export function getLastVisitedPath(): string {
  if (typeof window === 'undefined') return '/';
  
  try {
    return sessionStorage.getItem('lastPath') || '/';
  } catch (e) {
    return '/';
  }
}

export default usePathTracking;