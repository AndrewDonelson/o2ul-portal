// file: /convex/presence.ts
// feature: Chat - User presence and status tracking

import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export type StatusType = 'online' | 'offline' | 'away';

// Define snapshot type for consistent usage
interface TimeSnapshot {
  timestamp: number;
  count: number;
}

// Constants
const PRESENCE_TIMEOUT = 1000 * 60; // 1 minute
const MAX_CHANNEL_PRESENCES = 32;
const BATCH_INTERVAL = 1000; // 1 second batching window

export const getPresence = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user's profile for online status
    const profile = await ctx.db
      .query("userProfiles")
      .filter(q => q.eq(q.field("userId"), userId))
      .first();

    // Get the most recent presence status from memberships
    const latestPresenceStatus = "offline";

    return {
      userId,
      isOnline: profile?.isOnline ?? false,
      lastSeen: profile?.lastSeen,
      presenceStatus: latestPresenceStatus,
      lastActive: profile?.lastSeen || Date.now()
    };
  },
});

// Update presence for active channels only
export const updatePresence = mutation({
    args: {
        status: v.union(
            v.literal("online"),
            v.literal("away"),
            v.literal("offline")
        ),
        channelId: v.optional(v.id("channels")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const now = Date.now();
        const batchedTime = Math.floor(now / BATCH_INTERVAL) * BATCH_INTERVAL;

        // Get last update time
        const lastUpdate = await ctx.db
            .query("userProfiles")
            .filter(q => q.eq(q.field("userId"), userId))
            .first();

        // Skip update if too recent
        if (lastUpdate?.lastSeen && lastUpdate.lastSeen > batchedTime - BATCH_INTERVAL) {
            return;
        }

        // Update user profile
        const userProfile = await ctx.db
            .query("userProfiles")
            .filter(q => q.eq(q.field("userId"), userId))
            .first();

        if (userProfile) {
            await ctx.db.patch(userProfile._id, {
                isOnline: args.status === "online",
                lastSeen: now
            });
        }

        // If channelId is provided, update only that channel
        // if (args.channelId) {
        //     const membership = await ctx.db
        //         .query("channelMembers")
        //         .filter(q =>
        //             q.and(
        //                 q.eq(q.field("channelId"), args.channelId),
        //                 q.eq(q.field("userId"), userId)
        //             )
        //         )
        //         .first();

        //     if (membership) {
        //         await ctx.db.patch(membership._id, {
        //             presenceStatus: args.status,
        //             lastActive: now,
        //             lastSeen: now
        //         });
        //     }
        // } else {
        //     // Update all channel memberships if no specific channel
        //     const memberships = await ctx.db
        //         .query("channelMembers")
        //         .withIndex("by_user", q => q.eq("userId", userId))
        //         .collect();

        //     await Promise.all(
        //         memberships.map(membership =>
        //             ctx.db.patch(membership._id, {
        //                 presenceStatus: args.status,
        //                 lastActive: now,
        //                 lastSeen: now
        //             })
        //         )
        //     );
        // }

        // If going offline, ensure all statuses are updated
        if (args.status === "offline") {
            await ctx.db.patch(userProfile!._id, {
                isOnline: false,
                lastSeen: now
            });
        }
    }
});

// Handle user going offline
export const setOffline = mutation({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return;

        const now = Date.now();

        // Update all memberships
        // const memberships = await ctx.db
        //     .query("channelMembers")
        //     .withIndex("by_user", q => q.eq("userId", userId))
        //     .collect();

        // await Promise.all(
        //     memberships.map(membership =>
        //         ctx.db.patch(membership._id, {
        //             presenceStatus: "offline",
        //             lastSeen: now
        //         })
        //     )
        // );

        // Update user profile
        const userProfile = await ctx.db
            .query("userProfiles")
            .filter(q => q.eq(q.field("userId"), userId))
            .first();

        if (userProfile) {
            await ctx.db.patch(userProfile._id, {
                isOnline: false,
                lastSeen: now
            });
        }
    }
});

// Cleanup expired presences
export const cleanupInactiveUsers = internalMutation({
  handler: async (ctx) => {
      const now = Date.now();
      const presenceTimeout = now - PRESENCE_TIMEOUT;

      // Find inactive users
      const inactiveUsers = await ctx.db
          .query("userProfiles")
          .withIndex("by_last_seen")
          .filter(q =>
              q.and(
                  q.lt(q.field("lastSeen"), presenceTimeout),
                  q.eq(q.field("isOnline"), true)
              )
          )
          .collect();

      // Batch update inactive users
      const updates = inactiveUsers.map(user => ({
          id: user._id,
          updates: {
              isOnline: false,
              // Preserve their last seen timestamp
              lastSeen: user.lastSeen
          }
      }));

      // Process updates in batches
      for (const batch of chunks(updates, 50)) {
          await Promise.all(
              batch.map(update =>
                  ctx.db.patch(update.id, update.updates)
              )
          );
      }
  }
});

// Calculate status dynamically if not provided
export const calculateStatus = (lastSeen?: number): StatusType => {
    if (!lastSeen) return 'offline';

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const tenMinutesAgo = now - 600000;

    if (lastSeen > oneMinuteAgo) return 'online';
    if (lastSeen > tenMinutesAgo) return 'away';

    return 'offline';
};

// Utility function to chunk array for batch processing
function chunks<T>(arr: T[], size: number): T[][] {
    return Array.from(
        { length: Math.ceil(arr.length / size) },
        (_, i) => arr.slice(i * size, i * size + size)
    );
}

// ----------------------
// CCU Tracking Functions
// ----------------------

// CCU Interval constants
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const THIRTY_DAYS = 30 * ONE_DAY;

// Cache keys for CCU metrics
const CCU_CACHE_KEYS = {
  CURRENT: "ccu_current",
  LAST_24_HOURS: "ccu_24hrs",
  LAST_30_DAYS: "ccu_30days",
  MONTHLY_AVG: "ccu_monthly_avg",
  DAILY_SNAPSHOTS: "ccu_daily_snapshots",
  HOURLY_SNAPSHOTS: "ccu_hourly_snapshots"
};

// Update CCU metrics - runs every 30 seconds via cron
export const updateCCUMetrics = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Calculate time thresholds
    const oneMinuteAgo = now - ONE_MINUTE;
    const twentyFourHoursAgo = now - ONE_DAY;
    const thirtyDaysAgo = now - THIRTY_DAYS;

    // Get active users for different time periods
    const [currentUsers, users24h, users30d] = await Promise.all([
      // Current CCU (last minute)
      ctx.db
        .query("userProfiles")
        .filter(q => 
          q.and(
            q.eq(q.field("isOnline"), true),
            q.gt(q.field("lastSeen"), oneMinuteAgo)
          )
        )
        .collect(),
      
      // Last 24 hours
      ctx.db
        .query("userProfiles")
        .filter(q => q.gt(q.field("lastSeen"), twentyFourHoursAgo))
        .collect(),
      
      // Last 30 days
      ctx.db
        .query("userProfiles")
        .filter(q => q.gt(q.field("lastSeen"), thirtyDaysAgo))
        .collect()
    ]);

    // Current count of active users
    const ccuCurrent = currentUsers.length;
    
    // Unique users in last 24 hours
    const ccu24h = users24h.length;
    
    // Unique users in last 30 days
    const ccu30d = users30d.length;

    // Get previous snapshots for calculating average
    const hourlySnapshots = await ctx.db
      .query("cache")
      .withIndex("by_key", q => q.eq("key", CCU_CACHE_KEYS.HOURLY_SNAPSHOTS))
      .first();

    // Init snapshots array
    let snapshotsArray: TimeSnapshot[] = hourlySnapshots?.value?.snapshots || [];
    
    // Add current snapshot
    snapshotsArray.push({
      timestamp: now,
      count: ccuCurrent
    });
    
    // Keep only last 30 days of hourly snapshots (720 entries max)
    snapshotsArray = snapshotsArray
      .filter((snap: TimeSnapshot) => snap.timestamp > thirtyDaysAgo)
      .slice(-720);
    
    // Calculate average CCU from snapshots
    const ccuAvg = snapshotsArray.length > 0
      ? Math.round(snapshotsArray.reduce((sum, snap: TimeSnapshot) => sum + snap.count, 0) / snapshotsArray.length)
      : 0;

    // Update cache entries
    await Promise.all([
      // Current CCU
      upsertCacheEntry(ctx, CCU_CACHE_KEYS.CURRENT, ccuCurrent, ONE_MINUTE),
      
      // 24h CCU
      upsertCacheEntry(ctx, CCU_CACHE_KEYS.LAST_24_HOURS, ccu24h, ONE_MINUTE),
      
      // 30d CCU
      upsertCacheEntry(ctx, CCU_CACHE_KEYS.LAST_30_DAYS, ccu30d, 5 * ONE_MINUTE),
      
      // Monthly average CCU
      upsertCacheEntry(ctx, CCU_CACHE_KEYS.MONTHLY_AVG, ccuAvg, 5 * ONE_MINUTE),
      
      // Hourly snapshots for trend calculation
      upsertCacheEntry(
        ctx, 
        CCU_CACHE_KEYS.HOURLY_SNAPSHOTS, 
        { snapshots: snapshotsArray }, 
        THIRTY_DAYS
      ),
      
      // Store daily snapshot at midnight
      storeDailySnapshot(ctx, now, ccuCurrent)
    ]);
    
    return {
      ccuCurrent,
      ccu24h,
      ccu30d,
      ccuAvg
    };
  }
});

// Get CCU metrics
export const getCCUMetrics = query({
  handler: async (ctx) => {
    // Check for admin rights
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const isAdmin = !!(await ctx.db
      .query("admins")
      .withIndex("by_userId")
      .filter(q => q.eq(q.field("userId"), userId))
      .first());
      
    if (!isAdmin) {
      throw new Error("Not authorized");
    }
    
    // Get metrics from cache
    const [current, last24h, last30d, monthlyAvg, dailySnapshots, hourlySnapshots] = await Promise.all([
      ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", CCU_CACHE_KEYS.CURRENT))
        .first(),
      ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", CCU_CACHE_KEYS.LAST_24_HOURS))
        .first(),
      ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", CCU_CACHE_KEYS.LAST_30_DAYS))
        .first(),
      ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", CCU_CACHE_KEYS.MONTHLY_AVG))
        .first(),
      ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", CCU_CACHE_KEYS.DAILY_SNAPSHOTS))
        .first(),
      ctx.db
        .query("cache")
        .withIndex("by_key", q => q.eq("key", CCU_CACHE_KEYS.HOURLY_SNAPSHOTS))
        .first()
    ]);
    
    // Format daily snapshots for charts (last 30 days)
    const now = Date.now();
    const dailyChartData = formatSnapshotsForChart(
      dailySnapshots?.value?.snapshots || [],
      now - THIRTY_DAYS,
      now,
      ONE_DAY,
      (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    );
    
    // Format hourly snapshots for charts (last 24 hours)
    const hourlyChartData = formatSnapshotsForChart(
      hourlySnapshots?.value?.snapshots || [],
      now - ONE_DAY,
      now,
      ONE_HOUR,
      (timestamp) => {
        const date = new Date(timestamp);
        return `${date.getHours()}:00`;
      }
    );
    
    return {
      current: current?.value || 0,
      last24h: last24h?.value || 0,
      last30d: last30d?.value || 0,
      monthlyAvg: monthlyAvg?.value || 0,
      dailyChartData,
      hourlyChartData,
      lastUpdated: Math.max(
        current?._creationTime || 0,
        current?.expiresAt ? current.expiresAt - ONE_MINUTE : 0
      )
    };
  }
});

// Helper function to upsert cache entry
async function upsertCacheEntry(ctx: any, key: string, value: any, ttlMs: number) {
  const existing = await ctx.db
    .query("cache")
    .withIndex("by_key", (q: { eq: (arg0: string, arg1: string) => any; }) => q.eq("key", key))
    .first();
    
  const expiresAt = Date.now() + ttlMs;
  
  if (existing) {
    return await ctx.db.patch(existing._id, {
      value,
      expiresAt
    });
  } else {
    return await ctx.db.insert("cache", {
      key,
      value,
      expiresAt
    });
  }
}

// Helper to store daily snapshot at midnight
async function storeDailySnapshot(ctx: any, now: number, currentCCU: number) {
  // Only store once per day (close to midnight)
  const date = new Date(now);
  const isNearMidnight = date.getHours() === 0 && date.getMinutes() < 5;
  
  if (!isNearMidnight) {
    return;
  }
  
  // Get existing daily snapshots
  const dailySnapshots = await ctx.db
    .query("cache")
    .withIndex("by_key", (q: { eq: (arg0: string, arg1: string) => any; }) => q.eq("key", CCU_CACHE_KEYS.DAILY_SNAPSHOTS))
    .first();
    
  // Current snapshots or empty array
  let snapshotsArray: TimeSnapshot[] = dailySnapshots?.value?.snapshots || [];
  
  // Get yesterday's date (since we're at midnight)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  // Add snapshot
  snapshotsArray.push({
    timestamp: yesterday.getTime(),
    count: currentCCU
  });
  
  // Keep only last 90 days
  const ninetyDaysAgo = now - (90 * ONE_DAY);
  snapshotsArray = snapshotsArray
    .filter((snap: TimeSnapshot) => snap.timestamp > ninetyDaysAgo)
    .slice(-90);
    
  // Update cache
  return await upsertCacheEntry(
    ctx,
    CCU_CACHE_KEYS.DAILY_SNAPSHOTS,
    { snapshots: snapshotsArray },
    90 * ONE_DAY
  );
}

// Helper to format snapshots for chart display
function formatSnapshotsForChart(
  snapshots: TimeSnapshot[],
  startTime: number,
  endTime: number,
  interval: number,
  labelFormatter: (timestamp: number) => string
) {
  if (snapshots.length === 0) {
    return [];
  }
  
  // Sort snapshots by timestamp
  const sortedSnapshots = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  
  // Filter to relevant time range
  const filteredSnapshots = sortedSnapshots.filter(
    (snap: TimeSnapshot) => snap.timestamp >= startTime && snap.timestamp <= endTime
  );
  
  // Group by intervals
  const groupedData: Record<string, number[]> = {};
  
  filteredSnapshots.forEach((snap: TimeSnapshot) => {
    const intervalStart = Math.floor(snap.timestamp / interval) * interval;
    const label = labelFormatter(intervalStart);
    
    if (!groupedData[label]) {
      groupedData[label] = [];
    }
    
    groupedData[label].push(snap.count);
  });
  
  // Average the counts in each interval
  return Object.entries(groupedData).map(([label, counts]) => ({
    label,
    value: Math.round(counts.reduce((sum, count) => sum + count, 0) / counts.length)
  }));
}