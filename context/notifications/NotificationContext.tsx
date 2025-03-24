// file: /context/notifications/NotificationContext.tsx
// feature: Notifications - Context provider for notification state management

'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from '@/components/ui/use-toast';

interface NotificationContextType {
  isSupported: boolean;
  isSubscribed: boolean;
  permissionState: NotificationPermission;
  subscription: PushSubscription | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  isSupported: false,
  isSubscribed: false,
  permissionState: 'default',
  subscription: null,
  subscribe: async () => false,
  unsubscribe: async () => false,
  isLoading: true,
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeSubscription = useMutation(api.notifications.index.storeSubscription);
  const removeSubscription = useMutation(api.notifications.index.removeSubscription);

  // Check browser support and initialize
  useEffect(() => {
    async function initialize() {
      const notificationSupported = 'Notification' in window;
      const serviceWorkerSupported = 'serviceWorker' in navigator;
      const pushSupported = 'PushManager' in window;
      
      if (!notificationSupported || !serviceWorkerSupported || !pushSupported) {
        setIsSupported(false);
        setIsLoading(false);
        return;
      }
      
      setIsSupported(true);
      setPermissionState(Notification.permission);
      
      try {
        const registration = await navigator.serviceWorker.ready;
        setServiceWorker(registration);
        
        const existingSubscription = await registration.pushManager.getSubscription();
        setSubscription(existingSubscription);
      } catch (error) {
        console.error('Notification initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    initialize();
  }, []);

  // Convert VAPID public key to Uint8Array
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Subscribe to push notifications
  async function subscribe(): Promise<boolean> {
    if (!isSupported || !serviceWorker) return false;
    
    try {
      setIsLoading(true);
      
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission !== 'granted') return false;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID key not configured');
      }
      
      const pushSubscription = await serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      
      const serializedSubscription = JSON.parse(JSON.stringify(pushSubscription));
      await storeSubscription({ subscription: serializedSubscription });
      
      setSubscription(pushSubscription);
      toast({ title: 'Notifications Enabled' });
      return true;
    } catch (error) {
      console.error('Subscription failed:', error);
      toast({ 
        title: 'Subscription Failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  // Unsubscribe from push notifications
  async function unsubscribe(): Promise<boolean> {
    if (!subscription) return false;
    
    try {
      setIsLoading(true);
      
      await subscription.unsubscribe();
      await removeSubscription({ endpoint: subscription.endpoint });
      
      setSubscription(null);
      toast({ title: 'Notifications Disabled' });
      return true;
    } catch (error) {
      console.error('Unsubscription failed:', error);
      toast({ 
        title: 'Unsubscription Failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    isSupported,
    isSubscribed: !!subscription,
    permissionState,
    subscription,
    subscribe,
    unsubscribe,
    isLoading,
  };

  // Setup service worker message listener
  useEffect(() => {
    // Function to handle messages from service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!event.data) return;
      
      if (event.data.type === 'PUSH_RECEIVED') {
        const { title, body, notificationType } = event.data;
        
        // Display toast notification based on type
        switch (notificationType) {
          case 'message':
            toast({
              title: title || 'New Message',
              description: body || 'You received a new message',
            });
            break;
            
          case 'reaction':
            toast({
              title: title || 'Profile Reaction',
              description: body || 'Someone reacted to your profile',
            });
            break;
            
          case 'call':
            toast({
              title: title || 'Incoming Call',
              description: body || 'Someone is calling you',
              variant: 'destructive',
              duration: 10000, // Longer duration for calls
            });
            break;
            
          default:
            toast({
              title: title || 'Notification',
              description: body || 'You have a new notification',
            });
        }
      }
    };

    // Add event listener for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    // Cleanup
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}