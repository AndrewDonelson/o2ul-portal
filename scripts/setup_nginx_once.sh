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

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

extract_port() {
  local addr="$1"
  local trimmed="${addr// /}"
  local port="${trimmed##*:}"
  if [[ ! "$port" =~ ^[0-9]+$ ]]; then
    echo ""
    return
  fi
  echo "$port"
}

require_var APP_ADDR
require_var WEB_ADDR
require_var ORCHESTRATOR_ADDR

API_PORT="$(extract_port "$APP_ADDR")"
WEB_PORT="$(extract_port "$WEB_ADDR")"
ORCH_PORT="$(extract_port "$ORCHESTRATOR_ADDR")"

if [[ -z "$API_PORT" || -z "$WEB_PORT" || -z "$ORCH_PORT" ]]; then
  echo "Failed to parse one or more ports from APP_ADDR/WEB_ADDR/ORCHESTRATOR_ADDR" >&2
  exit 1
fi

if [[ "$API_PORT" == "$WEB_PORT" || "$API_PORT" == "$ORCH_PORT" || "$WEB_PORT" == "$ORCH_PORT" ]]; then
  echo "Port conflict detected inside project config. APP/WEB/ORCHESTRATOR ports must be unique." >&2
  exit 1
fi

if ! command -v ss >/dev/null 2>&1; then
  echo "ss command is required to detect active port conflicts" >&2
  exit 1
fi

for p in "$API_PORT" "$WEB_PORT" "$ORCH_PORT"; do
  if ss -ltn "( sport = :$p )" | tail -n +2 | grep -q .; then
    echo "Port $p is already in use. Resolve conflicts before running this setup." >&2
    exit 1
  fi
done

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is not installed on this host" >&2
  exit 1
fi

PROJECT_SLUG="${NGINX_PROJECT_SLUG:-com-nlaak-backend-template}"
NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-_}"
NGINX_LISTEN_PORT="${NGINX_LISTEN_PORT:-80}"
NGINX_CONF_NAME="${NGINX_CONF_NAME:-$PROJECT_SLUG.conf}"

AVAILABLE_PATH="/etc/nginx/sites-available/$NGINX_CONF_NAME"
ENABLED_PATH="/etc/nginx/sites-enabled/$NGINX_CONF_NAME"

if [[ -f "$AVAILABLE_PATH" || -L "$ENABLED_PATH" || -f "$ENABLED_PATH" ]]; then
  echo "Nginx config already exists ($NGINX_CONF_NAME). Skipping setup."
  exit 0
fi

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "Root privileges are required" >&2
    exit 1
  fi
}

TMP_CONF="$(mktemp)"
cat > "$TMP_CONF" <<EOF
server {
    listen ${NGINX_LISTEN_PORT};
    server_name ${NGINX_SERVER_NAME};

    client_max_body_size 10m;

    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:${API_PORT};
    }

    location /orchestrator/ {
        rewrite ^/orchestrator/?(.*)$ /\$1 break;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:${ORCH_PORT};
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:${WEB_PORT};
    }
}
EOF

as_root install -m 644 "$TMP_CONF" "$AVAILABLE_PATH"
rm -f "$TMP_CONF"
as_root ln -s "$AVAILABLE_PATH" "$ENABLED_PATH"
as_root nginx -t
as_root systemctl reload nginx

echo "Nginx config created and enabled: $NGINX_CONF_NAME"
