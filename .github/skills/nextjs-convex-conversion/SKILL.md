---
name: nextjs-convex-conversion
description: |
  Convert existing NextJS plus Convex applications onto this backend template with staged migration, schema translation, and API parity. Builds Strata L1/L2/L3 models, generates thin HTTP handlers, and creates application and infrastructure packages with interfaces.

  Use when: migrating Convex schema and functions, mapping mutations and queries to REST endpoints, deciding Strata cache layers, or replacing Convex realtime and auth flows safely.
---

# NextJS Convex Conversion

Status: Production Ready
Scope: Migration workflow skill for converting a NextJS plus Convex project into this backend template.

## Outcomes

Use this skill to produce all of the following:

1. Schema conversion plan from Convex data model into domain entities and Strata records.
2. Layer selection decision for each model across L1 memory, L2 Redis, and L3 Postgres.
3. API parity map from Convex functions to HTTP routes.
4. New packages and interfaces that preserve repository architecture:
   - domain
   - application
   - infrastructure
5. Staged cutover plan with rollback points.

## Hard Rules

1. Preserve package layering: domain to application to infrastructure.
2. Keep handlers thin. Put behavior in application services.
3. Keep persistence through Strata only.
4. Use additive SQL migrations only.
5. New conversion code must be in separate packages with interfaces, not mixed into existing handlers directly.

## Package Pattern For Converted Areas

For each converted Convex area, create a dedicated package namespace:

1. Domain:
   - internal/domain/<area>/
   - entities and pure rules only

2. Application:
   - internal/application/<area>_service.go
   - internal/application/<area>_interfaces.go
   - use case orchestration and interface contracts only

3. Infrastructure:
   - internal/infrastructure/db/<area>_strata.go
   - internal/infrastructure/http/handlers/<area>_handler.go
   - optional provider adapters under internal/infrastructure/<provider>/

4. API routing:
   - wire new handlers in internal/infrastructure/http/router.go

## Convex To Template Mapping

### Convex Schema To Domain And Strata

For each Convex table:

1. Create domain entity with explicit IDs, timestamps, role ownership, and validation.
2. Create Strata record model with indexes and uniqueness constraints.
3. Create migration file in internal/infrastructure/db/migrations.
4. Register schema in Strata registration path.

### Convex Functions To HTTP

Map functions as follows:

1. query to GET
2. mutation to POST, PATCH, PUT, DELETE as appropriate
3. action to POST with idempotency and timeout boundaries

For every function conversion:

1. Preserve response shape compatibility when possible.
2. Preserve auth and authorization semantics.
3. Add tests for happy path, invalid input, unauthorized, and not found.

## Strata L1 L2 L3 Decision Matrix

Choose storage and caching policy per model:

1. L1 only for ultra hot ephemeral metadata where stale reads are acceptable and data can be rebuilt.
2. L1 plus L2 for high read traffic with moderate consistency tolerance.
3. L1 plus L2 plus L3 for authoritative business entities and anything requiring durability.
4. L3 required for financial, auth, RBAC, or audit related entities.

Decision inputs per model:

1. Read frequency.
2. Write frequency.
3. Staleness tolerance.
4. Durability requirement.
5. Security and compliance sensitivity.
6. Recovery objective.

Output required in migration docs:

1. Selected layers.
2. Reasoning.
3. TTL values.
4. Index strategy.

## Realtime Replacement Guidance

If Convex subscriptions are used:

1. Prefer explicit polling first for migration safety.
2. Add SSE or websocket only for proven hotspots.
3. Define event payload contracts in application layer, transport in infrastructure layer.

## Required Deliverables Per Conversion Batch

1. Conversion map document:
   - convex table and function
   - new domain type
   - new service method
   - new route
   - migration file
2. New package interfaces.
3. Tests for application and HTTP layers.
4. Rollout plan with feature flags or route toggles.
5. Rollback instructions.

## Suggested Execution Sequence

1. Baseline inventory:
   - list Convex tables, indexes, functions, auth paths
2. Model conversion:
   - domain plus Strata schema plus migration
3. Service conversion:
   - application contracts and implementations
4. Endpoint conversion:
   - thin handlers and router wiring
5. Frontend switch:
   - replace Convex client calls per feature slice
6. Staged deploy:
   - shadow, partial traffic, then full cutover

## Validation Checklist

1. All converted endpoints covered by tests.
2. No direct database plumbing outside Strata repositories.
3. Handlers contain no business orchestration.
4. Migrations are additive and ordered.
5. Auth and RBAC behavior matches previous system.
6. Performance baseline captured with benchmarks for migrated hotspots.
