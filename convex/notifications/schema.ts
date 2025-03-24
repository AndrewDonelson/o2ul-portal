// file: /convex/notifications/schema.ts
// feature: Notifications - Schema for push notification tables

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const pushSubscriptions = defineTable({
  // User who owns this subscription
  userId: v.id("users"),
  
  // Push subscription details
  endpoint: v.string(),
  expirationTime: v.union(v.number(), v.null()),
  keys: v.object({
    p256dh: v.string(),
    auth: v.string()
  }),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_endpoint", ["endpoint"]);

export const pendingNotifications = defineTable({
  // Target user
  userId: v.id("users"),
  
  // Notification content
  title: v.string(),
  body: v.string(),
  icon: v.optional(v.string()),
  tag: v.optional(v.string()),
  url: v.optional(v.string()),
  data: v.optional(v.any()),
  
  // Status tracking
  status: v.union(
    v.literal("pending"),
    v.literal("delivered"),
    v.literal("failed"),
    v.literal("no_subscriptions"),
    v.literal("permanent_failure")
  ),
  
  // Timestamps
  createdAt: v.number(),
  processedAt: v.optional(v.number()),
  
  // Error handling
  attempts: v.number(),
  lastAttempt: v.optional(v.number()),
  lastError: v.optional(v.string()),
  
  // Results
  results: v.optional(v.object({
    successCount: v.number(),
    failedCount: v.number(),
    expiredCount: v.number()
  })),
  
  // Priority (for calls, etc.)
  priority: v.optional(v.union(
    v.literal("normal"),
    v.literal("high")
  )),
})
  .index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_created", ["createdAt"])
  .index("by_status_attempts", ["status", "attempts"]);