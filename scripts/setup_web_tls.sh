#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
ENV_EXAMPLE_FILE="$ROOT_DIR/.env.example"

CERT_FILE_DEFAULT="./tmp/tls/web-local-cert.pem"
KEY_FILE_DEFAULT="./tmp/tls/web-local-key.pem"
CERT_FILE_ENV="${WEB_TLS_CERT_FILE_PATH:-$CERT_FILE_DEFAULT}"
KEY_FILE_ENV="${WEB_TLS_KEY_FILE_PATH:-$KEY_FILE_DEFAULT}"

if [[ "$CERT_FILE_ENV" = /* ]]; then
  CERT_FILE_ABS="$CERT_FILE_ENV"
else
  CERT_FILE_ABS="$ROOT_DIR/$CERT_FILE_ENV"
fi
if [[ "$KEY_FILE_ENV" = /* ]]; then
  KEY_FILE_ABS="$KEY_FILE_ENV"
else
  KEY_FILE_ABS="$ROOT_DIR/$KEY_FILE_ENV"
fi

CERT_DIR="$(dirname "$CERT_FILE_ABS")"
mkdir -p "$CERT_DIR"

if command -v mkcert >/dev/null 2>&1; then
  echo "[setup-web-tls] using mkcert"
  mkcert -cert-file "$CERT_FILE_ABS" -key-file "$KEY_FILE_ABS" localhost 127.0.0.1 ::1
  echo "[setup-web-tls] tip: if this is your first mkcert use, run 'mkcert -install' to trust the local CA"
elif command -v openssl >/dev/null 2>&1; then
  echo "[setup-web-tls] using openssl self-signed cert"
  tmp_cfg="$(mktemp)"
  cat > "$tmp_cfg" <<'EOF'
[req]
distinguished_name = dn
x509_extensions = v3_req
prompt = no

[dn]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "$KEY_FILE_ABS" \
    -out "$CERT_FILE_ABS" \
    -config "$tmp_cfg" \
    -extensions v3_req >/dev/null 2>&1
  rm -f "$tmp_cfg"
else
  echo "[setup-web-tls] error: neither mkcert nor openssl was found"
  echo "[setup-web-tls] install one of them, then run make setup-web-tls again"
  exit 1
fi

upsert_env() {
  local key="$1"
  local value="$2"
  local escaped
  escaped="${value//&/\\&}"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$ENV_FILE"
  else
    printf "\n%s=%s\n" "$key" "$value" >> "$ENV_FILE"
  fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ENV_EXAMPLE_FILE" ]]; then
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    echo "[setup-web-tls] created $ENV_FILE from .env.example"
  else
    : > "$ENV_FILE"
    echo "[setup-web-tls] created empty $ENV_FILE"
  fi
fi

upsert_env "WEB_ENABLE_HTTP3" "true"
upsert_env "WEB_TLS_CERT_FILE" "$CERT_FILE_ENV"
upsert_env "WEB_TLS_KEY_FILE" "$KEY_FILE_ENV"

echo "[setup-web-tls] wrote cert: $CERT_FILE_ABS"
echo "[setup-web-tls] wrote key:  $KEY_FILE_ABS"
echo "[setup-web-tls] updated $ENV_FILE"
echo "[setup-web-tls] next: run make dev-orchestrator"
