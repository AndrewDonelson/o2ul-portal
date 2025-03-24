// file: /convex/notifications/index.ts
// feature: Notifications - Convex functions for push notification management

import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Define subscription schema
export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: PushSubscriptionKeys;
}

/**
 * Store a new push notification subscription
 */
export const storeSubscription = mutation({
  args: {
    subscription: v.object({
      endpoint: v.string(),
      expirationTime: v.optional(v.union(v.number(), v.null())),
      keys: v.object({
        p256dh: v.string(),
        auth: v.string()
      })
    })
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: User not authenticated");
    }

    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", q => q.eq("endpoint", args.subscription.endpoint))
      .first();

    // If it exists but for a different user, update it
    if (existingSubscription && existingSubscription.userId !== userId) {
      await ctx.db.patch(existingSubscription._id, {
        userId,
        expirationTime: args.subscription.expirationTime ?? null,
        keys: args.subscription.keys,
        updatedAt: Date.now()
      });
      return existingSubscription._id;
    }
    
    // If it doesn't exist, create a new one
    if (!existingSubscription) {
      return await ctx.db.insert("pushSubscriptions", {
        userId,
        endpoint: args.subscription.endpoint,
        expirationTime: args.subscription.expirationTime ?? null,
        keys: args.subscription.keys,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    
    // Otherwise, just update the existing subscription
    return await ctx.db.patch(existingSubscription._id, {
      expirationTime: args.subscription.expirationTime ?? null,
      keys: args.subscription.keys,
      updatedAt: Date.now()
    });
  }
});

/**
 * Remove a push notification subscription
 */
export const removeSubscription = mutation({
  args: {
    endpoint: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: User not authenticated");
    }
    
    // Get the subscription
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", q => q.eq("endpoint", args.endpoint))
      .first();
    
    if (!subscription) {
      return false;
    }
    
    // Verify the user owns this subscription
    if (subscription.userId !== userId) {
      throw new Error("Unauthorized to remove this subscription");
    }
    
    // Delete the subscription
    await ctx.db.delete(subscription._id);
    return true;
  }
});

/**
 * Get all subscriptions for a user
 */
export const getUserSubscriptions = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();
  }
});

/**
 * Internal: Get all subscriptions for a user by ID
 */
export const getUserSubscriptionsById = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
  }
});

/**
 * Internal: Remove a subscription by ID
 */
export const removeSubscriptionById = mutation({
  args: {
    subscriptionId: v.id("pushSubscriptions")
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
    return true;
  }
});

/**
 * Create a notification to be sent
 * 
 * This mutation just stores the notification in the database
 * A separate Node.js runtime function will handle actual sending
 */
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    icon: v.optional(v.string()),
    tag: v.optional(v.string()),
    url: v.optional(v.string()),
    data: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    // Create a notification record that will be processed by a background job
    const notificationId = await ctx.db.insert("pendingNotifications", {
      userId: args.userId,
      title: args.title,
      body: args.body,
      icon: args.icon || '/images/app/foch-logo.png',
      tag: args.tag || 'notification',
      url: args.url || '/',
      data: args.data || {},
      status: 'pending',
      createdAt: Date.now(),
      processedAt: undefined,
      attempts: 0
    });
    
    // Trigger background job to process notifications
    await ctx.scheduler.runAfter(0, api.notifications.nodeHandler.processPendingNotifications, {});
    //await ctx.scheduler.runAfter(0, internal.notifications.nodeHandler.processPendingNotifications, {});    
    
    return { success: true, notificationId };
  }
});

/**
 * Delete a notification by ID
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("pendingNotifications")
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error(`Notification with ID ${args.notificationId} not found`);
    }
    
    await ctx.db.delete(args.notificationId);
    return true;
  }
});

/**
 * Send a notification for a new message
 */
export const sendMessageNotification = mutation({
  args: {
    recipientId: v.id("users"),
    senderId: v.id("users"),
    messageContent: v.string(),
    channelId: v.id("channels")
  },
  handler: async (ctx, args) => {
    // Get sender profile for notification
    const senderProfile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), args.senderId))
      .first();
    
    const senderName = senderProfile?.username || 'Someone';
    
    // Create a shorter preview of the message
    const messagePreview = args.messageContent.length > 50
      ? `${args.messageContent.substring(0, 50)}...`
      : args.messageContent;
    
    // Create notification
    return await ctx.db.insert("pendingNotifications", {
      userId: args.recipientId,
      title: `New message from ${senderName}`,
      body: messagePreview,
      icon: senderProfile?.image || '/images/app/message-icon.png',
      tag: `message-${args.channelId}`,
      url: `/contacts/messenger/${args.channelId}`,
      data: {
        type: 'message',
        senderId: args.senderId,
        channelId: args.channelId
      },
      status: 'pending',
      createdAt: Date.now(),
      processedAt: undefined,
      attempts: 0
    });
  }
});

/**
 * Update notification status
 * Public wrapper for the internal function
 */
export const updateNotificationStatus = mutation({
  args: {
    notificationId: v.id("pendingNotifications"),
    status: v.union(
      v.literal("pending"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("no_subscriptions")
    ),
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error(`Notification with ID ${args.notificationId} not found`);
    }
    
    return await ctx.db.patch(args.notificationId, {
      status: args.status,
      lastError: args.error,
      lastAttempt: Date.now(),
      attempts: (notification.attempts || 0) + 1
    });
  }
});

/**
 * Cleanup notifications with permanent failure status
 */
export const cleanupFailedNotifications = action({
  handler: async (ctx) => {
    // Find all notifications with permanent failure status
    const failedNotifications = await ctx.runQuery(
      api.notifications.index.getFailedNotificationIds,
      {}
    );

    let deletedCount = 0;
    for (const notificationId of failedNotifications) {
      await ctx.runMutation(api.notifications.index.deleteNotification, {
        notificationId
      });
      deletedCount++;
    }

    return { deletedCount };
  }
});

/**
 * Get IDs of notifications with permanent failure status
 */
export const getFailedNotificationIds = query({
  handler: async (ctx) => {
    const failedNotifications = await ctx.db
      .query("pendingNotifications")
      .filter(q => q.eq(q.field("status"), "permanent_failure"))
      .collect();

    return failedNotifications.map(n => n._id);
  }
});