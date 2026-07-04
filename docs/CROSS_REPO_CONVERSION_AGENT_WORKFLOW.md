# Cross Repo Conversion Agent Workflow

Use this process when you open a source NextJS project and want the coding agent to use this backend template as the conversion target and playbook.

## Operator Flow

1. Open source project in VS Code.
2. Create a conversion branch in source project.
3. In your prompt, provide:
   - source project path
   - backend template path
   - parity checklist path
4. Request dry run first, then phased implementation.

## Recommended Prompt Skeleton

Use this structure with the coding agent:

1. Use the dedicated NextJS conversion skill from this repository.
2. Source project is at /path/to/source.
3. Target backend template is at /path/to/com.nlaak.backend-template.
4. Use parity checklist JSON at docs/O2UL_PORTAL_PARITY_CHECKLIST.slice1.json.
5. Do not do full migration in one shot.
6. Produce phases and execute phase 1 only, then stop for review.

## Mandatory Constraints For Agent Execution

1. Keep domain to application to infrastructure layering.
2. Keep handlers thin.
3. Use Strata persistence only.
4. Use additive migrations only.
5. Keep converted modules in separate packages and interfaces.
6. Validate each phase with tests before continuing.

## Phase Execution Contract

For each phase, the agent must:

1. print phase objective
2. print files to create or update
3. implement only phase scope
4. run test validation
5. print completion and next phase proposal
6. wait for confirmation to continue

## Artifacts To Keep Updated During Execution

1. conversion matrix doc
2. parity checklist JSON
3. implementation phases doc
4. rollback notes for converted slice

## Suggested First Conversion Scope

1. users viewer/get/current/list
2. users init and profile updates
3. preferences get/update endpoints
4. auth sync profile endpoint
