# O2UL Portal Dry Run Skill Validation

This is a dry run only. No migration code was generated or applied.

## Goal

Validate that the `nextjs-convex-conversion` skill can produce a complete migration-ready plan from a real target project.

Target project:

- /home/andrew/Development/Fullstack-Projects/o2ul/o2ul-portal

## Evidence Collected

Scanned Convex schema and function sources:

1. convex/schema.ts
2. convex/auth/schema.profiles.ts
3. convex/auth/schema.admins.ts
4. convex/auth/schema.files.ts
5. convex/preferences/schema.ts
6. convex/users/queries.ts
7. convex/users/mutations.ts
8. convex/preferences/functions.ts
9. convex/auth/syncProfile.ts

Detected exported functions for Slice 1 candidate areas:

1. users queries: viewer, get, getCurrentUser, list, plus related role and search queries
2. users mutations: initUser, updateProfile, deletePlatformData, updateBackgroundImage
3. preferences: get, updateMode, updateCallingState, updateOAuthProviders, getUsersByMode, isOAuthProviderEnabled
4. auth sync: syncProfile

## Skill Outcome Validation

Required outcome from skill: schema conversion plan.

- Status: PASS
- Evidence: O2UL models and indexes identified (profiles, admins, files, preferences, cache)

Required outcome from skill: L1/L2/L3 decision per model.

- Status: PASS
- Evidence: layer decisions included below for first conversion set

Required outcome from skill: API parity map.

- Status: PASS
- Evidence: function-by-function parity map for Slice 1 included below

Required outcome from skill: separate packages and interfaces.

- Status: PASS
- Evidence: package/interface blueprint included below

Required outcome from skill: staged cutover and rollback points.

- Status: PASS
- Evidence: staged dry-run rollout sequence included below

## Slice 1 Dry Run Conversion Matrix

Scope for first implementation wave (not yet executed):

1. users profile and identity endpoints
2. preferences get and update endpoints
3. auth profile synchronization entrypoint

### Users queries

- Convex `viewer` query -> GET /api/v1/o2ul/users/viewer -> `O2ULUsersService.Viewer(ctx, callerID)`
- Convex `get` query -> GET /api/v1/o2ul/users/{id} -> `O2ULUsersService.GetPublic(ctx, id)`
- Convex `getCurrentUser` query -> GET /api/v1/o2ul/users/current -> `O2ULUsersService.GetCurrent(ctx, callerID)`
- Convex `list` query -> GET /api/v1/o2ul/users?page=&page_size= -> `O2ULUsersService.List(ctx, page, pageSize)`
- Convex `getUserProfiles` query -> POST /api/v1/o2ul/users/profiles:batch-get -> `O2ULUsersService.BatchProfiles(ctx, ids)`

### Users mutations

- Convex `initUser` mutation -> POST /api/v1/o2ul/users/init -> `O2ULUsersService.InitUser(ctx, input)`
- Convex `updateProfile` mutation -> PATCH /api/v1/o2ul/users/profile -> `O2ULUsersService.UpdateProfile(ctx, input)`
- Convex `updateBackgroundImage` mutation -> PATCH /api/v1/o2ul/users/profile/background -> `O2ULUsersService.UpdateBackground(ctx, input)`
- Convex `deletePlatformData` mutation -> DELETE /api/v1/o2ul/users/platform/{platform} -> `O2ULUsersService.DeletePlatformData(ctx, platform)`

### Preferences

- Convex `get` query -> GET /api/v1/o2ul/preferences -> `O2ULPreferencesService.Get(ctx)`
- Convex `updateMode` mutation -> PATCH /api/v1/o2ul/preferences/mode -> `O2ULPreferencesService.UpdateMode(ctx, input)`
- Convex `updateCallingState` mutation -> PATCH /api/v1/o2ul/preferences/calling -> `O2ULPreferencesService.UpdateCallingState(ctx, input)`
- Convex `updateOAuthProviders` mutation -> PATCH /api/v1/o2ul/preferences/oauth-providers -> `O2ULPreferencesService.UpdateOAuthProviders(ctx, input)`
- Convex `isOAuthProviderEnabled` query -> GET /api/v1/o2ul/preferences/oauth-providers/{provider}/enabled -> `O2ULPreferencesService.IsOAuthProviderEnabled(ctx, provider)`

### Auth profile sync

- Convex `syncProfile` mutation -> POST /api/v1/o2ul/auth/sync-profile -> `O2ULAuthSyncService.SyncProfile(ctx, action)`

## L1 L2 L3 Decisions For Slice 1 Models

1. o2ul_user_profiles:
   - L1 + L2 + L3
   - Reason: account durability + frequent reads
2. o2ul_admin_roles:
   - L1 + L2 + L3
   - Reason: authorization-critical state
3. o2ul_preferences:
   - L1 + L2 + L3
   - Reason: durable system config with moderate reads
4. o2ul_cache_runtime:
   - L1 + L2 (optional L3 snapshot later)
   - Reason: derived ephemeral metrics

## Required Package Blueprint (dry run)

1. internal/domain/o2ul_users/
2. internal/domain/o2ul_preferences/
3. internal/domain/o2ul_authsync/
4. internal/application/o2ul_users_interfaces.go
5. internal/application/o2ul_users_service.go
6. internal/application/o2ul_preferences_interfaces.go
7. internal/application/o2ul_preferences_service.go
8. internal/application/o2ul_authsync_interfaces.go
9. internal/application/o2ul_authsync_service.go
10. internal/infrastructure/db/o2ul_users_strata.go
11. internal/infrastructure/db/o2ul_preferences_strata.go
12. internal/infrastructure/http/handlers/o2ul_users_handler.go
13. internal/infrastructure/http/handlers/o2ul_preferences_handler.go
14. internal/infrastructure/http/handlers/o2ul_authsync_handler.go

## Dry Run Cutover Plan

1. Implement Slice 1 routes behind feature toggle.
2. Shadow read: compare Convex vs new API payloads for selected endpoints.
3. Switch read traffic for users and preferences.
4. Switch write traffic for profile updates.
5. Keep rollback toggle to Convex path until parity signoff.

## Conclusion

The skill is working as intended for this real target project.

- It produced schema awareness.
- It produced per-model layer decisions.
- It produced API parity mapping.
- It preserved architecture constraints.
- It provided staged migration sequencing without performing migration.
