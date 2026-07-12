# Production Runbook

## Scope

This runbook covers production deploy, validation, incident response, and rollback for this repository.

## Preconditions

1. `production` branch is green in GitHub Actions.
2. Required Actions secrets are configured:
   - `DEPLOY_HOST`
   - `DEPLOY_USER`
   - `DEPLOY_SSH_KEY`
   - `DEPLOY_SSH_KNOWN_HOSTS`
3. Production env file on VPS has required runtime values (`JWT_SECRET`, SMTP, DB, payment provider keys).
4. Systemd services exist on VPS:
   - `backend-template-api.service`
   - `backend-template-web.service`
   - `backend-template-orchestrator.service`

## Deployment Procedure

1. Merge approved change into `production` branch (or run workflow manually).
2. Observe `.github/workflows/deploy.yml` completion.
3. Confirm deploy steps completed:
   - secrets scan gate passed
   - lint/security/test/frontend-build gates passed
   - SSH host key verification succeeded
   - API/WEB binaries rebuilt
   - service restarts succeeded
4. Verify post-deploy smoke suite passed:
   - `GET /health` on API returns `200`
   - `GET /healthz` on WEB returns `200`
   - `GET /api/v1/auth/me` without token returns `401`/`403`
   - `GET /api/v1/admin/users` without token returns `401`/`403`

## O2UL Wallet Light-Client Startup Profiles

Use these settings in orchestrator-managed startup env (`.env`, systemd EnvironmentFile, or deployment secret material) to control the wallet header source profile.

| Environment | `O2UL_WALLET_HEADER_FIXTURE_PROFILE` | `O2UL_WALLET_LIGHTCLIENT_RPC_URL` | Notes |
|---|---|---|---|
| Local development (deterministic) | `ethapi-core` | empty | Uses embedded fixture vectors only. |
| Local HTTP/3 JSON-RPC fixture simulation | `ethapi-http3-fixture` | empty | Exercises JSON-RPC request/response path without external RPC dependency. |
| Staging HTTP/3 | `ethapi-http3-rpc` | `https://staging-rpc.example.invalid` | Startup fails fast if URL is missing or non-HTTPS. |
| Production HTTP/3 (pinned endpoint) | `ethapi-http3-rpc` | `https://rpc.provider.example/o2ul-mainnet` | Recommended profile for live deployment. HTTP/3 client enforces HTTPS + TLS1.3 minimum. |

### Production Pinning Example

```dotenv
O2UL_WALLET_HEADER_FIXTURE_PROFILE=ethapi-http3-rpc
O2UL_WALLET_LIGHTCLIENT_RPC_URL=https://rpc.provider.example/o2ul-mainnet
```

### Staging Pinning Example

```dotenv
O2UL_WALLET_HEADER_FIXTURE_PROFILE=ethapi-http3-rpc
O2UL_WALLET_LIGHTCLIENT_RPC_URL=https://staging-rpc.example.invalid
```

### Guardrails

1. Never use `http://` for `O2UL_WALLET_LIGHTCLIENT_RPC_URL`; startup rejects non-HTTPS for HTTP/3 profile.
2. Keep production explicitly pinned to `ethapi-http3-rpc`; avoid fixture profiles in production.
3. Validate effective startup profile from API logs (`o2ul wallet light-client profile=...`) after deploy.

## Post-Deploy Validation

1. Auth smoke:
   - register a user
   - login with new user
   - request forgot-password
   - reset password with issued token
2. RBAC smoke:
   - fetch `/api/v1/admin/users` with admin token
3. Payments smoke:
   - start checkout session for enabled provider
4. Orchestrator smoke:
   - list instances and ingest/list logs endpoints

## Incident Response

1. Capture service status and logs:
   - `systemctl status backend-template-api`
   - `systemctl status backend-template-web`
   - `systemctl status backend-template-orchestrator`
   - `journalctl -u backend-template-api -n 200`
   - `journalctl -u backend-template-web -n 200`
2. Determine blast radius:
   - auth only
   - payments only
   - full API/WEB outage
3. If severe user impact, execute rollback checklist immediately.

## Rollback Checklist

1. Identify last known good git ref (`<GOOD_REF>`).
2. Run deploy workflow manually with input:
   - `deploy_ref=<GOOD_REF>`
3. Confirm service restart and health checks pass.
4. Confirm rollback verification passed:
   - API health returns `200`
   - WEB health returns `200`
   - unauthenticated auth/admin endpoint checks return `401`/`403`
5. Re-run post-deploy validation checks.
6. Open incident follow-up with root cause and permanent fix plan.

## Rollback Drill Cadence

1. Perform one rollback drill per month per production target (Sombrero and Andromeda).
2. Drill steps:
   - deploy a known safe ref
   - trigger a controlled failing deploy
   - verify automatic rollback restored the previous known-good ref
3. Record drill evidence:
   - workflow run URL
   - restored commit SHA
   - smoke verification results

## Secrets Rotation Checklist

1. Rotate leaked/expired secrets in provider dashboards.
2. Update VPS runtime env.
3. Update GitHub Actions secrets.
4. Re-run deploy workflow.
5. Verify auth/payment/SMTP flows after rotation.
