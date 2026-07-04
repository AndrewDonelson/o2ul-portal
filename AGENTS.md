# AGENTS.md - Generic Backend Template Instructions

This repository is a backend starter template for auth-enabled, role-based systems with optional process orchestration.

## Goals

- Keep business logic framework-light and testable.
- Keep domain/application/infrastructure boundaries clear.
- Favor interfaces at application boundaries.
- Use Strata as the only persistence abstraction in this repository.

## Architecture

- `cmd/api` - Primary API service
- `cmd/web` - Internal web server for static frontend assets
- `cmd/orchestrator` - Local process lifecycle and log sink service
- `internal/domain` - Core entities and pure business rules
- `internal/application` - Use cases and interfaces
- `internal/infrastructure` - HTTP, DB, logging, orchestration adapters
- `web` - Minimal admin panel for auth/users/server/logs

## Coding Rules

- No project-specific gameplay/domain logic in this template.
- Use RBAC roles from `internal/domain/user.go`.
- Use JWT for auth, bcrypt for password hashing.
- Keep handlers thin; move behavior to application services.
- Do not introduce direct `database/sql` persistence plumbing in app code; go through Strata datastore/repositories.
- Keep SQL migration files additive and versioned in `internal/infrastructure/db/migrations`.

## TDD

1. Add tests for new behavior first.
2. Implement minimal code to pass.
3. Run full test suite.

## Build and Run

- API: `go run ./cmd/api`
- WEB: `go run ./cmd/web`
- Orchestrator: `go run ./cmd/orchestrator`
- Tests: `make test`

## Production VPS Targets

- Sombrero is the primary production VPS (`DEPLOY_HOST`).
- Andromeda is the secondary production VPS (`ANDROMEDA_HOST`).
- Deploy workflow runs against one target per execution (`deploy_target=sombrero|andromeda`).
- Do not fan out to both hosts in the same workflow run for this repository.
- Keep `DEPLOY_SSH_KNOWN_HOSTS` populated with host keys for both hosts.

## Documentation Discipline

When behavior changes:

1. Update code
2. Update README and any docs
3. Keep AGENTS guidance aligned
