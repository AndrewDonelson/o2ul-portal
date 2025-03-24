/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin_users from "../admin/users.js";
import type * as auth_providers from "../auth/providers.js";
import type * as auth_syncProfile from "../auth/syncProfile.js";
import type * as auth_types from "../auth/types.js";
import type * as auth from "../auth.js";
import type * as files from "../files.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as notifications_index from "../notifications/index.js";
import type * as notifications_nodeHandler from "../notifications/nodeHandler.js";
import type * as preferences_functions from "../preferences/functions.js";
import type * as preferences_types from "../preferences/types.js";
import type * as presence from "../presence.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "admin/users": typeof admin_users;
  "auth/providers": typeof auth_providers;
  "auth/syncProfile": typeof auth_syncProfile;
  "auth/types": typeof auth_types;
  auth: typeof auth;
  files: typeof files;
  health: typeof health;
  http: typeof http;
  init: typeof init;
  "notifications/index": typeof notifications_index;
  "notifications/nodeHandler": typeof notifications_nodeHandler;
  "preferences/functions": typeof preferences_functions;
  "preferences/types": typeof preferences_types;
  presence: typeof presence;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
