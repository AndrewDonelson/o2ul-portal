// file: /app/api/web-push/[...path]/route.ts
// feature: Web Push - API route handler

import { NextRequest, NextResponse } from 'next/server';
import webpush, { PushSubscription as WebPushSubscription } from 'web-push';

// Define the expected subscription type from the browser
interface BrowserPushSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
}

// Check if VAPID keys are present
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error('VAPID keys must be set in environment variables');
}

try {
    webpush.setVapidDetails(
        'mailto:mail@example.com', // Replace with your actual email
        vapidPublicKey,
        vapidPrivateKey
    );
} catch (error) {
    console.error('Failed to set VAPID details:', error);
    throw error;
}

// Store subscription
let subscription: WebPushSubscription | null = null;

export async function POST(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);

        switch (pathname) {
            case '/api/web-push/subscription': {
                const body = await request.json();
                if (!body.subscription) {
                    return NextResponse.json(
                        { error: 'No subscription data provided' },
                        { status: 400 }
                    );
                }

                // Type check the subscription data
                const browserSub = body.subscription as BrowserPushSubscription;
                if (!browserSub.endpoint || !browserSub.keys?.p256dh || !browserSub.keys?.auth) {
                    return NextResponse.json(
                        { error: 'Invalid subscription format' },
                        { status: 400 }
                    );
                }

                // Convert to WebPushSubscription type
                subscription = {
                    endpoint: browserSub.endpoint,
                    keys: {
                        p256dh: browserSub.keys.p256dh,
                        auth: browserSub.keys.auth,
                    }
                };

                return NextResponse.json({ message: 'Subscription set successfully' });
            }

            case '/api/web-push/send': {
                if (!subscription) {
                    return NextResponse.json(
                        { error: 'No active subscription' },
                        { status: 400 }
                    );
                }

                const body = await request.json();
                const payload = JSON.stringify(body);

                await webpush.sendNotification(subscription, payload);
                return NextResponse.json({ message: 'Push notification sent successfully' });
            }

            default:
                return NextResponse.json(
                    { error: 'Invalid endpoint' },
                    { status: 404 }
                );
        }
    } catch (error) {
        console.error('Push notification error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}