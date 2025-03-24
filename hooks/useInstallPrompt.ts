// file: /hooks/useInstallPrompt.ts
// feature: PWA - Install prompt hook for PWA installation

'use client';

import { useState, useEffect, useCallback } from 'react';

declare global {
    interface Window {
      MSStream?: any;
    }
  }
  
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);

  // Check if app is already installed
  useEffect(() => {
    const checkInstalled = () => {
      // Check if app is in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // Check iOS standalone mode
      // @ts-ignore - Safari specific property
      const isIOSStandalone = window.navigator.standalone === true;
      
      setIsInstalled(isStandalone || isIOSStandalone);
      
      // Check if device is iOS
      const ua = navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua) && !window.MSStream);
      
      // Check if install was previously dismissed
      const dismissed = localStorage.getItem('installPromptDismissed');
      setInstallDismissed(dismissed === 'true');
    };

    if (typeof window !== 'undefined') {
      checkInstalled();
      
      // Listen for display mode changes
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      mediaQuery.addEventListener('change', checkInstalled);
      
      return () => {
        mediaQuery.removeEventListener('change', checkInstalled);
      };
    }
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if successfully installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      // Log or track successful installation
      console.log('App was successfully installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  // Function to show the install prompt
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      // Show the prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;
      
      // Reset the deferred prompt variable
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Function to mark the install prompt as dismissed
  const dismissInstall = useCallback(() => {
    setInstallDismissed(true);
    localStorage.setItem('installPromptDismissed', 'true');
  }, []);

  // Function to reset the dismissed state
  const resetDismissed = useCallback(() => {
    setInstallDismissed(false);
    localStorage.removeItem('installPromptDismissed');
  }, []);

  return {
    isInstalled,
    isInstallable,
    isIOS,
    installDismissed,
    promptInstall,
    dismissInstall,
    resetDismissed
  };
}