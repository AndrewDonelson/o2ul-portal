// file: /convex/schema.ts
// feature: Convex - Database schema definitions

import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { userProfiles } from "./auth/schema.profiles";
import { files } from "./auth/schema.files";
import { admins } from "./auth/schema.admins";
import { preferences } from "./preferences/schema";
import { pendingNotifications, pushSubscriptions } from "./notifications/schema";
import { v } from "convex/values";

export default defineSchema({
  /***[Feature: Core (Auth/Profiles)]***/
  ...authTables,
  admins,
  userProfiles,
  files,
  preferences,
  pushSubscriptions,
  pendingNotifications,  
  /***[Feature: Core (Application Cache)]***/
  cache: defineTable({
    key: v.string(),
    value: v.any(),
    expiresAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expiry", ["expiresAt"]),   
});