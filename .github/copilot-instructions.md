# Copilot Instructions - Backend Template

## Project Intent

This project is a reusable backend template. Keep solutions generic and production-oriented.

## Mandatory Constraints

- Preserve package layering: domain -> application -> infrastructure.
- Keep handler logic minimal and delegate to services.
- Use Strata (`github.com/AndrewDonelson/strata`) as the persistence abstraction.
- Keep SQL migrations additive and versioned for Strata `MigrateFrom`.
- Do not add game-specific or product-specific logic.
- Favor interfaces for external dependencies.

## Quality

- Prefer clear, small, composable functions.
- Avoid speculative abstractions.
- Add tests with edge cases for auth, RBAC, and orchestration lifecycle.
