// file: /hooks/usePushNotifications.ts
// feature: Notifications - Custom hook for push notification management

/**
 * Push Notification Examples
 * 
 * 1. Basic Notification
 * ```typescript
 * const { notify } = usePushNotifications();
 * await notify(userId, {
 *   title: "Welcome!",
 *   body: "Thanks for joining our platform",
 *   icon: "/icon.png",
 *   url: "/welcome"
 * });
 * ```
 * 
 * 2. Message Notification
 * ```typescript
 * const { notifyMessage } = usePushNotifications();
 * await notifyMessage({
 *   recipientId: "user123",
 *   senderId: "user456", 
 *   messageContent: "Hey, how are you?",
 *   channelId: "channel789"
 * });
 * ```
 * 
 * 3. Reaction Notification
 * ```typescript
 * const { notifyReaction } = usePushNotifications();
 * await notifyReaction({
 *   recipientId: "user123",
 *   reactorId: "user456",
 *   reactionType: "like"
 * });
 * ```
 * 
 * 4. Call Notification
 * ```typescript
 * const { notifyCall } = usePushNotifications();
 * await notifyCall({
 *   recipientId: "user123",
 *   callerId: "user456",
 *   callType: "video"
 * });
 * ```
 */

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from '@/components/ui/use-toast';
import { Id } from '@/convex/_generated/dataModel';

// Notification types for the hook
export type NotificationType = 'basic';

// Notification data interfaces
export interface BasicNotificationData {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Convex mutations
  const storeSubscription = useMutation(api.notifications.index.storeSubscription);
  const removeSubscription = useMutation(api.notifications.index.removeSubscription);
  
  // Notification mutations
  const createNotification = useMutation(api.notifications.index.createNotification);

  // Initialize notification system
  useEffect(() => {
    async function initialize() {
      const notificationSupported = 'Notification' in window;
      const serviceWorkerSupported = 'serviceWorker' in navigator;
      const pushSupported = 'PushManager' in window;
      
      const supported = notificationSupported && serviceWorkerSupported && pushSupported;
      setIsSupported(supported);
      
      if (!supported) {
        setIsLoading(false);
        return;
      }
      
      setPermissionState(Notification.permission);
      
      try {
        const registration = await navigator.serviceWorker.ready;
        setServiceWorker(registration);
        
        const existingSubscription = await registration.pushManager.getSubscription();
        setSubscription(existingSubscription);
      } catch (error) {
        console.error('Push notifications initialization error:', error);
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
  async function subscribe() {
    if (!isSupported || !serviceWorker) {
      toast({
        title: 'Push notifications not supported',
        description: 'Your browser does not support push notifications',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission !== 'granted') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
        return;
      }
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key is not configured');
      }
      
      const pushSubscription = await serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      
      const serializedSubscription = JSON.parse(JSON.stringify(pushSubscription));
      await storeSubscription({ subscription: serializedSubscription });
      
      setSubscription(pushSubscription);
      
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive push notifications',
      });
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Failed to enable notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Unsubscribe from push notifications
  async function unsubscribe() {
    if (!subscription) return;
    
    try {
      setIsLoading(true);
      
      await subscription.unsubscribe();
      
      await removeSubscription({ endpoint: subscription.endpoint });
      
      setSubscription(null);
      
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications',
      });
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      
      toast({
        title: 'Unsubscribe failed',
        description: error instanceof Error ? error.message : 'Failed to disable notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Send a direct test notification to current subscription (for admin/testing)
  // This bypasses the normal notification flow and sends directly to the browser
  async function sendDirectTestNotification(payload: BasicNotificationData) {
    if (!subscription) {
      toast({
        title: 'No active subscription',
        description: 'You must enable notifications first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Call the API route directly
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: JSON.parse(JSON.stringify(subscription)),
          data: payload
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notification');
      }

      return true;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: 'Notification sending failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }

  // Create a basic notification through the Convex system
  async function notify(userId: Id<"users">, data: BasicNotificationData) {
    try {
      const result = await createNotification({
        userId,
        title: data.title,
        body: data.body,
        icon: data.icon,
        tag: data.tag,
        url: data.url,
        data: data.data
      });
      
      // Immediately process the notification
      await triggerNotificationProcessing();
      
      return true;
    } catch (error) {
      console.error('Failed to create notification:', error);
      toast({
        title: 'Failed to create notification',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }

  // Helper function to trigger notification processing
  async function triggerNotificationProcessing() {
    try {
      // Call the process endpoint to start processing immediately
      await fetch('/api/notifications/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notifications: [] }), // The endpoint will fetch pending notifications
      });
    } catch (error) {
      console.error('Failed to trigger notification processing:', error);
    }
  }

  return {
    // State
    isSupported,
    isSubscribed: !!subscription,
    permissionState,
    subscription,
    isLoading,
    
    // Subscription management
    subscribe,
    unsubscribe,
    
    // Notification functions
    sendDirectTestNotification, // For testing only
    notify               // Basic notification
  };
}

// Utility to check push notification support
export function checkPushNotificationSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}