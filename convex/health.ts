// file: /convex/health.ts
// feature: System - Health monitoring and latency tracking

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Schema for storing health check data
interface HealthData {
  timestamp: number;
  status: "up" | "down";
  latency: number;
  region: string;
  endpoint: string;
}

// Record a ping from a client - using proper RTT (Round Trip Time)
export const recordPing = mutation({
  args: {
    clientTimestamp: v.number(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Don't require authentication for health checks
    // This prevents auth-related failures from affecting system monitoring

    const serverTimestamp = Date.now();

    // Return immediately with server timestamp to calculate RTT on client
    return {
      serverTimestamp,
      clientTimestamp: args.clientTimestamp,
      region: args.region || "unknown"
    };
  },
});

// Submit the completed RTT measurement
export const recordRTT = mutation({
  args: {
    rtt: v.number(),
    serverTimestamp: v.number(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Don't require authentication for health checks
    // This allows anonymous health monitoring
    let userId;

    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      // If auth fails, continue with anonymous health data
      userId = "anonymous";
    }

    // Store RTT measurement in cache with appropriate key
    const cacheKey = userId ? `ping:${userId}` : "ping:anonymous";

    try {
      const healthData: HealthData = {
        timestamp: Date.now(),
        status: "up",
        latency: args.rtt,
        region: args.region || "unknown",
        endpoint: "api"
      };

      const existingPing = await ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", cacheKey))
        .first();

      if (existingPing) {
        await ctx.db.patch(existingPing._id, {
          value: healthData,
          expiresAt: Date.now() + 120000 // 2 minute TTL
        });
      } else {
        await ctx.db.insert("cache", {
          key: cacheKey,
          value: healthData,
          expiresAt: Date.now() + 120000 // 2 minute TTL
        });
      }

      return {
        latency: args.rtt,
        timestamp: args.serverTimestamp
      };
    } catch (error) {
      // Return gracefully instead of failing if DB operations have issues
      // This prevents cascading errors from health check failures
      console.error("Health check recording error:", error);
      return {
        latency: args.rtt,
        timestamp: args.serverTimestamp,
        error: "Failed to record health data"
      };
    }
  },
});

// Get the latest health data for the current user
export const getUserHealth = query({
  handler: async (ctx) => {
    let userId;

    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return null;
    }

    if (!userId) return null;

    const healthRecord = await ctx.db
      .query("cache")
      .withIndex("by_key", q => q.eq("key", `ping:${userId}`))
      .first();

    if (!healthRecord) {
      return null;
    }

    return healthRecord.value as HealthData;
  },
});

// Get global health stats - using a more efficient approach
export const getGlobalHealth = query({
  handler: async (ctx) => {
    const now = Date.now();

    // Instead of querying all ping records, use the system:health record
    // which is updated by the cron job
    const systemHealth = await ctx.db
      .query("cache")
      .withIndex("by_key", q => q.eq("key", "system:health"))
      .first();

    if (!systemHealth || systemHealth.expiresAt < now) {
      return {
        activeUsers: 0,
        averageLatency: 0,
        status: "unknown",
        sampleSize: 0,
        limited: true
      };
    }

    // Return the pre-calculated health status
    return systemHealth.value;
  },
});

// Helper function for calculating system health
// This avoids the direct function call issue
async function calculateSystemHealth(ctx: any) {
  const timestamp = Date.now();

  try {
    // Get a very limited sample of recent pings to avoid read limits
    // Using prefetch with top-level key to avoid scanning entire table
    const recentPings = await ctx.db
      .query("cache")
      .withIndex("by_key", (q: any) =>
        q.gte("key", "ping:").lt("key", "ping;")
      )
      .filter((q: any) => q.gt(q.field("expiresAt"), timestamp - 60000)) // Only last minute
      .take(50); // Small sample size to avoid read limits

    // Calculate average latency if we have pings
    let avgLatency = 0;
    if (recentPings.length > 0) {
      const totalLatency = recentPings.reduce((sum: number, record: any) => {
        const data = record.value as HealthData;
        return sum + (data.latency || 0);
      }, 0);
      avgLatency = Math.round(totalLatency / recentPings.length);
    }

    return {
      timestamp,
      status: "up",
      latency: avgLatency,
      region: "server",
      endpoint: "system",
      activeUsers: recentPings.length,
      averageLatency: avgLatency,
      sampleSize: recentPings.length,
      limited: recentPings.length >= 50
    };
  } catch (error) {
    console.error("Error calculating system health:", error);

    // Return a fallback status on error
    return {
      timestamp,
      status: "error",
      latency: 0,
      region: "server",
      endpoint: "system",
      activeUsers: 0,
      averageLatency: 0,
      sampleSize: 0,
      limited: true,
      error: "Failed to calculate system health"
    };
  }
}

// Update system health status (for cron job)
export const updateSystemHealth = internalMutation({
  handler: async (ctx) => {
    // Use the helper function instead of directly calling another Convex function
    const systemStatus = await calculateSystemHealth(ctx);

    try {
      const existingStatus = await ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", "system:health"))
        .first();

      if (existingStatus) {
        await ctx.db.patch(existingStatus._id, {
          value: systemStatus,
          expiresAt: Date.now() + 120000 // 2 minute TTL
        });
      } else {
        await ctx.db.insert("cache", {
          key: "system:health",
          value: systemStatus,
          expiresAt: Date.now() + 120000 // 2 minute TTL
        });
      }

      return systemStatus;
    } catch (error) {
      console.error("Error storing system health:", error);
      return systemStatus;
    }
  }
});