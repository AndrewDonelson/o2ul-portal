# Canonical Header 21 Replacement Runbook

Purpose: replace the synthetic portal header-21 fixtures with canonical upstream fixture data once a parent-linked candidate is available.

## Preconditions

- Local workspace contains both repositories:
  - o2ul-portal
  - o2ul-blockchain
- Promoted header20 hash remains:
  - 0x408d53e79c343e437c216d3e4daffa09f2ffa998dea00f2e3fa78e392fbbfdb6

## Discovery

Run:

```bash
cd o2ul-portal
make check-canonical-header21
```

- If command exits non-zero with not found, canonical replacement is still blocked.
- Latest discovery artifact is written to:
  - docs/CANONICAL_HEADER21_DISCOVERY_LATEST.md

## Replacement Steps

1. Extract canonical header21 payload from matched blockchain fixture(s).
2. Update portal fixture files:
   - internal/application/testdata/o2ul_blockchain_ethapi_headers_extended.json
   - internal/application/testdata/o2ul_blockchain_ethapi_jsonrpc_header_number_21.json
3. Ensure linkage remains contiguous:
   - header21.parentHash == header20.blockHash
4. Keep HTTP/3 fixture router mapping for tag 0x15 in:
   - internal/application/o2ul_wallet_lightclient_rpc.go
5. Re-run canonical portal tests:

```bash
cd o2ul-portal
make test
```

## Validation Expectations

- Contiguous parity tests remain green for 20..21.
- Unsupported single-header boundary remains at 22..22 unless further canonical promotion is introduced.

## Post-Update Tracking

- Update canonical tracker:
  - o2ul-proprietary/docs/program-plan/SESSION.md
- Update root synced status:
  - /SESSION.md
  - /IMPLEMENTATION_PHASES.md
