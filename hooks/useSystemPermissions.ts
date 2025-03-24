// file: /hooks/useSystemPermissions.ts
// feature: Permissions - Hook for managing system device permissions

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

// Define the types of system permissions
export type PermissionType =
    | 'microphone'
    | 'camera'
    | 'location'
    | 'notifications'
    | 'storage';

// Interface for permission status
export interface PermissionStatus {
    state: 'granted' | 'denied' | 'prompt' | 'unsupported';
    isSupported: boolean;
}

// Helper function to convert Notification permission to PermissionStatus state
function convertNotificationPermission(permission: NotificationPermission): PermissionStatus['state'] {
    switch (permission) {
        case 'granted':
            return 'granted';
        case 'denied':
            return 'denied';
        case 'default':
            return 'prompt';
        default:
            return 'prompt';
    }
}

export function useSystemPermissions() {
    const [permissions, setPermissions] = useState<Record<PermissionType, PermissionStatus>>({
        microphone: { state: 'prompt', isSupported: false },
        camera: { state: 'prompt', isSupported: false },
        location: { state: 'prompt', isSupported: false },
        notifications: { state: 'prompt', isSupported: false },
        storage: { state: 'prompt', isSupported: false }
    });

    const [loading, setLoading] = useState(true);

    // Check initial permissions
    useEffect(() => {
        const checkPermissions = async () => {
            const newPermissions = { ...permissions };

            // Microphone permission
            if (navigator.mediaDevices?.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    newPermissions.microphone = { state: 'granted', isSupported: true };
                } catch (err) {
                    newPermissions.microphone = {
                        state: err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'prompt',
                        isSupported: true
                    };
                }
            }

            // Camera permission
            if (navigator.mediaDevices?.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(track => track.stop());
                    newPermissions.camera = { state: 'granted', isSupported: true };
                } catch (err) {
                    newPermissions.camera = {
                        state: err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'prompt',
                        isSupported: true
                    };
                }
            }

            // Notifications permission
            if ('Notification' in window) {
                const notificationState = convertNotificationPermission(Notification.permission);
                newPermissions.notifications = {
                    state: notificationState,
                    isSupported: true
                };
            }

            // Location permission
            if ('permissions' in navigator) {
                try {
                    const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                    newPermissions.location = {
                        state: locationPermission.state as PermissionStatus['state'],
                        isSupported: true
                    };
                } catch {
                    newPermissions.location = { state: 'prompt', isSupported: false };
                }
            }

            // Storage permission (for web apps, this is typically available via other APIs)
            if ('storage' in navigator) {
                try {
                    await navigator.storage.estimate();
                    newPermissions.storage = { state: 'granted', isSupported: true };
                } catch {
                    newPermissions.storage = { state: 'prompt', isSupported: false };
                }
            }

            setPermissions(newPermissions);
            setLoading(false);
        };

        checkPermissions();
    }, []);

    // Request permission for a specific type
    const requestPermission = async (type: PermissionType): Promise<PermissionStatus> => {
        switch (type) {
            case 'microphone':
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    const newStatus = { state: 'granted', isSupported: true } as const;
                    setPermissions(prev => ({
                        ...prev,
                        microphone: newStatus
                    }));
                    return newStatus;
                } catch (err) {
                    const newStatus = {
                        state: err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'prompt',
                        isSupported: true
                    } as const;
                    setPermissions(prev => ({
                        ...prev,
                        microphone: newStatus
                    }));
                    toast({
                        title: 'Microphone Access',
                        description: 'Please grant microphone access in your browser settings.',
                        variant: 'destructive'
                    });
                    return newStatus;
                }

            case 'camera':
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(track => track.stop());
                    const newStatus = { state: 'granted', isSupported: true } as const;
                    setPermissions(prev => ({
                        ...prev,
                        camera: newStatus
                    }));
                    return newStatus;
                } catch (err) {
                    const newStatus = {
                        state: err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'prompt',
                        isSupported: true
                    } as const;
                    setPermissions(prev => ({
                        ...prev,
                        camera: newStatus
                    }));
                    toast({
                        title: 'Camera Access',
                        description: 'Please grant camera access in your browser settings.',
                        variant: 'destructive'
                    });
                    return newStatus;
                }

            case 'notifications':
                if (!('Notification' in window)) {
                    return { state: 'unsupported', isSupported: false };
                }
                const result = await Notification.requestPermission();
                const newStatus = {
                    state: convertNotificationPermission(result),
                    isSupported: true
                } as const;
                setPermissions(prev => ({
                    ...prev,
                    notifications: newStatus
                }));
                return newStatus;

            case 'location':
                return new Promise((resolve) => {
                    if (!('permissions' in navigator)) {
                        resolve({ state: 'unsupported', isSupported: false });
                        return;
                    }

                    // For web apps, we typically need to use the Geolocation API to prompt
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const newStatus = {
                                state: 'granted',
                                isSupported: true
                            } as const;
                            setPermissions(prev => ({
                                ...prev,
                                location: newStatus
                            }));
                            resolve(newStatus);
                        },
                        (error) => {
                            // Different error types for location permission
                            const newStatus = {
                                state: error.code === error.PERMISSION_DENIED ? 'denied' : 'prompt',
                                isSupported: true
                            } as const;
                            setPermissions(prev => ({
                                ...prev,
                                location: newStatus
                            }));

                            // Provide user guidance
                            if (error.code === error.PERMISSION_DENIED) {
                                toast({
                                    title: 'Location Access',
                                    description: 'Please grant location access in your browser settings.',
                                    variant: 'destructive'
                                });
                            }

                            resolve(newStatus);
                        },
                        {
                            // Provide timeout and high accuracy to trigger permission dialog
                            timeout: 10000,
                            enableHighAccuracy: true
                        }
                    );
                });

            case 'storage':
                // Web storage is typically always available
                return { state: 'granted', isSupported: true };

            default:
                throw new Error('Unsupported permission type');
        }
    };

    return {
        permissions,
        loading,
        requestPermission
    };
}