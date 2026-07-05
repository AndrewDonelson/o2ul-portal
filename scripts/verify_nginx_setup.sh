#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

extract_port() {
  local addr="$1"
  local trimmed="${addr// /}"
  local port="${trimmed##*:}"
  if [[ "$port" =~ ^[0-9]+$ ]]; then
    echo "$port"
  else
    echo ""
  fi
}

API_PORT="$(extract_port "${APP_ADDR:-}")"
WEB_PORT="$(extract_port "${WEB_ADDR:-}")"
ORCH_PORT="$(extract_port "${ORCHESTRATOR_ADDR:-}")"
NGINX_LISTEN_PORT="${NGINX_LISTEN_PORT:-80}"
PROJECT_SLUG="${NGINX_PROJECT_SLUG:-com-nlaak-backend-template}"
NGINX_CONF_NAME="${NGINX_CONF_NAME:-$PROJECT_SLUG.conf}"

AVAILABLE_PATH="/etc/nginx/sites-available/$NGINX_CONF_NAME"
ENABLED_PATH="/etc/nginx/sites-enabled/$NGINX_CONF_NAME"

read_file_if_possible() {
  local path="$1"
  if [[ -r "$path" ]]; then
    cat "$path"
    return 0
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo cat "$path"
    return 0
  fi
  return 1
}

print_port_ownership() {
  local label="$1"
  local port="$2"

  if [[ -z "$port" ]]; then
    echo "- $label: not configured"
    return
  fi

  echo "- $label:$port"
  if command -v ss >/dev/null 2>&1; then
    if ss -ltnp "( sport = :$port )" | tail -n +2 | grep -q .; then
      ss -ltnp "( sport = :$port )" | tail -n +2 || true
    else
      echo "  not listening"
    fi
  else
    echo "  ss command not available"
  fi
}

echo "== NGINX Verification =="
echo "env: $ENV_FILE"
echo "config name: $NGINX_CONF_NAME"

echo
echo "== Config Presence =="
if [[ -f "$AVAILABLE_PATH" ]]; then
  echo "- sites-available: present ($AVAILABLE_PATH)"
else
  echo "- sites-available: missing ($AVAILABLE_PATH)"
fi

if [[ -L "$ENABLED_PATH" || -f "$ENABLED_PATH" ]]; then
  echo "- sites-enabled: present ($ENABLED_PATH)"
  if [[ -L "$ENABLED_PATH" ]]; then
    echo "  symlink target: $(readlink "$ENABLED_PATH")"
  fi
else
  echo "- sites-enabled: missing ($ENABLED_PATH)"
fi

echo
echo "== NGINX Config Snippet =="
if [[ -f "$AVAILABLE_PATH" ]]; then
  if read_file_if_possible "$AVAILABLE_PATH" >/tmp/nginx_verify_conf.$$ 2>/dev/null; then
    grep -E "listen |server_name|location /api/|location /orchestrator/|proxy_pass" /tmp/nginx_verify_conf.$$ || true
    rm -f /tmp/nginx_verify_conf.$$
  else
    echo "Unable to read $AVAILABLE_PATH (need permissions)"
  fi
else
  echo "No config file to inspect"
fi

echo
echo "== Port Ownership =="
print_port_ownership "nginx-listen" "$NGINX_LISTEN_PORT"
print_port_ownership "api" "$API_PORT"
print_port_ownership "web" "$WEB_PORT"
print_port_ownership "orchestrator" "$ORCH_PORT"
