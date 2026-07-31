#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
REQUIRED_ENV_KEYS=(
  DATABASE_URL
  AUTH_SECRET
  NEXTAUTH_URL
  NEXT_PUBLIC_SITE_URL
  MYSQL_ROOT_PASSWORD
  MYSQL_PASSWORD
  HEALTHCHECK_TOKEN
)

# shellcheck source=scripts/ops/lib/schema-ops-lock.sh
source "$ROOT_DIR/scripts/ops/lib/schema-ops-lock.sh"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"

for key in "${REQUIRED_ENV_KEYS[@]}"; do
  if ! grep -Eq "^${key}=.+$" "$ENV_FILE"; then
    echo "Missing required env entry in $ENV_FILE: $key" >&2
    exit 1
  fi
done

if ! grep -Eq '^REDIS_URL=.+$' "$ENV_FILE"; then
  echo "REDIS_URL not set explicitly in $ENV_FILE. Falling back to docker internal default redis://redis:6379." >&2
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull mysql redis nginx
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile migration build migrate
acquire_schema_ops_lock "$ROOT_DIR" "production-deploy"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile migration run --rm migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans
docker image prune -f >/dev/null 2>&1 || true
