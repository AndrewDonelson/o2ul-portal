#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_HASH="0x408d53e79c343e437c216d3e4daffa09f2ffa998dea00f2e3fa78e392fbbfdb6"
FIXTURE_ROOT_DEFAULT="$(cd "$ROOT_DIR/.." && pwd)/o2ul-blockchain/tests/spec-tests/fixtures"
FIXTURE_ROOT="${CANONICAL_FIXTURE_ROOT:-$FIXTURE_ROOT_DEFAULT}"
OUT_FILE="${CANONICAL_HEADER21_REPORT_OUT:-$ROOT_DIR/docs/CANONICAL_HEADER21_DISCOVERY_LATEST.md}"
TS_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

mkdir -p "$(dirname "$OUT_FILE")"

if [[ ! -d "$FIXTURE_ROOT" ]]; then
  cat > "$OUT_FILE" <<EOF
# Canonical Header 21 Discovery Report

- Timestamp (UTC): $TS_UTC
- Fixture root: $FIXTURE_ROOT
- Parent hash target: $PARENT_HASH
- Result: fixture root missing

The configured fixture root does not exist. Set CANONICAL_FIXTURE_ROOT to a valid path and rerun.
EOF
  echo "check-canonical-header21: fixture root does not exist: $FIXTURE_ROOT" >&2
  exit 2
fi

MATCHES="$(rg -n '"parentHash"\s*:\s*"'"$PARENT_HASH"'"' "$FIXTURE_ROOT" || true)"

if [[ -z "$MATCHES" ]]; then
  cat > "$OUT_FILE" <<EOF
# Canonical Header 21 Discovery Report

- Timestamp (UTC): $TS_UTC
- Fixture root: $FIXTURE_ROOT
- Parent hash target: $PARENT_HASH
- Result: not found

No canonical fixture currently contains a header whose parentHash equals the promoted header20 hash.

Recommended next step:
1. Update upstream fixture corpus.
2. Re-run: make check-canonical-header21
3. If found, replace synthetic header21 fixture in portal testdata and re-run make test.
EOF
  echo "check-canonical-header21: no canonical parent-linked header21 found" >&2
  exit 1
fi

cat > "$OUT_FILE" <<EOF
# Canonical Header 21 Discovery Report

- Timestamp (UTC): $TS_UTC
- Fixture root: $FIXTURE_ROOT
- Parent hash target: $PARENT_HASH
- Result: found candidate(s)

## Matches

\`\`\`
$MATCHES
\`\`\`

Next action:
1. Extract canonical header21 payload from the matched fixture(s).
2. Replace synthetic portal fixtures for header21.
3. Re-run: make test
EOF

echo "check-canonical-header21: found canonical candidate(s)"
echo "check-canonical-header21: report written to $OUT_FILE"
