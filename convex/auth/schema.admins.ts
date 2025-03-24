// file: /convex/auth/schema.admins.ts
// feature: Auth - Enhanced Admin Role Management

import { defineTable } from "convex/server";
import { v } from "convex/values";
import { AdminPermission, AdminRole } from "./types";

export const admins = defineTable({
  userId: v.id("users"),
  role: v.optional(v.union(...Object.values(AdminRole).map(v.literal))),
  customPermissions: v.optional(v.array(v.union(...Object.values(AdminPermission).map(v.literal)))),
  assignedBy: v.optional(v.id("users")),
  assignedAt: v.optional(v.number()),
})
  .index("by_userId", ["userId"])
  .index("by_role", ["role"]);