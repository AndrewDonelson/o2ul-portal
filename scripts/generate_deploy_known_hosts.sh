#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if ! command -v ssh-keyscan >/dev/null 2>&1; then
  echo "ssh-keyscan is required" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DEPLOY_HOST="${DEPLOY_HOST:-}"
ANDROMEDA_HOST="${ANDROMEDA_HOST:-}"

hosts=()
if [[ -n "$DEPLOY_HOST" ]]; then
  hosts+=("$DEPLOY_HOST")
fi
if [[ -n "$ANDROMEDA_HOST" ]]; then
  hosts+=("$ANDROMEDA_HOST")
fi

if [[ ${#hosts[@]} -eq 0 ]]; then
  echo "Both DEPLOY_HOST and ANDROMEDA_HOST are empty in $ENV_FILE" >&2
  exit 1
fi

known_hosts_value=""
for host in "${hosts[@]}"; do
  scan_output="$(ssh-keyscan -H -t ed25519 "$host" 2>/dev/null | head -n1 || true)"
  if [[ -z "$scan_output" ]]; then
    scan_output="$(ssh-keyscan -H "$host" 2>/dev/null | head -n1 || true)"
  fi
  if [[ -z "$scan_output" ]]; then
    echo "Failed to fetch host key for $host" >&2
    exit 1
  fi

  if [[ -n "$known_hosts_value" ]]; then
    known_hosts_value+=$'\n'
  fi
  known_hosts_value+="$scan_output"
done

escaped="${known_hosts_value//\'/\'\"\'\"\'}"
new_line="DEPLOY_SSH_KNOWN_HOSTS='$escaped'"

tmp_file="$(mktemp)"
awk -v new_line="$new_line" '
BEGIN { updated = 0 }
/^DEPLOY_SSH_KNOWN_HOSTS=/ {
  print new_line
  updated = 1
  next
}
{ print }
END {
  if (updated == 0) {
    print new_line
  }
}
' "$ENV_FILE" > "$tmp_file"
mv "$tmp_file" "$ENV_FILE"

echo "Updated DEPLOY_SSH_KNOWN_HOSTS in $ENV_FILE for ${hosts[*]}"
