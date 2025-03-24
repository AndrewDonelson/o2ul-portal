// file: /convex/auth/schema.files.ts
// feature: Auth - Files schema definitions

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const files = defineTable({
    userId: v.id("users"),
    name: v.string(),
    contentType: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    createdAt: v.number(),
    md5Hash: v.optional(v.string()),
  })
    .index("by_user_and_md5", ["userId", "md5Hash"])
    .index("by_user", ["userId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    });