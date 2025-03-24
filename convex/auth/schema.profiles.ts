// file: /convex/auth/schema.profiles.ts
// feature: Auth - User profile schema definitions

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userProfiles = defineTable({
  // Link to auth user
  userId: v.id("users"),
  
  // Basic Info
  username: v.optional(v.string()),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  bio: v.optional(v.string()), // 300 characters max
  
  // Status & Activity
  isAnonymous: v.optional(v.boolean()),
  isOnline: v.optional(v.boolean()),
  lastSeen: v.optional(v.number()),
  lastLoginDate: v.optional(v.number()),
  
  // User Access Levels
  isBetaTester: v.optional(v.boolean()),
  betaTesterSince: v.optional(v.number()),
  
  // User Images
  image: v.optional(v.string()), // user avatar
  bgImageUrl: v.optional(v.string()), // user profile background image
  bgImageStorageId: v.optional(v.union(v.string(), v.id("_storage"))),
  bgImageOpacity: v.optional(v.number()),
  framebgImageUrl: v.optional(v.string()), // user avatar frame image (premium feature)
  frameImageStorageId: v.optional(v.union(v.string(), v.id("_storage"))),
  
  // Premium Features
  credits: v.optional(v.number()),
  
  // Preferences
  isHookupEnabled: v.optional(v.boolean()), // Enable hookup system

  // Verifications & Security
  emailVerificationTime: v.optional(v.number()),
  phoneVerificationTime: v.optional(v.number()),
  isBanned: v.optional(v.boolean()),
  banReason: v.optional(v.string()),
  banExpiresAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_username", ["username"])
  .index("by_email", ["email"])
  .index("by_phone", ["phone"])
  .index("by_online", ["isOnline"])
  .index("by_banned", ["isBanned"])
  .index("by_beta", ["isBetaTester"])
  .index("by_last_seen", ["lastSeen"]);