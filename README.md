# O2UL Portal

The current project is a Go-first backend template with a lightweight TypeScript web console under `web/`.

Persistence in this repository is 100% Strata (`github.com/AndrewDonelson/strata`) using PostgreSQL as L3 and optional Redis as L2.

## What This Template Includes

- Common structured logging with optional forwarding to orchestrator
- Orchestrator lifecycle management via pluggable backends (systemd, docker, kubernetes, local-exec)
- Player account model (email, username, password hash, role)
- JWT authentication and RBAC middleware
- Versioned SQL migrations via Strata `MigrateFrom` (`internal/infrastructure/db/migrations`)
- Payment abstraction with Stripe + Steam providers
- TypeScript frontend scaffold in `web/index.html` + `web/modules/**` + `web/src/runtime/**`
- Frontend modules are colocated per feature (`web/modules/<name>/index.html|index.css|index.ts`)
- Subspace-style frontend packaging via `web/build.mjs` into `web/dist-app`
- TS7 native preview typechecking (`tsgo`) in frontend build scripts
- Clear package boundaries with interfaces for app/domain/infrastructure layers

## Repository Layout

- `cmd/api` - API service entrypoint
- `cmd/web` - internal WEB server for static frontend assets
- `cmd/orchestrator` - local lifecycle manager and log sink
- `cmd/migrate` - migration runner
- `internal/domain` - entities and core business rules
- `internal/application` - use cases and boundary interfaces
- `internal/infrastructure` - adapters (http, db, orchestrator, logging, payments)
- `web` - static TypeScript frontend modules and build pipeline
- `scripts` - deployment and ops helper scripts

## RBAC Roles

- `master_admin`
- `admin`
- `sysop`
- `moderator`
- `subscriber`
- `registered`
- `guest`

`master_admin` is bootstrap-only and should be configured with:

- `MASTER_ADMIN_USERNAME`
- `MASTER_ADMIN_EMAIL`
- `MASTER_ADMIN_PASSWORD`

Role behavior:

- Exactly one `master_admin` is enforced via startup reconciliation plus DB uniqueness.
- Public registration is `registered` only.
- `subscriber` is payment-gated and promoted from successful payment webhook processing.

## Quick Start

1. Copy env:

```bash
cp .env.example .env
```

2. Start full stack (orchestrator-managed API + WEB):

```bash
make dev-orchestrator
```

This builds frontend assets, then launches orchestrator, which starts API first and WEB after API health is ready.

Strata startup wiring is in `internal/infrastructure/db/strata_store.go`.

3. Optional: run orchestrator directly (managed startup still enabled):

```bash
go run ./cmd/orchestrator
```

Configure backend mode with `ORCHESTRATOR_BACKEND=systemd|docker|kubernetes|local`.

If you want fully manual process control, disable managed startup first:

```bash
MANAGED_STARTUP_ENABLED=false go run ./cmd/orchestrator
```

Then run API/WEB yourself (`make run-api`, `make run-web`) in separate terminals.

Open `http://localhost:8081`.

Frontend build output is written to `web/dist-app` and is served by the internal WEB server (`cmd/web`).

## Environment Variables

Canonical local configuration lives in `.env` and template values live in `.env.example`.

Key groups:

- Core runtime: `APP_ENV`, `APP_ADDR`, `WEB_ADDR`, `WEB_ROOT_DIR`, `WEB_ENABLE_HTTP3`
- Email delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`
- Orchestrator control: `ORCHESTRATOR_ADDR`, `ORCHESTRATOR_BACKEND`, `ORCHESTRATOR_CONTROL_TOKEN`, `ORCHESTRATOR_LOG_URL`
- Managed lifecycle: `MANAGED_STARTUP_*`, `MANAGED_API_*`, `MANAGED_WEB_*`, `MANAGED_*_SHUTDOWN_URL`
- Persistence/auth: `POSTGRES_DSN`, `REDIS_ADDR`, `JWT_SECRET`, `MASTER_ADMIN_*`
- Payments: `STRIPE_*`, `STEAM_*`
- CI deploy secrets source values: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_SSH_KNOWN_HOSTS`
- Optional NGINX setup controls: `NGINX_PROJECT_SLUG`, `NGINX_SERVER_NAME`, `NGINX_LISTEN_PORT`, `NGINX_CONF_NAME`

Payment credential behavior:

- Stripe server-side integration uses `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- Steam checkout requires `STEAM_APP_ID` plus at least one of:
	- `STEAM_PUBLISHER_KEY`
	- `STEAM_WEB_API_KEY`
- If Steam account credentials are provided, both must be present:
	- `STEAM_USERNAME`
	- `STEAM_LOGIN_PWD`

Auth email behavior:

- Registration and forgot-password flows require SMTP configuration.
- Required vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`.

## GitHub Actions CI/CD (VPS)

This repo now includes baseline workflows adapted from the Subspace Bounty Hunters pipeline:

- `.github/workflows/test.yml` runs on push/PR and executes:
	- Secrets scan gate (`gitleaks`)
	- Lint gates (`go vet`, `staticcheck`)
	- Security gate (`govulncheck`)
	- Go tests (`make test`) with Postgres + Redis services
	- Frontend build (`make frontend-build`)
- `.github/workflows/deploy.yml` runs on `production` pushes (or manually) and:
	- Re-runs lint and security gates
	- Runs secrets scan gate (`gitleaks`)
	- Re-runs tests and frontend build as deploy gates
	- SSH deploys to your VPS
	- Builds frontend assets for the internal WEB server
	- Builds API/WEB/orchestrator binaries
	- Uses strict SSH host-key verification
	- Attempts automatic rollback on remote deploy failure
	- Restarts systemd services and runs health checks

Required repository secrets:

- `DEPLOY_HOST` (Sombrero primary VPS host or IP)
- `ANDROMEDA_HOST` (Andromeda secondary VPS host or IP)
- `DEPLOY_USER` (SSH user)
- `DEPLOY_SSH_KEY` (private key PEM)
- `DEPLOY_SSH_KNOWN_HOSTS` (known_hosts line(s) for VPS host key pinning)

You can sync these from local `.env` with:

```bash
make generate-deploy-known-hosts
make sync-deploy-secrets
```

`make sync-deploy-secrets` requires authenticated GitHub CLI (`gh auth login`).

`make generate-deploy-known-hosts` uses `ssh-keyscan` and updates `DEPLOY_SSH_KNOWN_HOSTS` in `.env`.

Deployment target behavior:

- Deploys run against a single target per execution.
- Default target is Sombrero (primary).
- Manual runs can select `deploy_target=sombrero` or `deploy_target=andromeda`.

Optional repository variables (Settings -> Secrets and variables -> Actions -> Variables):

- `API_SERVICE_NAME` (default: `backend-template-api`)
- `WEB_SERVICE_NAME` (default: `backend-template-web`)
- `ORCHESTRATOR_SERVICE_NAME` (default: `backend-template-orchestrator`)
- `API_HEALTH_URL` (default: `http://127.0.0.1:8080/health`)
- `WEB_HEALTH_URL` (default: `http://127.0.0.1:8081/healthz`)

Manual deploy options via Actions UI (`workflow_dispatch`):

- `deploy_ref` (branch/tag/SHA, default `production`)
- `deploy_target` (`sombrero` or `andromeda`, default `sombrero`)
- `deploy_repo_path` (absolute path override on VPS)
- `restart_orchestrator` (`true`/`false`)

Operational runbook and rollback steps are documented in `docs/PRODUCTION_RUNBOOK.md`.

## One-Time NGINX Setup (Server)

Run this once on the VPS from the repository root:

```bash
make setup-nginx-once
```

What it does:

- Loads `.env` values for `APP_ADDR`, `WEB_ADDR`, and `ORCHESTRATOR_ADDR`
- Verifies API/WEB/orchestrator ports are unique
- Verifies those ports are not already in use
- Creates nginx site config only when it does not already exist
- Enables the site, validates config (`nginx -t`), and reloads nginx

Verify routing and live port ownership after setup:

```bash
make verify-nginx-setup
```

This prints:

- Presence and linkage of your nginx site config
- Key nginx routing lines (`listen`, `location`, `proxy_pass`)
- Active listeners for nginx/API/WEB/orchestrator ports

Defaults and overrides:

- Default config name: `com-nlaak-backend-template.conf`
- Default server name: `_`
- Default listen port: `80`
- Override with optional env vars:
	- `NGINX_PROJECT_SLUG`
	- `NGINX_SERVER_NAME`
	- `NGINX_LISTEN_PORT`
	- `NGINX_CONF_NAME`

## API Endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh` (authenticated)
- `POST /api/v1/auth/renew` (authenticated alias)

### Users/Admin

- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{id}/role`
- `GET /api/v1/admin/strata/status`

### User Preferences (auth required)

- `GET /api/v1/settings`
- `PUT /api/v1/settings`
- `GET /api/v1/notifications/preferences`
- `PUT /api/v1/notifications/preferences`

### Orchestrator

- `POST /api/v1/instances/spawn`
- `POST /api/v1/instances/{id}/despawn`
- `GET /api/v1/instances`
- `POST /api/v1/logs/ingest`

### Payments

- `POST /api/v1/payments/checkout` (auth required)
- `POST /api/v1/payments/webhook/{provider}`

## Notes

- This repo is intentionally framework-light and easy to extend.
- Orchestrator backend adapters are selected by configuration and can be swapped without changing handlers.
- Down migrations are intentionally disabled in Strata-only mode; use forward/additive migrations.
- No game/plot/Three.js client runtime is included; frontend is template-only and server-focused.
