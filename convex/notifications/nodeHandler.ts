// file: /convex/notifications/nodeHandler.ts
// feature: Notifications - Handler for notification processing

import { action, internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { debug, getHost } from "../../lib/utils";

type ProcessResult = { processed: number };
type NotificationStatus = "pending" | "delivered" | "failed" | "no_subscriptions" | "permanent_failure";

/**
 * Process pending notifications
 * This action handles fetching and processing pending notifications
 */
export const processPendingNotifications = action({
  handler: async (ctx): Promise<ProcessResult> => {
    debug("nodeHandler", "processPendingNotifications", { stage: "start" });
    
    // Get pending notifications
    const pendingNotifications = await ctx.runQuery(
      api.notifications.nodeHandler.getPendingNotifications, 
      { limit: 10 }
    );
    
    debug("nodeHandler", "processPendingNotifications", { 
      pendingNotificationsCount: pendingNotifications.length 
    });
    
    if (pendingNotifications.length === 0) {
      debug("nodeHandler", "processPendingNotifications", { stage: "no_notifications" });
      return { processed: 0 };
    }
    
    try {
      // Use absolute URL with domain for API endpoint
      //const apiUrl = process.env.CONVEX_SITE_URL || getHost();
      const apiUrl = "https://foch.me"; // getHost();
      debug("nodeHandler", "processPendingNotifications", { apiUrl });
      
      const response = await fetch(`${apiUrl}/api/notifications/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notifications: pendingNotifications }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        debug("nodeHandler", "processPendingNotifications", { 
          stage: "fetch_error", 
          status: response.status,
          errorText 
        });
        throw new Error(`Failed to process notifications: ${response.status} - ${errorText}`);
      }
      
      const result: ProcessResult = await response.json();
      
      debug("nodeHandler", "processPendingNotifications", { 
        stage: "processed", 
        processedCount: result.processed 
      });
      
      // If we processed anything and there might be more, schedule another run
      if (result.processed > 0 && pendingNotifications.length === 10) {
        debug("nodeHandler", "processPendingNotifications", { stage: "scheduling_next_run" });
        await ctx.scheduler.runAfter(1000, api.notifications.nodeHandler.processPendingNotifications, {});
      }
      
      return result;
    } catch (error) {
      debug("nodeHandler", "processPendingNotifications", { 
        stage: "error", 
        errorMessage: error instanceof Error ? error.message : "Unknown error" 
      });
      
      // Mark notifications as failed but ensure we increment attempts properly
      for (const notification of pendingNotifications) {
        await ctx.runMutation(internal.notifications.nodeHandler.updateNotificationAttempt, {
          notificationId: notification._id,
          status: "failed",
          error: error instanceof Error ? error.message : "Failed to process notification"
        });
      }
      
      // Schedule retry for failed notifications after a delay (exponential backoff)
      await ctx.scheduler.runAfter(5000, api.notifications.nodeHandler.retryFailedNotifications, {});
      
      return { processed: 0 };
    }
  }
});

/**
 * Get pending notifications
 */
export const getPendingNotifications = query({
  args: {
    limit: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingNotifications")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("attempts"), 5) // Increase max attempts to 5
        )
      )
      .order("asc")
      .take(args.limit);
  }
});

/**
 * Get failed notifications for retry
 */
export const getFailedNotifications = query({
  args: {
    limit: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingNotifications")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "failed"),
          q.lt(q.field("attempts"), 5) // Increase max attempts to 5
        )
      )
      .order("asc")
      .take(args.limit);
  }
});

/**
 * Retry failed notifications
 */
export const retryFailedNotifications = action({
  handler: async (ctx): Promise<{ retried: number }> => {
    debug("nodeHandler", "retryFailedNotifications", { stage: "start" });
    
    // Get failed notifications
    const failedNotifications = await ctx.runQuery(
      api.notifications.nodeHandler.getFailedNotifications,
      { limit: 20 }
    );
    
    debug("nodeHandler", "retryFailedNotifications", { 
      failedNotificationsCount: failedNotifications.length 
    });
    
    if (failedNotifications.length === 0) {
      debug("nodeHandler", "retryFailedNotifications", { stage: "no_failed_notifications" });
      return { retried: 0 };
    }
    
    // Update status to pending for retry
    let retried = 0;
    for (const notification of failedNotifications) {
      await ctx.runMutation(internal.notifications.nodeHandler.resetNotificationStatus, {
        notificationId: notification._id
      });
      retried++;
    }
    
    debug("nodeHandler", "retryFailedNotifications", { 
      stage: "retry_complete", 
      retriedCount: retried 
    });
    
    // Trigger processing with a delay based on retry count
    if (retried > 0) {
      debug("nodeHandler", "retryFailedNotifications", { stage: "scheduling_processing" });
      await ctx.scheduler.runAfter(1000, api.notifications.nodeHandler.processPendingNotifications, {});
    }
    
    return { retried };
  }
});

/**
 * Reset a notification status for retry
 */
export const resetNotificationStatus = internalMutation({
  args: {
    notificationId: v.id("pendingNotifications")
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) return;
    
    await ctx.db.patch(args.notificationId, {
      status: "pending",
      lastAttempt: Date.now()
    });
  }
});

/**
 * Update notification attempt
 */
export const updateNotificationAttempt = internalMutation({
  args: {
    notificationId: v.id("pendingNotifications"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("no_subscriptions"),
      v.literal("permanent_failure")
    )),
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    debug("nodeHandler", "updateNotificationAttempt", { 
      notificationId: args.notificationId,
      requestedStatus: args.status 
    });
    
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      debug("nodeHandler", "updateNotificationAttempt", { stage: "notification_not_found" });
      return;
    }
    
    // Calculate attempts and retry delay
    const attempts = (notification.attempts || 0) + 1;
    const retryDelay = Math.min(Math.pow(2, attempts) * 1000, 30000);
    
    debug("nodeHandler", "updateNotificationAttempt", { 
      attempts, 
      retryDelay 
    });
    
    const updateData: any = {
      attempts,
      lastError: args.error,
      status: args.status || "failed",
      lastAttempt: Date.now(),
      processedAt: args.status === "delivered" ? Date.now() : notification.processedAt
    };
    
    await ctx.db.patch(args.notificationId, updateData);
    
    // Check for retry or permanent failure
    if (args.status === "failed" && attempts < 5) {
      debug("nodeHandler", "updateNotificationAttempt", { 
        stage: "scheduling_retry", 
        attempts 
      });
      await ctx.scheduler.runAfter(retryDelay, api.notifications.nodeHandler.retryFailedNotifications, {});
    } else if (attempts >= 5) {
      debug("nodeHandler", "updateNotificationAttempt", { stage: "max_attempts_reached" });
      await ctx.db.patch(args.notificationId, {
        status: "permanent_failure",
        lastError: "Max retry attempts reached"
      });
    }
  }
});