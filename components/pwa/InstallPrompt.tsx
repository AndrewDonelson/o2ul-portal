// file: /components/pwa/InstallPrompt.tsx
// feature: PWA - Install prompt for the progressive web application

"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

// Interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useLocalStorage("pwa-prompt-dismissed", false);
  const [lastPromptDate, setLastPromptDate] = useLocalStorage("pwa-prompt-date", 0);
  const [installPlatform, setInstallPlatform] = useState<string>("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if the app is already installed
  useEffect(() => {
    // Check for display-mode: standalone which indicates installed PWA
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mediaQuery.matches);
    
    // Also check if came from iOS "Add to Home Screen"
    // @ts-ignore - navigator.standalone exists in Safari on iOS but not in the TypeScript types
    const isIOSPWA = window.navigator.standalone === true;
    if (isIOSPWA) {
      setIsInstalled(true);
    }
    
    // Listen for changes 
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    if (isInstalled) return;
    
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Get platform info
      if (e.platforms && e.platforms.length) {
        setInstallPlatform(e.platforms[0]);
      }
      
      // Determine if we should show the prompt
      const now = Date.now();
      const daysSinceLastPrompt = (now - lastPromptDate) / (1000 * 60 * 60 * 24);
      
      // Show prompt if not dismissed or last dismissed more than 30 days ago
      if (!isDismissed || daysSinceLastPrompt > 30) {
        // Show after 5 seconds of being on the page
        setTimeout(() => {
          setIsVisible(true);
          setIsAnimating(true);
        }, 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isDismissed, lastPromptDate, isInstalled]);

  // Handle app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setIsVisible(false);
      setIsInstalled(true);
      
      // You might want to log this event to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'pwa_installed');
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install the app
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        // User accepted the install prompt
        setIsVisible(false);
        setDeferredPrompt(null);
        
        // Analytics tracking
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'pwa_install_accepted');
        }
      } else {
        // User dismissed the install prompt
        setIsDismissed(true);
        setLastPromptDate(Date.now());
        setIsVisible(false);
        
        // Analytics tracking
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'pwa_install_dismissed');
        }
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  // Dismiss the prompt
  const handleDismiss = () => {
    setIsDismissed(true);
    setLastPromptDate(Date.now());
    setIsVisible(false);
    setIsAnimating(false);
    
    // Analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'pwa_prompt_dismissed');
    }
  };

  // Animation end handler
  const handleAnimationEnd = () => {
    setIsAnimating(false);
  };

  // Don't render if not visible or already installed
  if (!isVisible || isInstalled) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4 z-50",
        isAnimating ? "animate-fade-in-up" : ""
      )}
      onAnimationEnd={handleAnimationEnd}
    >
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Install App</CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Get the best Foch on by installing our app!
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-col gap-2">
            <div className="text-sm">
              Install this app on your {installPlatform || 'device'} for quick and easy access when you&apos;re on the go.
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDismiss}
          >
            Not now
          </Button>
          <Button 
            size="sm" 
            onClick={handleInstall}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Install
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Add TypeScript type extension for window object
declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: any) => void;
  }
}