# O2UL Portal Conversion Baseline

This document captures the first concrete conversion baseline from the target NextJS plus Convex project into this backend template.

## Inventory Summary

Detected Convex model/function areas:

1. auth and profile sync
2. users queries and mutations
3. admin user and role management
4. preferences management
5. presence and CCU metrics
6. health and telemetry
7. file upload and metadata
8. notifications and queue processing
9. cache table and derived metrics

Detected function types:

1. query
2. mutation
3. action
4. internalMutation
5. httpAction (via Convex HTTP surface)

## Proposed Conversion Slices

### Slice 1 (first cut)

1. auth user profile read and update
2. basic users viewer/get/list endpoints
3. preferences get/update

Reason:

1. establishes identity and session-aligned data first
2. unlocks most frontend pages
3. minimizes initial infrastructure complexity

### Slice 2

1. admin role and user management
2. files metadata plus upload flow adaptation

### Slice 3

1. presence and health metrics
2. notifications pipeline
3. internal queue-like actions currently in Convex actions/internal mutations

## Strata Layer Recommendations (initial)

1. user profiles: L1 plus L2 plus L3
   - durable user account state
   - high read volume
2. admins and role assignments: L1 plus L2 plus L3
   - security sensitive
   - requires durability and strict consistency patterns
3. preferences: L1 plus L2 plus L3
   - durable and user-facing
4. files metadata: L1 plus L2 plus L3
   - durable metadata; actual blobs remain in object storage provider
5. push subscriptions: L1 plus L2 plus L3
   - durable endpoint registry
6. pending notifications: L1 plus L2 plus L3
   - queue-like durable work tracking
7. presence snapshots: L1 plus L2
   - hot ephemeral state, bounded staleness allowed
8. health and derived cache metrics: L1 plus L2 (optional L3 snapshot if needed)
   - ephemeral/derivable values

## API Parity Mapping Pattern

For each Convex function:

1. query to GET endpoint
2. mutation to POST, PATCH, PUT, or DELETE endpoint
3. action to POST endpoint with idempotency key support
4. internalMutation to internal application service method or background worker pathway

## Package Structure Pattern For O2UL

For each area, create separate packages and interfaces:

1. internal/domain/o2ul_<area>/
2. internal/application/o2ul_<area>_interfaces.go
3. internal/application/o2ul_<area>_service.go
4. internal/infrastructure/db/o2ul_<area>_strata.go
5. internal/infrastructure/http/handlers/o2ul_<area>_handler.go

Router wiring remains in existing API router with thin handlers only.

## First Migration Work Package

1. add domain model package for profiles and preferences
2. add Strata repositories and register schemas
3. add additive migrations for profiles and preferences
4. add application services plus interfaces
5. add handlers and routes for:
   - viewer/get/list users
   - profile update
   - preferences get/update
6. add e2e tests for auth-protected and role-protected paths

## Frontend Cutover Strategy (staged)

1. keep NextJS UI intact
2. replace Convex calls only for Slice 1 features
3. run feature-flag route toggle for old vs new backend
4. validate parity in staging before expanding slices

## Risks To Validate Early

1. auth identity claim shape parity between Convex and JWT claims used by this platform
2. realtime behavior currently backed by Convex subscriptions
3. background notification actions requiring queue semantics in new platform

## Immediate Next Step

Build a detailed function-by-function conversion matrix for Slice 1 from Convex function names to new HTTP routes and service methods.
