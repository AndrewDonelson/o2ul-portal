// file: /convex/preferences/schema.ts
// feature: Core - App preferences schema

import { defineTable } from "convex/server";
import { v } from "convex/values";
import { APP_MODES } from "./types";

export const preferences = defineTable({
  mode: v.union(...Object.values(APP_MODES).map(v.literal)),
  enableCalling: v.optional(v.boolean()),
  enabledOAuthProviders: v.optional(v.array(v.string())),
  lastUpdated: v.number(),
  updatedBy: v.id("users"),
})
  .index("by_mode", ["mode"])
  .index("by_lastUpdated", ["lastUpdated"]);