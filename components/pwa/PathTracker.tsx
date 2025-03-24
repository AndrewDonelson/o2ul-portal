// file: /components/pwa/PathTracker.tsx
// feature: PWA - Component for tracking user paths for offline fallback

"use client";

import { usePathTracking } from "@/hooks/usePathTracking";

/**
 * Component that uses the path tracking hook
 * This component doesn't render anything visible
 * but tracks the user's path for a better offline experience
 */
export default function PathTracker() {
  // Use the path tracking hook
  usePathTracking();
  
  // This component doesn't render anything visible
  return null;
}